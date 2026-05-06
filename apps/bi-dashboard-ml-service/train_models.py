"""
Train Prophet models for all product-store combinations using expanded dataset
Run this script once to generate all models
"""

import os
import pickle
from datetime import datetime
from dotenv import load_dotenv
import pandas as pd
from prophet import Prophet
from utils.data_processor import DataProcessor

load_dotenv()


class ModelTrainer:
    def __init__(self):
        self.model_path = os.getenv("MODEL_PATH", "./models")
        self.data_path = os.getenv("DATA_PATH", "./data")
        # Updated filename to match new expanded dataset
        self.kaggle_file = os.path.join(self.data_path, "updated_kaggle_sales_data_expanded.csv")

        os.makedirs(self.model_path, exist_ok=True)

        self.processor = DataProcessor()
        self.kaggle_data = None

    # ------------------------------------------------------------------
    # Column normalisation
    # The new dataset uses title-case column names and a "Holiday/Promotion"
    # column with a slash. We normalise everything once on load so the rest
    # of the pipeline can use the lowercase snake_case names the processor
    # and driver logic already expect.
    # ------------------------------------------------------------------
    COLUMN_MAP = {
        "Date":               "date",
        "Product_ID":         "product_id",
        "Product_Name":       "product_name",
        "Category":           "category",
        "Region":             "region",
        "Units_Sold":         "units_sold",
        "Units_Ordered":      "units_ordered",
        "Inventory_Level":    "inventory_level",
        "Price":              "price",
        "Discount":           "discount",
        "Competitor_Pricing": "competitor_pricing",
        "Holiday/Promotion":  "holiday_promotion",
        "Weather_Condition":  "weather_condition",
        "Seasonality":        "seasonality",
    }

    def _normalise_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """Rename dataset columns to snake_case expected by the rest of the pipeline."""
        return df.rename(columns=self.COLUMN_MAP)

    # ------------------------------------------------------------------
    # Data loading
    # ------------------------------------------------------------------
    def load_kaggle_dataset(self):
        """Load and preprocess the expanded dataset."""
        if not os.path.exists(self.kaggle_file):
            raise FileNotFoundError(
                f"Dataset not found at {self.kaggle_file}\n"
                f"Please place updated_kaggle_sales_data_expanded.csv in the {self.data_path}/ folder"
            )

        print(f"[LOAD] Loading dataset from: {self.kaggle_file}")
        df = pd.read_csv(self.kaggle_file)

        # Normalise column names first, then hand off to the processor
        df = self._normalise_columns(df)
        df["date"] = pd.to_datetime(df["date"])

        # Derive a revenue column (Price × Units_Sold) so downstream
        # code that uses df['revenue'] continues to work
        df["revenue"] = df["price"] * df["units_sold"]

        # Pass to processor for any additional cleaning
        df = self.processor.clean_data(df)

        print(f"   [OK] Loaded {len(df):,} rows")
        print(f"   Date range : {df['date'].min().date()} → {df['date'].max().date()}")
        print(f"   Products   : {df['product_id'].nunique()}")
        print(f"   Regions    : {sorted(df['region'].unique())}")
        print(f"   (Training per-product, aggregated across all regions)")

        self.kaggle_data = df
        return df

    # ------------------------------------------------------------------
    # Product enumeration
    # ------------------------------------------------------------------
    def get_products(self):
        """Return all unique product IDs."""
        return self.kaggle_data["product_id"].unique().tolist()

    # ------------------------------------------------------------------
    # Per-product aggregation
    # ------------------------------------------------------------------
    def fetch_sales_data(self, product_id):
        """
        Get daily sales for one product aggregated across all regions.

        The new dataset has one row per (date, product, region) so we
        sum numeric columns and take the first value for static ones.
        """
        mask = self.kaggle_data["product_id"] == product_id
        product_df = self.kaggle_data[mask].copy()

        agg_numeric = {
            "units_sold":         "sum",
            "units_ordered":      "sum",
            "revenue":            "sum",
            "inventory_level":    "mean",
            "discount":           "mean",
            "competitor_pricing": "mean",
            "holiday_promotion":  "max",   # 1 if any region had a holiday
        }

        # Keep one value for static / categorical columns
        agg_static = {
            "product_name":  "first",
            "category":      "first",
            "price":         "first",
            "weather_condition": lambda s: s.mode()[0],   # most common weather that day
            "seasonality":       "first",
        }

        df_daily = (
            product_df
            .groupby("date")
            .agg({**agg_numeric, **agg_static})
            .reset_index()
            .sort_values("date")
        )

        return df_daily

    # ------------------------------------------------------------------
    # Prophet
    # ------------------------------------------------------------------
    def prepare_prophet_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prepare a (ds, y) DataFrame for Prophet."""
        sales_col = "units_sold" if "units_sold" in df.columns else "quantity"
        prophet_df = pd.DataFrame({
            "ds": pd.to_datetime(df["date"]),
            "y":  df[sales_col],
        }).dropna()
        return prophet_df

    def train_prophet_model(self, df: pd.DataFrame) -> Prophet:
        """Train a Prophet model on the prepared (ds, y) frame."""
        model = Prophet(
            seasonality_mode="multiplicative",
            changepoint_prior_scale=0.05,
            daily_seasonality=True,
            weekly_seasonality=True,
            yearly_seasonality=True,   # We now have 4+ years of data
        )
        model.fit(df)
        return model

    # ------------------------------------------------------------------
    # XGBoost
    # ------------------------------------------------------------------
    def train_xgboost_model(self, df: pd.DataFrame):
        """Train XGBoost model with full feature engineering."""
        import xgboost as xgb

        df = self.processor.engineer_features(df)

        feature_cols = [
            "day_of_week", "day_of_month", "month", "week_of_year", "is_weekend",
            "holiday_promotion", "discount", "price", "inventory_level",
            "competitor_pricing",                          # new feature in expanded dataset
            "lag_1", "lag_7", "lag_14",
            "rolling_mean_7", "rolling_std_7", "rolling_mean_30",
        ]

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

        return model, available_features

    # ------------------------------------------------------------------
    # Persistence helpers
    # ------------------------------------------------------------------
    def save_model(self, model, product_id, model_type: str = "prophet") -> str:
        filename = f"{self.model_path}/{product_id}_{model_type}.pkl"
        with open(filename, "wb") as f:
            pickle.dump(model, f)
        return filename

    def save_metadata(
        self,
        product_id,
        feature_names: list,
        drivers: list = None,
        avg_price: float = None,
        sample_data: pd.DataFrame = None,
        product_name: str = None,
        category: str = None,
    ) -> str:
        metadata = {
            "feature_names": feature_names,
            "drivers":       drivers or [],
            "avg_price":     avg_price,
            "product_name":  product_name,
            "category":      category,
            "sample_data":   sample_data.to_dict("records") if sample_data is not None else None,
            "trained_at":    datetime.now().isoformat(),
        }
        filename = f"{self.model_path}/{product_id}_metadata.pkl"
        with open(filename, "wb") as f:
            pickle.dump(metadata, f)
        return filename

    # ------------------------------------------------------------------
    # Driver analysis
    # ------------------------------------------------------------------
    def calculate_drivers(self, df: pd.DataFrame) -> list:
        """Calculate forecast drivers from historical data."""
        df = df.copy()
        df["date"] = pd.to_datetime(df["date"])
        df["day_of_week"] = df["date"].dt.dayofweek

        sales_col = "units_sold" if "units_sold" in df.columns else "quantity"
        drivers = []

        # 1. PROMOTION / HOLIDAY IMPACT
        if "holiday_promotion" in df.columns:
            promo     = df[df["holiday_promotion"] == 1][sales_col]
            non_promo = df[df["holiday_promotion"] == 0][sales_col]
            if len(promo) > 0 and len(non_promo) > 0:
                impact = (promo.mean() - non_promo.mean()) / non_promo.mean()
                drivers.append({
                    "name":          "Promotions & Holidays",
                    "nameSi":        "ප්‍රවර්ධන සහ නිවාඩු",
                    "impact":        round(abs(impact), 2),
                    "description":   f'Sales {"increase" if impact > 0 else "decrease"} by {abs(int(impact*100))}% during promotions',
                    "descriptionSi": f'ප්‍රවර්ධන වලදී විකුණුම් {abs(int(impact*100))}% {"වැඩි වේ" if impact > 0 else "අඩු වේ"}',
                })

        # 2. WEEKEND EFFECT
        weekend_avg = df[df["day_of_week"].isin([5, 6])][sales_col].mean()
        weekday_avg = df[~df["day_of_week"].isin([5, 6])][sales_col].mean()
        if weekday_avg > 0:
            impact = (weekend_avg - weekday_avg) / weekday_avg
            if abs(impact) > 0.05:
                drivers.append({
                    "name":          "Day of Week Effect",
                    "nameSi":        "සතියේ දින බලපෑම",
                    "impact":        round(abs(impact), 2),
                    "description":   f'Weekend sales are {abs(int(impact*100))}% {"higher" if impact > 0 else "lower"}',
                    "descriptionSi": f'සති අන්ත විකුණුම් {abs(int(impact*100))}% {"වැඩි" if impact > 0 else "අඩු"}යි',
                })

        # 3. DISCOUNT IMPACT
        if "discount" in df.columns:
            median_disc  = df["discount"].median()
            high_disc    = df[df["discount"] >  median_disc][sales_col]
            low_disc     = df[df["discount"] <= median_disc][sales_col]
            if len(high_disc) > 0 and len(low_disc) > 0 and low_disc.mean() > 0:
                impact = (high_disc.mean() - low_disc.mean()) / low_disc.mean()
                drivers.append({
                    "name":          "Discount Effect",
                    "nameSi":        "වට්ටම් බලපෑම",
                    "impact":        round(abs(impact), 2),
                    "description":   f'Higher discounts boost sales by {abs(int(impact*100))}%',
                    "descriptionSi": f'ඉහළ වට්ටම් මගින් විකුණුම් {abs(int(impact*100))}% වැඩි කරයි',
                })

        # 4. WEATHER IMPACT  (new — enabled by expanded dataset)
        if "weather_condition" in df.columns:
            weather_avg = df.groupby("weather_condition")[sales_col].mean()
            overall_avg = df[sales_col].mean()
            best_weather = weather_avg.idxmax()
            worst_weather = weather_avg.idxmin()
            if overall_avg > 0:
                impact = (weather_avg.max() - weather_avg.min()) / overall_avg
                if abs(impact) > 0.05:
                    drivers.append({
                        "name":          "Weather Impact",
                        "nameSi":        "කාලගුණ බලපෑම",
                        "impact":        round(abs(impact), 2),
                        "description":   f'Sales peak in {best_weather} weather, dip in {worst_weather}',
                        "descriptionSi": f'{best_weather} කාලගුණයේදී විකුණුම් ඉහළ යයි',
                    })

        # 5. SEASONALITY IMPACT  (new — enabled by expanded dataset)
        if "seasonality" in df.columns:
            season_avg  = df.groupby("seasonality")[sales_col].mean()
            overall_avg = df[sales_col].mean()
            if overall_avg > 0 and len(season_avg) > 1:
                impact = (season_avg.max() - season_avg.min()) / overall_avg
                if abs(impact) > 0.05:
                    best_season = season_avg.idxmax()
                    drivers.append({
                        "name":          "Seasonal Trends",
                        "nameSi":        "සෘතු ප්‍රවණතා",
                        "impact":        round(abs(impact), 2),
                        "description":   f'Sales peak in {best_season}; seasonal swing of {abs(int(impact*100))}%',
                        "descriptionSi": f'{best_season} කාලයේ විකුණුම් ඉහළ යයි',
                    })

        # 6. COMPETITOR PRICING IMPACT  (new — enabled by expanded dataset)
        if "competitor_pricing" in df.columns:
            df["price_gap"] = df["price"] - df["competitor_pricing"]
            cheaper_mask = df["price_gap"] < 0   # our price is lower
            if cheaper_mask.sum() > 0 and (~cheaper_mask).sum() > 0:
                cheaper_avg   = df[cheaper_mask][sales_col].mean()
                expensive_avg = df[~cheaper_mask][sales_col].mean()
                if expensive_avg > 0:
                    impact = (cheaper_avg - expensive_avg) / expensive_avg
                    if abs(impact) > 0.03:
                        drivers.append({
                            "name":          "Competitor Pricing",
                            "nameSi":        "තරඟකාරී මිල ගණන්",
                            "impact":        round(abs(impact), 2),
                            "description":   f'Sales are {abs(int(impact*100))}% {"higher" if impact > 0 else "lower"} when priced below competitors',
                            "descriptionSi": f'තරඟකරුවන්ට වඩා අඩු මිලකදී විකුණුම් {abs(int(impact*100))}% {"වැඩිය" if impact > 0 else "අඩුය"}',
                        })

        drivers.sort(key=lambda x: x["impact"], reverse=True)
        return drivers[:5]

    # ------------------------------------------------------------------
    # Main training loop
    # ------------------------------------------------------------------
    def train_all_models(self):
        """Train Prophet + XGBoost models for all products."""
        print("\n[START] Starting Model Training...")
        print("=" * 60)

        self.load_kaggle_dataset()

        products = self.get_products()
        print(f"\n[DATA] Found {len(products)} unique products")

        trained_count = 0
        skipped_count = 0

        for product_id in products:
            try:
                # Lookup display name for logging
                name_series = self.kaggle_data.loc[
                    self.kaggle_data["product_id"] == product_id, "product_name"
                ]
                product_name = name_series.iloc[0] if len(name_series) else str(product_id)
                category_series = self.kaggle_data.loc[
                    self.kaggle_data["product_id"] == product_id, "category"
                ]
                category = category_series.iloc[0] if len(category_series) else ""

                print(f"\n[TRAIN] {product_id} — {product_name} ({category})")

                # Aggregate across all regions into daily totals
                sales_data = self.fetch_sales_data(product_id)

                if len(sales_data) < 30:
                    print(f"   [SKIP] Only {len(sales_data)} days — need ≥30")
                    skipped_count += 1
                    continue

                print(f"   {len(sales_data)} days of aggregated data")

                # --- Prophet ---
                prophet_data  = self.prepare_prophet_data(sales_data)
                prophet_model = self.train_prophet_model(prophet_data)
                prophet_file  = self.save_model(prophet_model, product_id, "prophet")
                print(f"   [OK] Prophet  → {prophet_file}")

                # --- XGBoost ---
                df_engineered = self.processor.engineer_features(sales_data)
                xgb_model, feature_names = self.train_xgboost_model(sales_data)
                xgb_file = self.save_model(xgb_model, product_id, "xgboost")
                print(f"   [OK] XGBoost  → {xgb_file}")

                # --- Drivers & metadata ---
                drivers  = self.calculate_drivers(sales_data)
                sales_col = "units_sold" if "units_sold" in sales_data.columns else "quantity"
                avg_price = (
                    sales_data["revenue"].sum() / sales_data[sales_col].sum()
                    if sales_data[sales_col].sum() > 0
                    else sales_data["price"].mean()
                )

                sample_data = df_engineered[feature_names].tail(30)
                meta_file = self.save_metadata(
                    product_id, feature_names, drivers, avg_price,
                    sample_data, product_name, category,
                )
                print(f"   [OK] Metadata → {meta_file}")
                print(f"        Drivers: {len(drivers)}, Avg price: {avg_price:.2f}, "
                      f"Sample rows: {len(sample_data)}")

                trained_count += 1

            except Exception as exc:
                import traceback
                print(f"   [ERROR] {product_id}: {exc}")
                print(f"   {traceback.format_exc()}")
                skipped_count += 1

        print("\n" + "=" * 60)
        print(f"[DONE] Training complete!")
        print(f"   Trained : {trained_count}")
        print(f"   Skipped : {skipped_count}")
        print(f"   Models  : {self.model_path}/")
        print("=" * 60 + "\n")


def main():
    trainer = ModelTrainer()
    trainer.train_all_models()


if __name__ == "__main__":
    main()