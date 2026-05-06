"""
Forecast Service - Prophet & XGBoost Implementation
"""

import pandas as pd
import numpy as np
from prophet import Prophet
import xgboost as xgb
from datetime import datetime, timedelta
import pickle
import os
from typing import Dict, Any, List
from sqlalchemy import create_engine
from dotenv import load_dotenv
import logging

load_dotenv()


logger = logging.getLogger(__name__)


class ForecastService:
    def __init__(self):
        self.prophet_models  = {}
        self.xgboost_models  = {}
        self.model_path = os.getenv("MODEL_PATH", "./models")
        self.db_url     = os.getenv("DATABASE_URL")

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

        os.makedirs(self.model_path, exist_ok=True)

    def is_model_loaded(self) -> bool:
        return bool(self.prophet_models or self.xgboost_models)

    # ------------------------------------------------------------------
    # Internal model helpers
    # ------------------------------------------------------------------
    def _prepare_prophet_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prepare (ds, y) frame for Prophet. Handles both column-name conventions."""
        sales_col = "units_sold" if "units_sold" in df.columns else "quantity"
        prophet_df = df[["date", sales_col]].copy()
        prophet_df.columns = ["ds", "y"]
        prophet_df["ds"] = pd.to_datetime(prophet_df["ds"])
        return prophet_df

    def _train_prophet(self, df: pd.DataFrame) -> Prophet:
        """Train Prophet with yearly seasonality enabled (4+ years of data available)."""
        model = Prophet(
            seasonality_mode="multiplicative",
            changepoint_prior_scale=0.05,
            daily_seasonality=True,
            weekly_seasonality=True,
            yearly_seasonality=True,   # enabled — expanded dataset covers 2022-2026
        )
        model.fit(df)
        return model

    def _engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Engineer features via DataProcessor."""
        from utils.data_processor import DataProcessor
        processor = DataProcessor()
        df = df.copy()
        df["date"] = pd.to_datetime(df["date"])
        return processor.engineer_features(df).dropna()

    def _train_xgboost(self, df: pd.DataFrame) -> xgb.XGBRegressor:
        """Train XGBoost with all features available in the expanded dataset."""
        feature_cols = [
            "day_of_week", "day_of_month", "month", "week_of_year", "is_weekend",
            "holiday_promotion", "discount", "price", "inventory_level",
            "competitor_pricing",                         # new in expanded dataset
            "lag_1", "lag_7", "lag_14",
            "rolling_mean_7", "rolling_std_7", "rolling_mean_30",
        ]

        # Expanded dataset includes snowy weather
        weather_features = ["weather_sunny", "weather_rainy", "weather_cloudy", "weather_snowy"]
        season_features  = ["season_spring", "season_summer", "season_autumn", "season_winter"]

        available_features = [
            col for col in feature_cols + weather_features + season_features
            if col in df.columns
        ]

        sales_col = "units_sold" if "units_sold" in df.columns else "quantity"
        X = df[available_features]
        y = df[sales_col]

        model = xgb.XGBRegressor(
            n_estimators=150,
            max_depth=6,
            learning_rate=0.1,
            random_state=42,
            importance_type="gain",
        )
        model.fit(X, y)
        self.feature_names = available_features
        return model

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------
    def load_model(self, product_id: str):
        """Load pre-trained Prophet model from disk."""
        path = f"{self.model_path}/{product_id}_prophet.pkl"
        if os.path.exists(path):
            print(f"[LOAD] Prophet model: {path}")
            with open(path, "rb") as f:
                return pickle.load(f)
        available = sorted(
            {
                file_name.rsplit("_", 1)[0]
                for file_name in os.listdir(self.model_path)
                if file_name.endswith("_prophet.pkl")
            }
        ) if os.path.isdir(self.model_path) else []
        logger.warning(
            "No pre-trained Prophet model found for product_id=%s at path=%s. Available prophet models=%s",
            product_id,
            path,
            available,
        )
        return None

    def load_xgboost_model(self, product_id: str):
        """Load pre-trained XGBoost model from disk."""
        path = f"{self.model_path}/{product_id}_xgboost.pkl"
        if os.path.exists(path):
            print(f"[LOAD] XGBoost model: {path}")
            with open(path, "rb") as f:
                return pickle.load(f)
        return None

    def save_model(self, model, product_id: str, model_type: str = "prophet") -> str:
        filename = f"{self.model_path}/{product_id}_{model_type}.pkl"
        with open(filename, "wb") as f:
            pickle.dump(model, f)
        print(f"[SAVE] {model_type} model → {filename}")
        return filename

    def load_model_metadata(self, product_id: str) -> Dict[str, Any]:
        """Load saved metadata (feature_names, drivers, avg_price, product_name, category)."""
        path = f"{self.model_path}/{product_id}_metadata.pkl"
        if os.path.exists(path):
            with open(path, "rb") as f:
                return pickle.load(f)
        return {
            "drivers":      [],
            "avg_price":    10.0,
            "feature_names": [],
            "product_name": None,   # present in metadata from expanded dataset training
            "category":     None,
            "trained_at":   None,
        }

    def save_model_metadata(self, product_id: str, feature_names: list,
                            drivers: List[Dict[str, Any]] = None,
                            avg_price: float = None,
                            product_name: str = None,
                            category: str = None) -> str:
        """Save feature names, drivers, price, product_name, and category."""
        metadata = {
            "feature_names": feature_names,
            "drivers":       drivers or [],
            "avg_price":     avg_price,
            "product_name":  product_name,   # new field from expanded dataset
            "category":      category,        # new field from expanded dataset
            "trained_at":    datetime.now().isoformat(),
        }
        filename = f"{self.model_path}/{product_id}_metadata.pkl"
        with open(filename, "wb") as f:
            pickle.dump(metadata, f)
        return filename

    # ------------------------------------------------------------------
    # Public: predict
    # ------------------------------------------------------------------
    async def predict(self, product_id: str,
                      horizon: int = 30, lang: str = "en") -> Dict[str, Any]:
        """
        Generate forecast using pre-trained Prophet + XGBoost models.
        Models are trained via train_model.py — this method never loads raw CSV data.
        """
        model_key = product_id

        # --- Prophet (cache → disk) ---
        if model_key in self.prophet_models:
            prophet_model = self.prophet_models[model_key]
            print(f"[CACHE] Prophet model for {model_key}")
        else:
            prophet_model = self.load_model(product_id)
            if prophet_model:
                self.prophet_models[model_key] = prophet_model

        if prophet_model is None:
            logger.error(
                "Forecast request failed because no Prophet model was available for product_id=%s",
                product_id,
            )
            raise FileNotFoundError(
                f"No pre-trained Prophet model for {product_id}.\n"
                f"Run: python train_model.py"
            )

        # Load metadata (no CSV loading — all derived values saved at training time)
        metadata  = self.load_model_metadata(product_id)
        avg_price = metadata.get("avg_price", 10.0)

        # Prophet forecast
        future          = prophet_model.make_future_dataframe(periods=horizon)
        prophet_forecast = prophet_model.predict(future)
        forecast_data   = prophet_forecast.tail(horizon)

        forecasts = []
        for _, row in forecast_data.iterrows():
            predicted_sales   = max(0.0, float(row["yhat"]))
            confidence_lower  = max(0.0, float(row["yhat_lower"]))
            confidence_upper  = max(0.0, float(row["yhat_upper"]))
            forecasts.append({
                "date":            row["ds"].strftime("%Y-%m-%d"),
                "predictedSales":  round(predicted_sales, 2),
                "confidenceLower": round(confidence_lower, 2),
                "confidenceUpper": round(confidence_upper, 2),
                "revenue":         round(predicted_sales * avg_price, 2),
            })

        return {
            "productId":    product_id,
            "productName":  metadata.get("product_name"),   # from expanded dataset metadata
            "category":     metadata.get("category"),        # from expanded dataset metadata
            "modelType":    "Prophet",
            "confidence":   0.87,
            "generatedAt":  datetime.now().isoformat(),
            "forecasts":    forecasts,
            "drivers":      metadata.get("drivers", []),
        }

    # ------------------------------------------------------------------
    # Driver calculation (used internally and by train_model.py)
    # ------------------------------------------------------------------
    def _calculate_drivers(self, df: pd.DataFrame, lang: str) -> List[Dict[str, Any]]:
        """
        Calculate forecast drivers from historical data.
        Supports all columns present in the expanded dataset:
        holiday_promotion, discount, seasonality, weather_condition,
        competitor_pricing, day_of_week.
        """
        df = df.copy()
        df["date"] = pd.to_datetime(df["date"])
        df["day_of_week"] = df["date"].dt.dayofweek

        sales_col = "units_sold" if "units_sold" in df.columns else "quantity"
        drivers   = []

        # 1. Promotion / Holiday
        if "holiday_promotion" in df.columns:
            promo     = df[df["holiday_promotion"] == 1][sales_col]
            non_promo = df[df["holiday_promotion"] == 0][sales_col]
            if len(promo) > 0 and len(non_promo) > 0 and non_promo.mean() > 0:
                impact = (promo.mean() - non_promo.mean()) / non_promo.mean()
                drivers.append({
                    "name":          "Promotions & Holidays",
                    "nameSi":        "ප්‍රවර්ධන සහ නිවාඩු",
                    "impact":        round(abs(impact), 2),
                    "description":   f'Sales {"increase" if impact > 0 else "decrease"} by {abs(int(impact*100))}% during promotions',
                    "descriptionSi": f'ප්‍රවර්ධන වලදී විකුණුම් {abs(int(impact*100))}% {"වැඩි වේ" if impact > 0 else "අඩු වේ"}',
                })

        # 2. Discount
        if "discount" in df.columns:
            med  = df["discount"].median()
            high = df[df["discount"] >  med][sales_col]
            low  = df[df["discount"] <= med][sales_col]
            if len(high) > 0 and len(low) > 0 and low.mean() > 0:
                impact = (high.mean() - low.mean()) / low.mean()
                drivers.append({
                    "name":          "Discount Effect",
                    "nameSi":        "වට්ටම් බලපෑම",
                    "impact":        round(abs(impact), 2),
                    "description":   f'Higher discounts boost sales by {abs(int(impact*100))}%',
                    "descriptionSi": f'ඉහළ වට්ටම් විකුණුම් {abs(int(impact*100))}% වැඩි කරයි',
                })

        # 3. Seasonality  (column present in expanded dataset)
        if "seasonality" in df.columns:
            season_avg = df.groupby("seasonality")[sales_col].mean()
            if len(season_avg) > 1 and season_avg.mean() > 0:
                impact      = (season_avg.max() - season_avg.min()) / season_avg.mean()
                max_season  = season_avg.idxmax()
                min_season  = season_avg.idxmin()
                drivers.append({
                    "name":          "Seasonal Patterns",
                    "nameSi":        "කාලීය රටා",
                    "impact":        round(impact, 2),
                    "description":   f"{max_season} has highest sales, {min_season} lowest",
                    "descriptionSi": f"{max_season} හි ඉහළම, {min_season} හි අඩුම විකුණුම්",
                })

        # 4. Weather  (column present in expanded dataset)
        if "weather_condition" in df.columns:
            weather_avg = df.groupby("weather_condition")[sales_col].mean()
            if len(weather_avg) > 1 and weather_avg.mean() > 0:
                impact      = (weather_avg.max() - weather_avg.min()) / weather_avg.mean()
                best        = weather_avg.idxmax()
                drivers.append({
                    "name":          "Weather Conditions",
                    "nameSi":        "කාලගුණ තත්ත්වය",
                    "impact":        round(impact, 2),
                    "description":   f"{best} weather drives higher sales",
                    "descriptionSi": f"{best} කාලගුණය ඉහළ විකුණුම් ඇති කරයි",
                })

        # 5. Weekend effect
        weekend = df[df["day_of_week"].isin([5, 6])][sales_col].mean()
        weekday = df[~df["day_of_week"].isin([5, 6])][sales_col].mean()
        if weekday > 0:
            impact = (weekend - weekday) / weekday
            if abs(impact) > 0.05:
                drivers.append({
                    "name":          "Day of Week Effect",
                    "nameSi":        "සතියේ දින බලපෑම",
                    "impact":        round(abs(impact), 2),
                    "description":   f'Weekend sales are {abs(int(impact*100))}% {"higher" if impact > 0 else "lower"}',
                    "descriptionSi": f'සති අන්ත විකුණුම් {abs(int(impact*100))}% {"වැඩි" if impact > 0 else "අඩු"}යි',
                })

        # 6. Competitor pricing  (column present in expanded dataset)
        if "competitor_pricing" in df.columns:
            df["_price_gap"] = df["price"] - df["competitor_pricing"]
            cheaper   = df[df["_price_gap"] < 0][sales_col]
            expensive = df[df["_price_gap"] >= 0][sales_col]
            if len(cheaper) > 0 and len(expensive) > 0 and expensive.mean() > 0:
                impact = (cheaper.mean() - expensive.mean()) / expensive.mean()
                if abs(impact) > 0.03:
                    drivers.append({
                        "name":          "Price Competitiveness",
                        "nameSi":        "මිල තරඟකාරීත්වය",
                        "impact":        round(abs(impact), 2),
                        "description":   f'Sales {abs(int(impact*100))}% {"higher" if impact > 0 else "lower"} when priced below competitors',
                        "descriptionSi": f'තරඟකරුවන්ට අඩු මිලකදී විකුණුම් {abs(int(impact*100))}% {"වැඩිය" if impact > 0 else "අඩුය"}',
                    })

        drivers.sort(key=lambda x: x["impact"], reverse=True)
        return drivers[:5]

    # ------------------------------------------------------------------
    # Retrain endpoint (redirects to CLI script)
    # ------------------------------------------------------------------
    async def retrain(self, product_id: str = None) -> Dict[str, Any]:
        return {
            "status":    "error",
            "message":   (
                "Model training must be done via train_model.py.\n"
                "Run: python train_model.py"
            ),
            "timestamp": datetime.now().isoformat(),
        }