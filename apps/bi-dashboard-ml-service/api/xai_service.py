"""
XAI Service - Real SHAP Explanations from Trained Models
"""

import shap
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, Any, List
import pickle
import os
import logging


logger = logging.getLogger(__name__)


class XAIService:
    def __init__(self):
        self.explainers = {}
        self.model_path = os.getenv("MODEL_PATH", "./models")

        self.db_url = os.getenv("DATABASE_URL")
        if self.db_url and "?schema=" in self.db_url:
            self.db_url = self.db_url.split("?schema=")[0]

    # ------------------------------------------------------------------
    # Helper: build a feature vector dict for the current moment.
    # Centralised here so both _fetch_current_context and
    # _fetch_current_context_for_alert share the same logic.
    # ------------------------------------------------------------------
    @staticmethod
    def _build_temporal_features(now: datetime, current_discount: float,
                                  price: float, inventory: float,
                                  metadata: Dict) -> Dict[str, float]:
        """
        Build time-based and context-based feature values.
        Includes competitor_pricing and weather_snowy which are present
        in the expanded dataset and therefore in trained model features.
        """
        avg_sales = metadata.get("avg_daily_sales", 10)
        sales_std = metadata.get("sales_std", 5)

        return {
            "day_of_week":        now.weekday(),
            "day_of_month":       now.day,
            "month":              now.month,
            "week_of_year":       now.isocalendar()[1],
            "is_weekend":         1 if now.weekday() >= 5 else 0,
            "holiday_promotion":  1 if current_discount > 0 else 0,
            "discount":           current_discount,
            "price":              price,
            "inventory_level":    inventory,
            "competitor_pricing": metadata.get("avg_price", price) * 1.05,  # estimate from metadata
            # Lag / rolling features — approximated from training averages
            "lag_1":              avg_sales,
            "lag_7":              avg_sales,
            "lag_14":             avg_sales,
            "rolling_mean_7":     avg_sales,
            "rolling_std_7":      sales_std,
            "rolling_mean_30":    avg_sales,
            # Weather — default sunny; callers can override
            "weather_sunny":      1,
            "weather_rainy":      0,
            "weather_cloudy":     0,
            "weather_snowy":      0,   # present in expanded dataset
            # Season — derived from current month
            "season_spring":      1 if now.month in [3, 4, 5] else 0,
            "season_summer":      1 if now.month in [6, 7, 8] else 0,
            "season_autumn":      1 if now.month in [9, 10, 11] else 0,
            "season_winter":      1 if now.month in [12, 1, 2] else 0,
        }

    @staticmethod
    def _feature_vector_to_df(feature_values: Dict, feature_names: List[str]) -> pd.DataFrame:
        """Build a single-row DataFrame aligned to the model's expected feature list."""
        context_data = {}
        for feat in feature_names:
            if feat in feature_values:
                context_data[feat] = [feature_values[feat]]
            else:
                context_data[feat] = [0]
                print(f"[WARN] Feature '{feat}' not in context — defaulting to 0")
        return pd.DataFrame(context_data)

    # ------------------------------------------------------------------
    # Database context fetchers
    # ------------------------------------------------------------------
    async def _fetch_current_context(self, product_id: str,
                                     feature_names: List[str],
                                     metadata: Dict) -> pd.DataFrame:
        """Fetch live product context from PostgreSQL for SHAP analysis."""
        try:
            from sqlalchemy import create_engine, text

            if not self.db_url:
                print("[WARN] DATABASE_URL not configured, using sample data")
                return None

            engine = create_engine(self.db_url, pool_pre_ping=True, pool_recycle=3600)

            query = """
                SELECT p.id, p.name, p.price, p.cost, p.current_stock,
                       p.reorder_level, p.max_stock, p.category_id
                FROM bi_dashboard.products p
                WHERE p.sku = :product_id
                LIMIT 1
            """
            with engine.connect() as conn:
                row = conn.execute(text(query), {"product_id": product_id}).fetchone()
                if not row:
                    print(f"[WARN] Product {product_id} not found in database")
                    return None
                product = dict(row._mapping)

            print(f"[DATA] DB product: {product['name']} @ {product['price']:.2f}")

            # Recent 30-day sales
            sales_query = """
                SELECT COALESCE(SUM(si.quantity), 0) AS total_qty,
                       COALESCE(AVG(si.unit_price), 0) AS avg_price
                FROM bi_dashboard.sale_items si
                JOIN bi_dashboard.sales s ON si.sale_id = s.id
                JOIN bi_dashboard.products p ON si.product_id = p.id
                WHERE p.sku = :product_id
                  AND s.timestamp > NOW() - INTERVAL '30 days'
            """
            with engine.connect() as conn:
                sr = conn.execute(text(sales_query), {"product_id": product_id}).fetchone()
                sales_data = dict(sr._mapping) if sr else {"total_qty": 0, "avg_price": 0}

            print(f"[DATA] Recent sales: {sales_data['total_qty']} units / 30 days")

            # Active promotions
            promo_query = """
                SELECT pr.discount
                FROM bi_dashboard.promotions pr
                JOIN bi_dashboard.promotion_products pp ON pr.id = pp."promotionId"
                JOIN bi_dashboard.products p ON pp."productId" = p.id
                WHERE p.sku = :product_id
                  AND pr.status = 'ACTIVE'
                  AND NOW() BETWEEN pr.start_date AND pr.end_date
                LIMIT 1
            """
            with engine.connect() as conn:
                pr = conn.execute(text(promo_query), {"product_id": product_id}).fetchone()
                current_discount = float(pr[0]) if pr else 0.0

            print(f"[DATA] Active discount: {current_discount}%")

            feature_values = self._build_temporal_features(
                now=datetime.now(),
                current_discount=current_discount,
                price=float(product["price"]),
                inventory=float(product["current_stock"]),
                metadata=metadata,
            )

            df = self._feature_vector_to_df(feature_values, feature_names)
            print(f"[OK] Built feature vector ({len(feature_names)} features) from live DB")
            return df

        except Exception as e:
            print(f"[WARN] Database query error: {e}")
            import traceback; traceback.print_exc()
            return None

    async def _fetch_current_context_for_alert(self, product_id: str,
                                                feature_names: List[str],
                                                metadata: Dict,
                                                alert: Dict,
                                                engine) -> pd.DataFrame:
        """Build feature vector for a restock alert using live DB context."""
        try:
            from sqlalchemy import text

            price = float(alert.get("price", metadata.get("avg_price", 10)))
            current_stock = float(alert.get("current_stock", 50))

            print(f"[DATA] Alert context: price={price:.2f}, stock={current_stock}")

            promo_query = """
                SELECT pr.discount
                FROM bi_dashboard.promotions pr
                JOIN bi_dashboard.promotion_products pp ON pr.id = pp."promotionId"
                WHERE pp."productId" = :product_id
                  AND pr.status = 'ACTIVE'
                  AND NOW() BETWEEN pr.start_date AND pr.end_date
                LIMIT 1
            """
            with engine.connect() as conn:
                pr = conn.execute(text(promo_query),
                                  {"product_id": alert["product_id"]}).fetchone()
                current_discount = float(pr[0]) if pr else 0.0

            feature_values = self._build_temporal_features(
                now=datetime.now(),
                current_discount=current_discount,
                price=price,
                inventory=current_stock,
                metadata=metadata,
            )

            df = self._feature_vector_to_df(feature_values, feature_names)
            print("[OK] Built alert feature vector from live DB context")
            return df

        except Exception as e:
            print(f"[WARN] Alert context error: {e}")
            return None

    # ------------------------------------------------------------------
    # Core SHAP helpers
    # ------------------------------------------------------------------
    def _load_model_and_metadata(self, product_id: str):
        """Load XGBoost model + metadata; raises FileNotFoundError if missing."""
        model_file = f"{self.model_path}/{product_id}_xgboost.pkl"
        meta_file  = f"{self.model_path}/{product_id}_metadata.pkl"

        if not os.path.exists(model_file):
            available = sorted(
                {
                    file_name.removesuffix("_xgboost.pkl")
                    for file_name in os.listdir(self.model_path)
                    if file_name.endswith("_xgboost.pkl")
                }
            ) if os.path.isdir(self.model_path) else []
            logger.warning(
                "No XGBoost model found for product_id=%s at path=%s. Available xgboost models=%s",
                product_id,
                model_file,
                available,
            )
            raise FileNotFoundError(
                f"No trained XGBoost model found for {product_id}. "
                f"Run: python train_model.py"
            )

        print(f"[LOAD] XGBoost model  : {model_file}")
        with open(model_file, "rb") as f:
            model = pickle.load(f)

        print(f"[LOAD] Metadata       : {meta_file}")
        with open(meta_file, "rb") as f:
            metadata = pickle.load(f)

        return model, metadata

    def _run_shap(self, xgb_model, X_latest: pd.DataFrame, feature_names: List[str]):
        """Compute SHAP values and return sorted (feat_name, shap_val, feat_val) list."""
        print("[ANALYZE] Computing SHAP values…")
        explainer   = shap.TreeExplainer(xgb_model)
        shap_values = explainer.shap_values(X_latest)
        base_value  = explainer.expected_value
        predicted   = xgb_model.predict(X_latest)[0]

        print(f"[DATA] Base={base_value:.2f}  Predicted={predicted:.2f}")

        flat = shap_values[0] if len(shap_values.shape) > 1 else shap_values
        impacts = [
            (name, float(flat[i]), float(X_latest[name].iloc[0]))
            for i, name in enumerate(feature_names)
        ]
        impacts.sort(key=lambda x: abs(x[1]), reverse=True)

        print("\n[TOP] Top SHAP features:")
        for name, sv, fv in impacts[:10]:
            print(f"   {name:30s}: SHAP={sv:+7.2f}  val={fv:.2f}")

        return impacts, base_value, predicted

    def _fallback_to_sample(self, metadata: Dict, feature_names: List[str],
                             product_id: str) -> pd.DataFrame:
        """Fall back to saved sample data when DB is unavailable."""
        print("[WARN] Using saved sample data (DB fallback)")
        records = metadata.get("sample_data")
        if not records:
            raise FileNotFoundError(
                f"No sample data in metadata for {product_id}. "
                f"Retrain: python train_model.py"
            )
        df = pd.DataFrame(records)
        return df[feature_names].iloc[-1:]

    # ------------------------------------------------------------------
    # Public API: explain_forecast
    # ------------------------------------------------------------------
    async def explain_forecast(self, product_id: str,
                               date: str = None, lang: str = "en") -> Dict[str, Any]:
        """Get REAL XAI explanations using SHAP analysis on trained XGBoost model."""
        try:
            print(f"\n=== XAI SHAP Analysis  product={product_id} ===")

            xgb_model, metadata = self._load_model_and_metadata(product_id)
            feature_names = metadata["feature_names"]
            print(f"[OK] Loaded model with {len(feature_names)} features")

            # Build feature vector — live DB first, sample data as fallback
            X_latest = await self._fetch_current_context(product_id, feature_names, metadata)
            if X_latest is None:
                X_latest = self._fallback_to_sample(metadata, feature_names, product_id)
                print("[TARGET] Using saved sample data")
            else:
                print("[TARGET] Using LIVE context from PostgreSQL")

            impacts, base_value, predicted = self._run_shap(xgb_model, X_latest, feature_names)

            features = []
            for feat_name, shap_val, feat_val in impacts[:10]:
                info = self._get_feature_description(feat_name, feat_val, shap_val, lang)
                features.append({
                    "name":          info["name"],
                    "nameSi":        info["nameSi"],
                    "value":         f"{feat_val:.2f}",
                    "contribution":  round(shap_val, 2),
                    "description":   info["description"],
                    "descriptionSi": info["descriptionSi"],
                })

            # Include product_name and category from metadata (new in expanded dataset)
            return {
                "explanation": {
                    "productName":   metadata.get("product_name"),
                    "category":      metadata.get("category"),
                    "predictedValue": round(float(predicted), 2),
                    "actualValue":   None,
                    "confidence":    0.87,
                    "baseValue":     round(float(base_value), 2),
                    "modelType":     "XGBoost + SHAP",
                    "features":      features,
                    "summary":       self._generate_shap_summary(
                        features, float(predicted), float(base_value), lang
                    ),
                }
            }

        except FileNotFoundError:
            raise
        except Exception as e:
            logger.exception("Forecast explanation failed for product_id=%s", product_id)
            import traceback; traceback.print_exc()
            raise

    # ------------------------------------------------------------------
    # Public API: explain_restock
    # ------------------------------------------------------------------
    async def explain_restock(self, alert_id: str, lang: str = "en") -> Dict[str, Any]:
        """SHAP-based XAI explanation for a restock alert."""
        alert = None
        try:
            from sqlalchemy import create_engine, text

            print(f"\n=== XAI Restock SHAP  alert={alert_id} ===")

            db_url = os.getenv("DATABASE_URL", "")
            if "?schema=" in db_url:
                db_url = db_url.split("?schema=")[0]

            engine = create_engine(db_url, pool_pre_ping=True, pool_recycle=3600,
                                   pool_size=5, max_overflow=10)

            query = """
                  SELECT a.id, a.product_id, a.current_stock,
                       a.recommended_quantity, a.estimated_stockout_date, a.confidence,
                      p.sku, p.name, p.reorder_level, p.price
                FROM bi_dashboard.inventory_alerts a
                JOIN bi_dashboard.products p ON a.product_id = p.id
                WHERE a.id = :alert_id
                   OR a.product_id = :alert_id
                   OR p.sku = :alert_id
                ORDER BY a.created_at DESC
                LIMIT 1
            """
            with engine.connect() as conn:
                row = conn.execute(text(query), {"alert_id": alert_id}).fetchone()

                if not row:
                    fallback_q = """
                           SELECT a.id, a.product_id, a.current_stock,
                               a.recommended_quantity, a.estimated_stockout_date, a.confidence,
                               p.sku, p.name, p.reorder_level, p.price
                        FROM bi_dashboard.inventory_alerts a
                        JOIN bi_dashboard.products p ON a.product_id = p.id
                        WHERE a.status = 'PENDING'
                        ORDER BY a.created_at DESC
                        LIMIT 1
                    """
                    row = conn.execute(text(fallback_q)).fetchone()
                    if not row:
                        print(f"[WARN] Alert {alert_id} not found — heuristic fallback")
                        return self._build_restock_fallback_response(alert_id, None, lang)
                    print(f"[WARN] Using latest pending alert instead of {alert_id}")

                alert = dict(row._mapping)

            product_id    = alert["product_id"]
            model_product_id = alert.get("sku") or product_id
            current_stock = alert["current_stock"]

            xgb_model, metadata = self._load_model_and_metadata(model_product_id)
            feature_names = metadata["feature_names"]

            # Build feature vector
            X_latest = await self._fetch_current_context_for_alert(
                model_product_id, feature_names, metadata, alert, engine
            )
            if X_latest is None:
                X_latest = self._fallback_to_sample(metadata, feature_names, model_product_id)

            predicted_demand = xgb_model.predict(X_latest)[0]
            impacts, base_value, _ = self._run_shap(xgb_model, X_latest, feature_names)

            features = []
            for feat_name, shap_val, feat_val in impacts[:10]:
                info = self._get_feature_description(
                    feat_name, float(feat_val), float(shap_val), lang
                )
                importance = (
                    abs(shap_val) / (abs(predicted_demand - base_value) + 1e-6)
                )
                features.append({
                    "name":          info["name"],
                    "nameSi":        info["nameSi"],
                    "value":         float(f"{feat_val:.2f}"),
                    "impact":        float(abs(shap_val)),
                    "direction":     "increase" if shap_val > 0 else "decrease",
                        "contribution":  float(round(shap_val, 2)),
                        "contributionLabel": f"{shap_val:+.2f} units",
                    "importance":    float(importance),
                    "description":   info.get("description", ""),
                    "descriptionSi": info.get("descriptionSi", ""),
                })

            days_until_stockout = float(
                current_stock / predicted_demand if predicted_demand > 0 else 999
            )

            return {
                "alertId":     alert_id,
                "productId":   product_id,
                "productName": alert["name"],
                # Include product_name and category from metadata where available
                "productNameDisplay": metadata.get("product_name", alert["name"]),
                "category":    metadata.get("category"),
                "modelType":   "XGBoost + SHAP",
                "explanation": {
                    "en": (
                        f"ML predicts {predicted_demand:.1f} units/day demand. "
                        f"With {current_stock} units in stock, stockout in "
                        f"{days_until_stockout:.1f} days."
                    ),
                    "si": (
                        f"ML ආකෘතිය දිනකට {predicted_demand:.1f} ඒකක ඉල්ලුම පුරෝකථනය කරයි. "
                        f"{current_stock} ඒකක තොග සමඟ, දින {days_until_stockout:.1f} කින් "
                        f"තොග අවසන් වේ."
                    ),
                },
                "features": features,
                "metrics": {
                    "predictedDailyDemand": float(round(predicted_demand, 2)),
                    "baselineDemand":       float(round(base_value, 2)),
                    "currentStock":         int(current_stock),
                    "reorderLevel":         int(alert["reorder_level"]),
                    "daysUntilStockout":    float(round(days_until_stockout, 1)),
                    "recommendedQuantity":  int(alert["recommended_quantity"]),
                },
                "confidence":  float(alert["confidence"]),
                "generatedAt": datetime.now().isoformat(),
            }

        except Exception as e:
            logger.exception("Restock explanation failed for alert_id=%s", alert_id)
            import traceback; traceback.print_exc()
            return self._build_restock_fallback_response(alert_id, alert, lang, str(e))

    # ------------------------------------------------------------------
    # Not yet implemented
    # ------------------------------------------------------------------
    async def explain_segment(self, customer_id: str, lang: str = "en") -> Dict[str, Any]:
        raise NotImplementedError("Segment explanations not yet implemented")

    # ------------------------------------------------------------------
    # Feature description lookup
    # ------------------------------------------------------------------
    def _get_feature_description(self, feat_name: str, feat_val: float,
                                  shap_val: float, lang: str) -> Dict[str, str]:
        up    = "increases" if shap_val > 0 else "decreases"
        up_si = "වැඩි කරයි" if shap_val > 0 else "අඩු කරයි"
        mag   = abs(shap_val)

        feature_map = {
            "holiday_promotion": {
                "name":          "Promotions & Holidays",
                "nameSi":        "ප්‍රවර්ධන සහ නිවාඩු",
                "description":   f"Promotion ({feat_val:.0f}) {up} sales by {mag:.1f} units",
                "descriptionSi": f"ප්‍රවර්ධනය ({feat_val:.0f}) විකුණුම් {mag:.1f} ඒකක {up_si}",
            },
            "discount": {
                "name":          "Discount Effect",
                "nameSi":        "වට්ටම් බලපෑම",
                "description":   f"{feat_val:.0f}% discount {up} sales by {mag:.1f} units",
                "descriptionSi": f"{feat_val:.0f}% වට්ටම විකුණුම් {mag:.1f} ඒකක {up_si}",
            },
            "price": {
                "name":          "Price Point",
                "nameSi":        "මිල ලක්ෂ්‍යය",
                "description":   f"Price of {feat_val:.2f} {up} sales by {mag:.1f} units",
                "descriptionSi": f"{feat_val:.2f} මිල විකුණුම් {mag:.1f} ඒකක {up_si}",
            },
            # New in expanded dataset
            "competitor_pricing": {
                "name":          "Competitor Pricing",
                "nameSi":        "තරඟකාරී මිල",
                "description":   f"Competitor price of {feat_val:.2f} {up} our sales by {mag:.1f} units",
                "descriptionSi": f"තරඟකරුවන්ගේ {feat_val:.2f} මිල අපගේ විකුණුම් {mag:.1f} ඒකක {up_si}",
            },
            "is_weekend": {
                "name":          "Weekend Effect",
                "nameSi":        "සති අන්ත බලපෑම",
                "description":   f"{'Weekend' if feat_val == 1 else 'Weekday'} {up} sales by {mag:.1f} units",
                "descriptionSi": f"{'සති අන්තය' if feat_val == 1 else 'සතියේ දිනය'} විකුණුම් {mag:.1f} ඒකක {up_si}",
            },
            "day_of_week": {
                "name":          "Day of Week",
                "nameSi":        "සතියේ දිනය",
                "description":   f"Day {feat_val:.0f} pattern {up} sales by {mag:.1f} units",
                "descriptionSi": f"{feat_val:.0f} දින රටාව විකුණුම් {mag:.1f} ඒකක {up_si}",
            },
            "month": {
                "name":          "Monthly Seasonality",
                "nameSi":        "මාසික කාලීයභාවය",
                "description":   f"Month {feat_val:.0f} effect {up} sales by {mag:.1f} units",
                "descriptionSi": f"{feat_val:.0f} මාස බලපෑම විකුණුම් {mag:.1f} ඒකක {up_si}",
            },
            "inventory_level": {
                "name":          "Stock Availability",
                "nameSi":        "තොග ලබා ගත හැකි බව",
                "description":   f"Inventory of {feat_val:.0f} {up} sales by {mag:.1f} units",
                "descriptionSi": f"{feat_val:.0f} තොගය විකුණුම් {mag:.1f} ඒකක {up_si}",
            },
            "lag_1": {
                "name":          "Yesterday Sales",
                "nameSi":        "ඊයේ විකුණුම්",
                "description":   f"Yesterday's sales of {feat_val:.0f} {up} forecast by {mag:.1f} units",
                "descriptionSi": f"ඊයේ {feat_val:.0f} විකුණුම් {mag:.1f} ඒකක {up_si}",
            },
            "lag_7": {
                "name":          "Last Week Sales",
                "nameSi":        "පසුගිය සතියේ විකුණුම්",
                "description":   f"Last week's avg {feat_val:.0f} {up} forecast by {mag:.1f} units",
                "descriptionSi": f"පසු සතියේ {feat_val:.0f} {up_si} {mag:.1f} ඒකක",
            },
            "lag_14": {
                "name":          "2-Week-Ago Sales",
                "nameSi":        "සති 2 ක් පෙර විකුණුම්",
                "description":   f"Two-week lag of {feat_val:.0f} {up} forecast by {mag:.1f} units",
                "descriptionSi": f"සති 2 ක් පෙර {feat_val:.0f} {up_si} {mag:.1f} ඒකක",
            },
            "rolling_mean_7": {
                "name":          "7-Day Sales Trend",
                "nameSi":        "7-දින විකුණුම් ප්‍රවණතාව",
                "description":   f"7-day average of {feat_val:.1f} {up} forecast by {mag:.1f} units",
                "descriptionSi": f"{feat_val:.1f} 7-දින සාමාන්‍යය {up_si} {mag:.1f} ඒකක",
            },
            "rolling_mean_30": {
                "name":          "30-Day Sales Trend",
                "nameSi":        "30-දින විකුණුම් ප්‍රවණතාව",
                "description":   f"30-day average of {feat_val:.1f} {up} forecast by {mag:.1f} units",
                "descriptionSi": f"{feat_val:.1f} 30-දින සාමාන්‍යය {up_si} {mag:.1f} ඒකක",
            },
        }

        if feat_name in feature_map:
            return feature_map[feat_name]

        # Weather dummies — now includes snowy
        if feat_name.startswith("weather_"):
            wtype = feat_name.replace("weather_", "").title()
            return {
                "name":          f"{wtype} Weather",
                "nameSi":        f"{wtype} කාලගුණය",
                "description":   f"{wtype} conditions {up} sales by {mag:.1f} units",
                "descriptionSi": f"{wtype} කාලගුණය විකුණුම් {mag:.1f} ඒකක {up_si}",
            }

        # Season dummies
        if feat_name.startswith("season_"):
            stype = feat_name.replace("season_", "").title()
            return {
                "name":          f"{stype} Season",
                "nameSi":        f"{stype} කාලය",
                "description":   f"{stype} season {up} sales by {mag:.1f} units",
                "descriptionSi": f"{stype} කාලය විකුණුම් {mag:.1f} ඒකක {up_si}",
            }

        # Default
        return {
            "name":          feat_name.replace("_", " ").title(),
            "nameSi":        feat_name.replace("_", " ").title(),
            "description":   f"{feat_name}={feat_val:.2f} {up} sales by {mag:.1f} units",
            "descriptionSi": f"{feat_name}={feat_val:.2f} විකුණුම් {mag:.1f} ඒකක {up_si}",
        }

    # ------------------------------------------------------------------
    # Summary helpers
    # ------------------------------------------------------------------
    def _generate_shap_summary(self, features: List[Dict], predicted: float,
                                base: float, lang: str) -> str:
        if len(features) < 2:
            return "Insufficient features for summary"
        diff = predicted - base
        direction    = "above" if diff > 0 else "below"
        direction_si = "ඉහළ"  if diff > 0 else "පහළ"
        if lang == "si":
            return (f"මූලික පුරෝකථනයට {direction_si} {abs(diff):.1f} ඒකක, "
                    f"ප්‍රධාන වශයෙන් {features[0]['nameSi']} සහ {features[1]['nameSi']}")
        return (f"Prediction is {abs(diff):.1f} units {direction} baseline, "
                f"driven by {features[0]['name']} and {features[1]['name']}")

    # ------------------------------------------------------------------
    # Fallback response
    # ------------------------------------------------------------------
    def _build_restock_fallback_response(self, alert_id: str,
                                          alert: Dict[str, Any] = None,
                                          lang: str = "en",
                                          error: str = None) -> Dict[str, Any]:
        alert = alert or {}
        product_id         = alert.get("product_id")
        product_name       = alert.get("name", "Unknown product")
        current_stock      = int(alert.get("current_stock") or 0)
        reorder_level      = int(alert.get("reorder_level") or current_stock)
        recommended_qty    = int(alert.get("recommended_quantity")
                                 or max(reorder_level - current_stock + 20, 20))
        confidence         = float(alert.get("confidence") or 0.5)
        days_until_stockout = float(
            round(current_stock / max(recommended_qty, 1), 1)
        ) if current_stock else 0.0

        if lang == "si":
            explanation_text = (
                f"සවිස්තර SHAP විශ්ලේෂණය තාවකාලිකව නොලැබුණද, "
                f"වත්මන් තොගය {current_stock} සහ නැවත ඇණවුම් සීමාව {reorder_level} "
                f"නිසා නැවත පිරවීම නිර්දේශ කෙරේ."
            )
        else:
            explanation_text = (
                f"Detailed SHAP analysis is temporarily unavailable. "
                f"Current stock ({current_stock}) is at/below reorder level ({reorder_level})."
            )

        features = [
            {
                "name": "Current Stock", "nameSi": "වත්මන් තොගය",
                "value": float(current_stock),
                "impact": float(abs(reorder_level - current_stock)),
                "direction": "decrease" if current_stock <= reorder_level else "increase",
                    "contribution": float(round(current_stock - reorder_level, 2)),
                    "contributionLabel": f"{current_stock - reorder_level:+.2f} units",
                "importance": 1.0,
                "description":   f"Current stock is {current_stock} units.",
                "descriptionSi": f"වත්මන් තොගය ඒකක {current_stock} කි.",
            },
            {
                "name": "Reorder Level", "nameSi": "නැවත ඇණවුම් සීමාව",
                "value": float(reorder_level),
                "impact": float(abs(reorder_level - current_stock)),
                "direction": "decrease",
                    "contribution": float(round(reorder_level - current_stock, 2)),
                    "contributionLabel": f"{reorder_level - current_stock:+.2f} units",
                "importance": 0.9,
                "description":   f"Reorder threshold is {reorder_level} units.",
                "descriptionSi": f"නැවත ඇණවුම් සීමාව ඒකක {reorder_level}.",
            },
        ]

        return {
            "alertId":     alert_id,
            "productId":   product_id,
            "productName": product_name,
            "modelType":   "Heuristic Fallback",
            "explanation": {
                "en": explanation_text if lang != "si" else "Restock from alert thresholds.",
                "si": explanation_text if lang == "si" else "අනතුරු ඇඟවීම් සීමා මත නිර්දේශය.",
            },
            "features": features,
            "metrics": {
                "predictedDailyDemand": 0.0,
                "baselineDemand":       0.0,
                "currentStock":         current_stock,
                "reorderLevel":         reorder_level,
                "daysUntilStockout":    days_until_stockout,
                "recommendedQuantity":  recommended_qty,
            },
            "confidence":    confidence,
            "generatedAt":   datetime.now().isoformat(),
            "fallbackReason": error or "restock explanation fallback",
        }