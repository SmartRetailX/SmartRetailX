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
        
        # Your CSV columns after normalization:
        # date, store_id, product_id, category, region, inventory_level,
        # units_sold, units_ordered, price, discount, weather_condition,
        # holiday_promotion, competitor_pricing, seasonality
        
        # All columns already match expected names! No mapping needed.
        
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
                df[col] = df[col].fillna(df[col].mode()[0] if len(df[col].mode()) > 0 else 'Unknown')
        
        return df
    
    @staticmethod
    def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
        """
        Create features for ML models using ALL available data
        """
        df = df.copy()
        
        # ========== DATE FEATURES ==========
        df['year'] = df['date'].dt.year
        df['month'] = df['date'].dt.month
        df['day'] = df['date'].dt.day
        df['day_of_week'] = df['date'].dt.dayofweek
        df['week_of_year'] = df['date'].dt.isocalendar().week
        df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
        df['is_month_start'] = df['date'].dt.is_month_start.astype(int)
        df['is_month_end'] = df['date'].dt.is_month_end.astype(int)
        
        # ========== PROMOTION & HOLIDAY FEATURES ==========
        # Already have holiday_promotion column from dataset
        
        # ========== WEATHER ENCODING ==========
        if 'weather_condition' in df.columns:
            df['weather_sunny'] = (df['weather_condition'] == 'Sunny').astype(int)
            df['weather_rainy'] = (df['weather_condition'] == 'Rainy').astype(int)
            df['weather_cloudy'] = (df['weather_condition'] == 'Cloudy').astype(int)
        
        # ========== SEASONALITY ENCODING ==========
        if 'seasonality' in df.columns:
            df['season_spring'] = (df['seasonality'] == 'Spring').astype(int)
            df['season_summer'] = (df['seasonality'] == 'Summer').astype(int)
            df['season_autumn'] = (df['seasonality'] == 'Autumn').astype(int)
            df['season_winter'] = (df['seasonality'] == 'Winter').astype(int)
        
        # ========== PRICING FEATURES ==========
        if 'discount' in df.columns and 'price' in df.columns:
            df['discounted_price'] = df['price'] * (1 - df['discount'] / 100)
            df['discount_amount'] = df['price'] * (df['discount'] / 100)
        
        if 'competitor_pricing' in df.columns and 'price' in df.columns:
            df['price_vs_competitor'] = df['price'] - df['competitor_pricing']
            df['price_competitiveness'] = df['price'] / (df['competitor_pricing'] + 0.01)
        
        # ========== INVENTORY FEATURES ==========
        if 'inventory_level' in df.columns:
            df['low_inventory'] = (df['inventory_level'] < df['inventory_level'].quantile(0.25)).astype(int)
            df['high_inventory'] = (df['inventory_level'] > df['inventory_level'].quantile(0.75)).astype(int)
        
        return df
        
    @staticmethod
    def aggregate_daily(df: pd.DataFrame, product_id: str, store_id: str) -> pd.DataFrame:
        """
        Aggregate sales by day for a specific product/store
        """
        filtered = df[
            (df['product_id'] == product_id) & 
            (df['store_id'] == store_id)
        ].copy()
        
        # Calculate revenue if not present
        if 'revenue' not in filtered.columns and 'price' in filtered.columns and 'units_sold' in filtered.columns:
            filtered['revenue'] = filtered['price'] * filtered['units_sold']
        
        # Rename for consistency
        if 'units_sold' in filtered.columns:
            filtered['quantity'] = filtered['units_sold']
        
        # Aggregate with all relevant columns
        agg_dict = {
            'quantity': 'sum'
        }
        
        if 'revenue' in filtered.columns:
            agg_dict['revenue'] = 'sum'
        
        # Include other metrics if available
        for col in ['discount', 'holiday_promotion', 'weather_condition', 'seasonality', 
                    'inventory_level', 'price', 'competitor_pricing']:
            if col in filtered.columns:
                agg_dict[col] = 'mean' if col in ['discount', 'inventory_level', 'price', 'competitor_pricing'] else 'first'
        
        daily = filtered.groupby('date').agg(agg_dict).reset_index()
        
        # Check if we have any data
        if len(daily) == 0:
            return daily  # Return empty dataframe
        
        # Fill missing dates
        date_range = pd.date_range(
            start=daily['date'].min(),
            end=daily['date'].max(),
            freq='D'
        )
        daily = daily.set_index('date').reindex(date_range).reset_index()
        daily['date'] = daily['index'] if 'index' in daily.columns else daily['date']
        daily = daily.drop(columns=['index'], errors='ignore')
        
        # Forward fill categorical features
        categorical_cols = ['weather_condition', 'seasonality']
        for col in categorical_cols:
            if col in daily.columns:
                daily[col] = daily[col].replace(0, np.nan).ffill()
        
        return daily
    
    @staticmethod
    def split_train_test(df: pd.DataFrame, test_size: float = 0.2):
        """
        Split data into train and test sets
        """
        split_idx = int(len(df) * (1 - test_size))
        train = df.iloc[:split_idx]
        test = df.iloc[split_idx:]
        return train, test


# Example usage
if __name__ == "__main__":
    # Load your Kaggle dataset
    processor = DataProcessor()
    
    # df = processor.load_kaggle_data('./data/kaggle_sales_data.csv')
    # df_clean = processor.clean_data(df)
    # df_features = processor.engineer_features(df_clean)
    
    print("Data processor ready! Place your Kaggle CSV in ml-service/data/")
