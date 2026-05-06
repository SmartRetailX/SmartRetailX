"""
Alert Generator - Production-Ready ML-Based Alert System

Architecture:
1. Query products from PostgreSQL database
2. Use trained forecast models (XGBoost/Prophet) to predict demand
3. Calculate stockout date based on predictions
4. Generate alerts if stock insufficient for forecasted demand

The models were trained on the expanded dataset (2022-2026, 4 regions,
10 products) where Units_Sold is aggregated across all regions per day.
The demand predictions are therefore region-aggregate figures and are
used directly for stockout calculations.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import os
from sqlalchemy import create_engine, text
from api.forecast_service import ForecastService
from dotenv import load_dotenv

load_dotenv()


class AlertGenerator:
    def __init__(self):
        self.forecast_service = ForecastService()
        self.db_url = os.getenv("DATABASE_URL")

        if self.db_url and "?schema=" in self.db_url:
            self.db_url = self.db_url.split("?schema=")[0]

        if self.db_url:
            self.engine = create_engine(
                self.db_url,
                pool_pre_ping=True,
                pool_recycle=3600,
                pool_size=5,
                max_overflow=10,
            )
        else:
            self.engine = None

    # ------------------------------------------------------------------
    # Public: analyse all products
    # ------------------------------------------------------------------
    async def analyze_all_products(self) -> List[Dict[str, Any]]:
        """
        Generate alerts using trained ML models.
        1. Pull products from PostgreSQL (sku used as product_id for model lookup)
        2. Run Prophet forecast per product
        3. Alert if stockout predicted within alert window
        """
        print("\n=== AI Alert Generation (Expanded Dataset Models) ===")

        if not self.engine:
            raise Exception("DATABASE_URL not configured. Set it in .env")

        # Products in stock or low-stock
        query = """
            SELECT p.id, p.sku, p.name, p.name_si AS "nameSi",
                   p.current_stock AS "currentStock",
                   p.reorder_level AS "reorderLevel",
                   p.price
            FROM bi_dashboard.products p
            WHERE p.status IN ('IN_STOCK', 'LOW_STOCK')
        """
        with self.engine.connect() as conn:
            products = [dict(r._mapping) for r in conn.execute(text(query))]

        print(f"[DATA] {len(products)} products found in database")
        if not products:
            print("[WARN] No products. Run: npm run prisma:seed")
            return []

        alerts = []
        for idx, product in enumerate(products):
            try:
                print(f"\n[{idx+1}/{len(products)}] {product['name']} (sku={product['sku']})")
                alert = await self._analyze_with_ml_forecast(product)
                if alert:
                    alerts.append(alert)
                    print(f"  [ALERT] {alert['urgency']} urgency")
                else:
                    print("  [OK] Stock adequate")
            except Exception as e:
                print(f"  [ERROR] {e}")
                continue

        print(f"\n[DONE] {len(alerts)} alerts generated")
        return alerts

    # ------------------------------------------------------------------
    # Public: analyse one product
    # ------------------------------------------------------------------
    async def analyze_product_alert(self, product_id: str) -> Dict[str, Any]:
        """Analyse a single product by DB UUID and return alert if needed."""
        if not self.engine:
            raise Exception("DATABASE_URL not configured")

        query = """
            SELECT p.id, p.sku, p.name, p.name_si AS "nameSi",
                   p.current_stock AS "currentStock",
                   p.reorder_level AS "reorderLevel",
                   p.price
            FROM bi_dashboard.products p
            WHERE p.id = :product_id
        """
        with self.engine.connect() as conn:
            row = conn.execute(text(query), {"product_id": product_id}).fetchone()
            if not row:
                return {"alertNeeded": False, "message": "Product not found"}
            product = dict(row._mapping)

        alert = await self._analyze_with_ml_forecast(product)
        if alert:
            return {"alertNeeded": True, "alert": alert}
        return {"alertNeeded": False, "message": "Stock adequate based on ML forecast"}

    # ------------------------------------------------------------------
    # Core ML-based analysis
    # ------------------------------------------------------------------
    async def _analyze_with_ml_forecast(self, product: dict) -> Optional[Dict[str, Any]]:
        """
        Run the forecast pipeline for one product and return an alert dict
        if restocking is needed, otherwise None.

        Key difference from old version:
        - Model files are keyed by SKU (not DB UUID) because train_model.py
          trains one model per Product_ID (= SKU) from the expanded dataset.
        - Metadata now carries product_name and category so we don't need
          to re-derive them from the database.
        """
        db_product_id = product["id"]
        sku           = product.get("sku", db_product_id)   # SKU matches Product_ID in dataset
        current_stock = product["currentStock"]
        reorder_level = product["reorderLevel"]

        try:
            print(f"  [ML] Running forecast for sku={sku}...")

            # ForecastService.predict looks up models by product_id = sku
            forecast_result = await self.forecast_service.predict(
                product_id=sku,
                horizon=14,
                lang="en",
            )

            forecast_data = forecast_result["forecasts"]

            # Cumulative demand over forecast window
            cumulative_demand = 0.0
            stockout_day: Optional[str] = None
            daily_demands: List[float] = []

            for day in forecast_data:
                predicted = float(day["predictedSales"])
                daily_demands.append(predicted)
                cumulative_demand += predicted
                if cumulative_demand >= current_stock and stockout_day is None:
                    stockout_day = day["date"]

            avg_daily_demand = (
                sum(daily_demands[:7]) / 7 if daily_demands else 0.0
            )

            print(f"  [DATA] avg demand={avg_daily_demand:.1f} u/day  "
                  f"stock={current_stock}  reorder={reorder_level}")

            if avg_daily_demand <= 0:
                print("  [OK] No demand predicted")
                return None

            days_until_stockout = current_stock / avg_daily_demand
            stockout_date = datetime.now() + timedelta(days=days_until_stockout)

            print(f"  [TIME] Stockout in ~{days_until_stockout:.1f} days")

            # Alert if below reorder level
            if current_stock >= reorder_level:
                print(f"  [OK] {current_stock} >= reorder {reorder_level} "
                      f"(~{days_until_stockout:.1f} days supply)")
                return None

            print(f"  [WARN] Below reorder level ({current_stock} < {reorder_level})")

            # Urgency
            stock_ratio = current_stock / reorder_level if reorder_level > 0 else 1.0
            if stock_ratio < 0.5 or days_until_stockout <= 3:
                urgency, confidence = "HIGH",   0.92
            elif stock_ratio < 0.8 or days_until_stockout <= 7:
                urgency, confidence = "MEDIUM", 0.85
            else:
                urgency, confidence = "LOW",    0.75

            # Recommended quantity — top up to 3× reorder level
            target_stock   = reorder_level * 3
            recommended_qty = max(reorder_level, target_stock - current_stock)

            # Use product_name from metadata when available (set by train_model.py)
            metadata     = self.forecast_service.load_model_metadata(sku)
            display_name = metadata.get("product_name") or product["name"]
            category     = metadata.get("category")

            status_en = "below"
            status_si = "අඩුයි"

            reason_en = (
                f"AI predicts stockout in {days_until_stockout:.1f} days "
                f"(demand: {avg_daily_demand:.1f} units/day). "
                f"Current stock ({current_stock}) is {status_en} reorder level ({reorder_level})."
            )
            reason_si = (
                f"AI දින {days_until_stockout:.1f} කින් තොග අවසන් වීම පුරෝකථනය කරයි "
                f"(ඉල්ලුම: දිනකට {avg_daily_demand:.1f} ඒකක). "
                f"වත්මන් තොගය ({current_stock}) නැවත ඇණවුම් මට්ටමට ({reorder_level}) {status_si}."
            )

            return {
                "productId":          db_product_id,
                "productSku":         sku,                 # exposed for UI / debug
                "productName":        display_name,
                "category":           category,
                "type":               "RESTOCK",
                "urgency":            urgency,
                "currentStock":       current_stock,
                "recommendedQuantity": recommended_qty,
                "reason":             reason_en,
                "reasonSi":           reason_si,
                "confidence":         confidence,
                "estimatedStockoutDate": stockout_date.strftime("%Y-%m-%d"),
                "metadata": {
                    "mlModel":               "XGBoost + Prophet (expanded dataset)",
                    "forecastedDailyDemand": round(avg_daily_demand, 2),
                    "daysUntilStockout":     round(days_until_stockout, 1),
                    "reorderPoint":          reorder_level,
                    "recommendedQuantity":   recommended_qty,
                    "stockDeficit":          max(0, reorder_level - current_stock),
                    "datasetCoverage":       "2022-01-01 to 2026-04-30 (4 regions aggregated)",
                },
            }

        except FileNotFoundError:
            print(f"  [WARN] No trained model for sku={sku}. "
                  f"Run: python train_model.py")
            return None
        except Exception as e:
            print(f"  [ERROR] {e}")
            return None