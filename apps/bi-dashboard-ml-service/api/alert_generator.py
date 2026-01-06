"""
Alert Generator - Production-Ready ML-Based Alert System

Architecture:
1. Query products from PostgreSQL database
2. Use trained forecast models (XGBoost/Prophet) to predict demand
3. Calculate stockout date based on predictions
4. Generate alerts if stock insufficient for forecasted demand

This shows end-to-end ML pipeline: Training → Inference → Business Decision
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any
import os
from sqlalchemy import create_engine, text
from api.forecast_service import ForecastService
from dotenv import load_dotenv

load_dotenv()


class AlertGenerator:
    def __init__(self):
        self.forecast_service = ForecastService()
        self.db_url = os.getenv("DATABASE_URL")
        
        # Remove schema parameter if present
        if self.db_url and "?schema=" in self.db_url:
            self.db_url = self.db_url.split("?schema=")[0]
        
        # Create engine with connection pooling and auto-reconnect
        if self.db_url:
            self.engine = create_engine(
                self.db_url,
                pool_pre_ping=True,  # Verify connections before using them
                pool_recycle=3600,   # Recycle connections after 1 hour
                pool_size=5,
                max_overflow=10
            )
        else:
            self.engine = None
        
    async def analyze_all_products(self, store_id: str = None) -> List[Dict[str, Any]]:
        """
        Generate alerts using trained ML models
        
        Process:
        1. Get all products from database
        2. For each product, run forecast model
        3. Calculate when stock runs out based on forecast
        4. Generate alert if stockout within 14 days
        """
        print(f"\n=== AI Alert Generation (Using Trained Models) ===")
        print(f"Store filter: {store_id if store_id else 'All stores'}")
        
        alerts = []
        
        try:
            if not self.engine:
                raise Exception("Database connection not configured. Set DATABASE_URL in .env")
            
            # Query products from PostgreSQL
            query = """
                SELECT p.id, p.store_id as "storeId", p.name, p.name_si as "nameSi",
                       p.current_stock as "currentStock", p.reorder_level as "reorderLevel", p.price
                FROM products p
                WHERE p.status IN ('IN_STOCK', 'LOW_STOCK')
            """
            
            if store_id:
                query += f' AND p.store_id = \'{store_id}\''
            
            with self.engine.connect() as conn:
                result = conn.execute(text(query))
                products = [dict(row._mapping) for row in result]
            
            print(f"[DATA] Found {len(products)} products in database")
            
            if len(products) == 0:
                print("[WARN]  No products found. Run: npm run prisma:seed")
                return []
            
            # Analyze each product with ML forecast
            for idx, product in enumerate(products):
                try:
                    print(f"\n[{idx+1}/{len(products)}] Analyzing {product['name']}...")
                    
                    alert = await self._analyze_with_ml_forecast(product)
                    
                    if alert:
                        alerts.append(alert)
                        print(f"  [EMOJI] ALERT GENERATED: {alert['urgency']} urgency")
                    else:
                        print(f"  [OK] Stock adequate")
                        
                except Exception as e:
                    print(f"  [ERROR] Error: {str(e)}")
                    continue
            
            print(f"\n[OK] Alert generation complete: {len(alerts)} alerts")
            return alerts
            
        except Exception as e:
            print(f"[ERROR] ERROR in analyze_all_products: {str(e)}")
            import traceback
            traceback.print_exc()
            raise
    
    async def _analyze_with_ml_forecast(self, product: dict) -> Dict[str, Any]:
        """
        Use trained ML model to forecast demand and determine if alert needed
        
        Args:
            product: Dict with keys: id, storeId, name, nameSi, currentStock, reorderLevel
            
        Returns:
            Alert dict if alert needed, None otherwise
        """
        product_id = product['id']
        store_id = product['storeId']
        current_stock = product['currentStock']
        reorder_level = product['reorderLevel']
        
        try:
            # STEP 1: Run ML forecast (uses trained XGBoost/Prophet models)
            print(f"  [EMOJI] Running ML forecast for {product_id}...")
            
            forecast_result = await self.forecast_service.predict(
                product_id=product_id,
                store_id=store_id,
                horizon=14,  # 2-week forecast
                lang='en'
            )
            
            forecast_data = forecast_result['forecasts']
            
            # STEP 2: Calculate cumulative demand from forecast
            cumulative_demand = 0
            stockout_day = None
            daily_demands = []
            
            for day in forecast_data:
                predicted_sales = day['predictedSales']
                daily_demands.append(predicted_sales)
                cumulative_demand += predicted_sales
                
                # Check if stock depleted
                if cumulative_demand >= current_stock and stockout_day is None:
                    stockout_day = day['date']
                    break
            
            avg_daily_demand = sum(daily_demands[:7]) / 7 if daily_demands else 0
            
            print(f"  [EMOJI] Forecast: {avg_daily_demand:.1f} units/day avg demand")
            print(f"  [EMOJI] Current stock: {current_stock}, Reorder: {reorder_level}")
            
            # STEP 3: Determine if alert needed
            needs_alert = False
            
            # Calculate days until stockout using simple division
            if avg_daily_demand > 0:
                days_until_stockout = current_stock / avg_daily_demand
                stockout_date = datetime.now() + timedelta(days=days_until_stockout)
            else:
                # No demand predicted, no alert needed
                print(f"  [OK] No demand predicted, stock adequate")
                return None
            
            print(f"  ⏰ Stockout predicted in {days_until_stockout:.1f} days")
            
            # Alert criteria: ONLY if stock below reorder level OR stockout within 3 days (CRITICAL)
            if current_stock < reorder_level:
                needs_alert = True
                print(f"  [WARN]  Below reorder level ({current_stock} < {reorder_level})")
            elif days_until_stockout <= 3:
                needs_alert = True
                print(f"  [WARN]  CRITICAL stockout imminent ({days_until_stockout:.1f} days)")
            
            if not needs_alert:
                print(f"  [OK] Stock adequate ({current_stock} >= {reorder_level}, {days_until_stockout:.1f} days supply)")
                return None
            
            # STEP 4: Calculate alert urgency
            stock_ratio = current_stock / reorder_level if reorder_level > 0 else 1
            
            if stock_ratio < 0.5 or days_until_stockout < 3:
                urgency = "HIGH"
                confidence = 0.92
            elif stock_ratio < 0.8 or days_until_stockout < 7:
                urgency = "MEDIUM"
                confidence = 0.85
            else:
                urgency = "LOW"
                confidence = 0.75
            
            # STEP 5: Calculate recommended restock quantity
            # Simple approach: bring stock back to reorder level + 2 weeks buffer
            stock_deficit = max(0, reorder_level - current_stock)
            two_week_buffer = int(avg_daily_demand * 14)
            recommended_qty = stock_deficit + two_week_buffer
            
            # Cap at reasonable maximum (3x reorder level)
            recommended_qty = min(recommended_qty, reorder_level * 3)
            
            # STEP 6: Create alert with accurate reason
            stock_status = "below" if current_stock < reorder_level else "at"
            stock_status_si = "අඩුයි" if current_stock < reorder_level else "සමාන"
            
            reason_en = (
                f"AI predicts stockout in {days_until_stockout:.1f} days (demand: {avg_daily_demand:.1f} units/day). "
                f"Current stock ({current_stock}) is {stock_status} reorder level ({reorder_level})."
            )
            
            reason_si = (
                f"AI දින {days_until_stockout:.1f} කින් තොග අවසන් වීම පුරෝකථනය කරයි (ඉල්ලුම: දිනකට {avg_daily_demand:.1f} ඒකක). "
                f"වත්මන් තොගය ({current_stock}) නැවත ඇණවුම් මට්ටමට ({reorder_level}) {stock_status_si}."
            )
            
            alert = {
                'productId': product_id,
                'storeId': store_id,
                'type': 'RESTOCK',
                'urgency': urgency,
                'currentStock': current_stock,
                'recommendedQuantity': recommended_qty,
                'reason': reason_en,
                'reasonSi': reason_si,
                'confidence': confidence,
                'estimatedStockoutDate': stockout_date.strftime('%Y-%m-%d'),
                'metadata': {
                    'mlModel': 'XGBoost + Prophet',
                    'forecastedDailyDemand': round(avg_daily_demand, 2),
                    'daysUntilStockout': round(days_until_stockout, 1),
                    'reorderPoint': reorder_level,
                    'recommendedQuantity': recommended_qty,
                    'stockDeficit': stock_deficit
                }
            }
            
            return alert
            
        except FileNotFoundError as e:
            # Model not trained yet
            print(f"  [WARN]  No trained model found. Train first: POST /api/v1/forecast")
            return None
        except Exception as e:
            print(f"  [ERROR] Forecast error: {str(e)}")
            return None
    
    async def analyze_product_alert(self, product_id: str, store_id: str) -> Dict[str, Any]:
        """
        Analyze a specific product and return alert if needed
        """
        try:
            if not self.engine:
                raise Exception("Database connection not configured")
            
            # Get product from database
            query = """
                SELECT p.id, p.store_id as "storeId", p.name, p.name_si as "nameSi",
                       p.current_stock as "currentStock", p.reorder_level as "reorderLevel", p.price
                FROM products p
                WHERE p.id = :product_id AND p.store_id = :store_id
            """
            
            with self.engine.connect() as conn:
                result = conn.execute(text(query), {"product_id": product_id, "store_id": store_id})
                row = result.fetchone()
                
                if not row:
                    return {"alertNeeded": False, "message": "Product not found in database"}
                
                product = dict(row._mapping)
            
            alert = await self._analyze_with_ml_forecast(product)
            
            if alert:
                return {"alertNeeded": True, "alert": alert}
            else:
                return {"alertNeeded": False, "message": "Stock adequate based on ML forecast"}
                
        except Exception as e:
            print(f"[ERROR] ERROR in analyze_product_alert: {str(e)}")
            raise


