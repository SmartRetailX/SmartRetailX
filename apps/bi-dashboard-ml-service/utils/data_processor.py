"""
Data processing utilities for Kaggle dataset
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta


class DataProcessor:
    """
    Process Kaggle retail dataset for ML model training

    Dataset columns:
    - Date, Store ID, Product ID, Category, Region
    - Inventory Level, Units Sold, Units Ordered, Demand Forecast
    - Price, Discount, Weather Condition, Holiday/Promotion
    - Competitor Pricing, Seasonality
    """

    @staticmethod
    def load_kaggle_data(file_path: str) -> pd.DataFrame:
        """
        Load and validate Kaggle CSV file

        Expected columns:
        - Date: Transaction date
        - Store ID: Store identifier
        - Product ID: Product identifier
        - Units Sold: Quantity sold (target variable)
        - Price: Product price
        - Discount: Discount percentage
        - Holiday/Promotion: Binary flag (0/1)
        - Weather Condition: Weather type
        - Seasonality: Season (Spring/Summer/Autumn/Winter)
        - Category: Product category
        - Region: Store region
        - Inventory Level: Current stock
        - Competitor Pricing: Competitor prices
        """
        df = pd.read_csv(file_path)

        # Normalize column names to snake_case
        df.columns = df.columns.str.lower().str.replace(' ', '_').str.replace('/', '_')

        # All columns already match expected names after normalization.
        return df

    @staticmethod
    def clean_data(df: pd.DataFrame) -> pd.DataFrame:
        """
        Clean and prepare data
        """
        df = df.copy()

        # Remove duplicates
        df = df.drop_duplicates()

        # Convert date to datetime
        df['date'] = pd.to_datetime(df['date'])

        # Handle missing values
        df = df.dropna(subset=['date', 'units_sold'])

        # Fill missing numeric values
        numeric_cols = ['inventory_level', 'units_ordered',
                        'price', 'discount', 'competitor_pricing']
        for col in numeric_cols:
            if col in df.columns:
                df[col] = df[col].fillna(df[col].median())

        # Fill missing categorical values
        categorical_cols = ['weather_condition', 'holiday_promotion', 'seasonality']
        for col in categorical_cols:
            if col in df.columns:
                df[col] = df[col].fillna(
                    df[col].mode()[0] if len(df[col].mode()) > 0 else 'Unknown'
                )

        return df

    @staticmethod
    def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
        """
        Create features for ML models using ALL available data.

        Produces every feature expected by the XGBoost models in
        forecast_service.py and train_models.py:
          - Date features  : year, month, day, day_of_week, day_of_month,
                             week_of_year, is_weekend, is_month_start, is_month_end
          - Lag features   : lag_1, lag_7, lag_14
          - Rolling stats  : rolling_mean_7, rolling_std_7, rolling_mean_30
          - Weather dummies: weather_sunny, weather_rainy, weather_cloudy,
                             weather_snowy   ← expanded dataset
          - Season dummies : season_spring, season_summer, season_autumn, season_winter
          - Pricing        : discounted_price, discount_amount,
                             price_vs_competitor, price_competitiveness
          - Inventory flags: low_inventory, high_inventory
        """
        df = df.copy()
        df['date'] = pd.to_datetime(df['date'])

        # Sort so lag/rolling windows are computed in chronological order
        df = df.sort_values('date').reset_index(drop=True)

        # ── DATE FEATURES ──────────────────────────────────────────────
        df['year']          = df['date'].dt.year
        df['month']         = df['date'].dt.month
        df['day']           = df['date'].dt.day
        df['day_of_month']  = df['date'].dt.day          # alias used by XGBoost feature list
        df['day_of_week']   = df['date'].dt.dayofweek
        df['week_of_year']  = df['date'].dt.isocalendar().week.astype(int)
        df['is_weekend']    = df['day_of_week'].isin([5, 6]).astype(int)
        df['is_month_start'] = df['date'].dt.is_month_start.astype(int)
        df['is_month_end']   = df['date'].dt.is_month_end.astype(int)

        # ── LAG & ROLLING FEATURES ─────────────────────────────────────
        # Resolve the sales column name (aggregated daily frames use
        # 'units_sold'; some legacy frames use 'quantity').
        sales_col = 'units_sold' if 'units_sold' in df.columns else 'quantity'

        df['lag_1']           = df[sales_col].shift(1)
        df['lag_7']           = df[sales_col].shift(7)
        df['lag_14']          = df[sales_col].shift(14)
        df['rolling_mean_7']  = df[sales_col].shift(1).rolling(window=7,  min_periods=1).mean()
        df['rolling_std_7']   = df[sales_col].shift(1).rolling(window=7,  min_periods=1).std().fillna(0)
        df['rolling_mean_30'] = df[sales_col].shift(1).rolling(window=30, min_periods=1).mean()

        # ── PROMOTION & HOLIDAY ────────────────────────────────────────
        # holiday_promotion already present from dataset; no extra encoding needed.

        # ── WEATHER ENCODING ───────────────────────────────────────────
        if 'weather_condition' in df.columns:
            df['weather_sunny']  = (df['weather_condition'] == 'Sunny').astype(int)
            df['weather_rainy']  = (df['weather_condition'] == 'Rainy').astype(int)
            df['weather_cloudy'] = (df['weather_condition'] == 'Cloudy').astype(int)
            df['weather_snowy']  = (df['weather_condition'] == 'Snowy').astype(int)  # expanded dataset

        # ── SEASONALITY ENCODING ───────────────────────────────────────
        if 'seasonality' in df.columns:
            df['season_spring'] = (df['seasonality'] == 'Spring').astype(int)
            df['season_summer'] = (df['seasonality'] == 'Summer').astype(int)
            df['season_autumn'] = (df['seasonality'] == 'Autumn').astype(int)
            df['season_winter'] = (df['seasonality'] == 'Winter').astype(int)

        # ── PRICING FEATURES ───────────────────────────────────────────
        if 'discount' in df.columns and 'price' in df.columns:
            df['discounted_price'] = df['price'] * (1 - df['discount'] / 100)
            df['discount_amount']  = df['price'] * (df['discount'] / 100)

        if 'competitor_pricing' in df.columns and 'price' in df.columns:
            df['price_vs_competitor']  = df['price'] - df['competitor_pricing']
            df['price_competitiveness'] = df['price'] / (df['competitor_pricing'] + 0.01)

        # ── INVENTORY FLAGS ────────────────────────────────────────────
        if 'inventory_level' in df.columns:
            q25 = df['inventory_level'].quantile(0.25)
            q75 = df['inventory_level'].quantile(0.75)
            df['low_inventory']  = (df['inventory_level'] < q25).astype(int)
            df['high_inventory'] = (df['inventory_level'] > q75).astype(int)

        return df

    @staticmethod
    def aggregate_daily(df: pd.DataFrame, product_id: str) -> pd.DataFrame:
        """
        Aggregate sales by day for a specific product, across all stores/regions.

        Fixes vs. original:
        - Date reindex now correctly preserves the 'date' column instead of
          creating a stray 'index' column.
        - Categorical ffill uses pd.isna() rather than replacing 0 with NaN
          (0 is a valid value for holiday_promotion).
        """
        filtered = df[df['product_id'] == product_id].copy()

        # Calculate revenue if not present
        if ('revenue' not in filtered.columns
                and 'price' in filtered.columns
                and 'units_sold' in filtered.columns):
            filtered['revenue'] = filtered['price'] * filtered['units_sold']

        # Unified sales column name
        if 'units_sold' in filtered.columns:
            filtered['quantity'] = filtered['units_sold']

        agg_dict: dict = {'quantity': 'sum'}

        if 'revenue' in filtered.columns:
            agg_dict['revenue'] = 'sum'

        # Include contextual metrics when available
        for col in ['discount', 'holiday_promotion', 'weather_condition',
                    'seasonality', 'inventory_level', 'price', 'competitor_pricing']:
            if col in filtered.columns:
                agg_dict[col] = (
                    'mean'  if col in ['discount', 'inventory_level', 'price', 'competitor_pricing']
                    else 'first'
                )

        daily = filtered.groupby('date').agg(agg_dict).reset_index()

        if len(daily) == 0:
            return daily

        # Re-index to fill gaps in the date range
        full_range = pd.date_range(start=daily['date'].min(),
                                   end=daily['date'].max(),
                                   freq='D')
        daily = (
            daily
            .set_index('date')
            .reindex(full_range)             # index is now the full date range
            .rename_axis('date')             # give the index back its name
            .reset_index()                   # promote it to a column — no stray 'index' col
        )

        # Fill numeric gaps
        if 'quantity' in daily.columns:
            daily['quantity'] = daily['quantity'].fillna(0)

        # Forward-fill categorical features (use pd.isna, not ==0 replacement)
        for col in ['weather_condition', 'seasonality']:
            if col in daily.columns:
                daily[col] = daily[col].ffill()

        return daily

    @staticmethod
    def split_train_test(df: pd.DataFrame, test_size: float = 0.2):
        """
        Split data into train and test sets (time-ordered).
        """
        split_idx = int(len(df) * (1 - test_size))
        train = df.iloc[:split_idx]
        test  = df.iloc[split_idx:]
        return train, test


# Example usage
if __name__ == "__main__":
    processor = DataProcessor()
    # df = processor.load_kaggle_data('./data/kaggle_sales_data.csv')
    # df_clean = processor.clean_data(df)
    # df_features = processor.engineer_features(df_clean)
    print("Data processor ready! Place your Kaggle CSV in ml-service/data/")