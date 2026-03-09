"""
Train Prophet models for all product-store combinations using Kaggle dataset
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
        self.kaggle_file = os.path.join(self.data_path, "kaggle_sales_data_realistic.csv")
        
        # Create models directory
        os.makedirs(self.model_path, exist_ok=True)
        
        # Load and process Kaggle dataset
        self.processor = DataProcessor()
        self.kaggle_data = None
        
    def load_kaggle_dataset(self):
        """Load and preprocess Kaggle dataset"""
        if not os.path.exists(self.kaggle_file):
            raise FileNotFoundError(
                f"Kaggle dataset not found at {self.kaggle_file}\n"
                f"Please place your kaggle_sales_data_realistic.csv in the {self.data_path}/ folder"
            )
        
        print(f"[LOAD] Loading Kaggle dataset from: {self.kaggle_file}")
        df = self.processor.load_kaggle_data(self.kaggle_file)
        df = self.processor.clean_data(df)
        
        print(f"   [OK] Loaded {len(df)} rows")
        print(f"   [EMOJI] Date range: {df['date'].min()} to {df['date'].max()}")
        print(f"   [EMOJI] Products: {df['product_id'].nunique()}")
        print(f"   [EMOJI] (Training per-product, aggregated across all stores)")
        
        self.kaggle_data = df
        return df
    
    def get_products(self):
        """Get all unique products from Kaggle dataset (aggregated across all stores)"""
        products = self.kaggle_data['product_id'].drop_duplicates()
        return products.tolist()
    
    def fetch_sales_data(self, product_id: str):
        """Get sales data for specific product, aggregated across all stores"""
        df_daily = self.processor.aggregate_daily(
            self.kaggle_data, 
            product_id
        )
        return df_daily
    
    def prepare_prophet_data(self, df: pd.DataFrame):
        """Prepare data for Prophet"""
        # Handle both 'quantity' and 'units_sold' column names
        sales_col = 'quantity' if 'quantity' in df.columns else 'units_sold'
        
        prophet_df = pd.DataFrame({
            'ds': pd.to_datetime(df['date']),
            'y': df[sales_col]
        })
        
        # Remove any rows with NaN in target
        prophet_df = prophet_df.dropna()
        
        return prophet_df
    
    def train_prophet_model(self, df: pd.DataFrame):
        """Train Prophet model"""
        model = Prophet(
            seasonality_mode='multiplicative',
            changepoint_prior_scale=0.05,
            daily_seasonality=True,
            weekly_seasonality=True,
            yearly_seasonality=False,  # Not enough data for yearly
        )
        model.fit(df)
        return model
    
    def train_xgboost_model(self, df: pd.DataFrame):
        """Train XGBoost model with full feature engineering"""
        import xgboost as xgb
        
        # Engineer features
        df = self.processor.engineer_features(df)
        
        # Select features
        feature_cols = [
            'day_of_week', 'day_of_month', 'month', 'week_of_year', 'is_weekend',
            'holiday_promotion', 'discount', 'price', 'inventory_level',
            'lag_1', 'lag_7', 'lag_14', 'rolling_mean_7', 'rolling_std_7', 'rolling_mean_30'
        ]
        
        weather_features = ['weather_sunny', 'weather_rainy', 'weather_cloudy']
        season_features = ['season_spring', 'season_summer', 'season_autumn', 'season_winter']
        
        available_features = []
        for col in feature_cols + weather_features + season_features:
            if col in df.columns:
                available_features.append(col)
        
        X = df[available_features]
        y = df['quantity'] if 'quantity' in df.columns else df['units_sold']
        
        model = xgb.XGBRegressor(
            n_estimators=150,
            max_depth=6,
            learning_rate=0.1,
            random_state=42,
            importance_type='gain'
        )
        model.fit(X, y)
        
        return model, available_features
    
    def save_model(self, model, product_id: str, model_type: str = 'prophet'):
        """Save trained model to disk"""
        filename = f"{self.model_path}/{product_id}_{model_type}.pkl"
        with open(filename, 'wb') as f:
            pickle.dump(model, f)
        return filename
    
    def save_metadata(self, product_id: str, feature_names: list, drivers: list = None, avg_price: float = None, sample_data: pd.DataFrame = None):
        """Save model metadata (feature names, drivers, price, sample data for SHAP)"""
        metadata = {
            'feature_names': feature_names,
            'drivers': drivers or [],
            'avg_price': avg_price,
            'sample_data': sample_data.to_dict('records') if sample_data is not None else None,
            'trained_at': datetime.now().isoformat()
        }
        filename = f"{self.model_path}/{product_id}_metadata.pkl"
        with open(filename, 'wb') as f:
            pickle.dump(metadata, f)
        return filename
    
    def calculate_drivers(self, df: pd.DataFrame) -> list:
        """Calculate forecast drivers from historical data"""
        df = df.copy()
        df['date'] = pd.to_datetime(df['date'])
        df['day_of_week'] = df['date'].dt.dayofweek
        
        sales_col = 'quantity' if 'quantity' in df.columns else 'units_sold'
        drivers = []
        
        # 1. PROMOTION/HOLIDAY IMPACT
        if 'holiday_promotion' in df.columns:
            promo_days = df[df['holiday_promotion'] == 1]
            non_promo_days = df[df['holiday_promotion'] == 0]
            
            if len(promo_days) > 0 and len(non_promo_days) > 0:
                promo_avg = promo_days[sales_col].mean()
                non_promo_avg = non_promo_days[sales_col].mean()
                promo_impact = (promo_avg - non_promo_avg) / non_promo_avg if non_promo_avg > 0 else 0
                
                drivers.append({
                    'name': 'Promotions & Holidays',
                    'nameSi': 'ප්‍රවර්ධන සහ නිවාඩු',
                    'impact': round(abs(promo_impact), 2),
                    'description': f'Sales {"increase" if promo_impact > 0 else "decrease"} by {abs(int(promo_impact*100))}% during promotions',
                    'descriptionSi': f'ප්‍රවර්ධන වලදී විකුණුම් {abs(int(promo_impact*100))}% {"වැඩි වේ" if promo_impact > 0 else "අඩු වේ"}'
                })
        
        # 2. WEEKEND EFFECT
        weekend_avg = df[df['day_of_week'].isin([5, 6])][sales_col].mean()
        weekday_avg = df[~df['day_of_week'].isin([5, 6])][sales_col].mean()
        weekend_impact = (weekend_avg - weekday_avg) / weekday_avg if weekday_avg > 0 else 0
        
        if abs(weekend_impact) > 0.05:
            drivers.append({
                'name': 'Day of Week Effect',
                'nameSi': 'සතියේ දින බලපෑම',
                'impact': round(abs(weekend_impact), 2),
                'description': f'Weekend sales are {abs(int(weekend_impact*100))}% {"higher" if weekend_impact > 0 else "lower"}',
                'descriptionSi': f'සති අන්ත විකුණුම් {abs(int(weekend_impact*100))}% {"වැඩි" if weekend_impact > 0 else "අඩු"}යි'
            })
        
        # 3. DISCOUNT IMPACT
        if 'discount' in df.columns:
            high_discount = df[df['discount'] > df['discount'].median()]
            low_discount = df[df['discount'] <= df['discount'].median()]
            
            if len(high_discount) > 0 and len(low_discount) > 0:
                discount_impact = (high_discount[sales_col].mean() - low_discount[sales_col].mean()) / low_discount[sales_col].mean()
                
                drivers.append({
                    'name': 'Discount Effect',
                    'nameSi': 'වට්ටම් බලපෑම',
                    'impact': round(abs(discount_impact), 2),
                    'description': f'Higher discounts boost sales by {abs(int(discount_impact*100))}%',
                    'descriptionSi': f'ඉහළ වට්ටම් මගින් විකුණුම් {abs(int(discount_impact*100))}% වැඩි කරයි'
                })
        
        # Sort by impact
        drivers.sort(key=lambda x: x['impact'], reverse=True)
        return drivers[:5]  # Top 5 drivers
    
    def train_all_models(self):
        """Train models for all products (aggregated across all stores)"""
        print("\n[EMOJI] Starting Model Training...")
        print("=" * 60)
        
        # Load Kaggle dataset
        self.load_kaggle_dataset()
        
        # Get all unique products
        products = self.get_products()
        print(f"\n[DATA] Found {len(products)} unique products (training aggregated across all stores)")
        
        trained_count = 0
        skipped_count = 0
        
        for product_id in products:
            try:
                print(f"\n[EMOJI] Training: {product_id} (all stores aggregated)...")
                
                # Fetch sales data aggregated across all stores
                sales_data = self.fetch_sales_data(product_id)
                
                if len(sales_data) < 30:
                    print(f"   [WARN]  Skipped: Only {len(sales_data)} days of data (need at least 30 for feature engineering)")
                    skipped_count += 1
                    continue
                
                print(f"   [EMOJI] Found {len(sales_data)} days of sales data")
                
                # 1. Train Prophet model
                prophet_data = self.prepare_prophet_data(sales_data)
                prophet_model = self.train_prophet_model(prophet_data)
                prophet_file = self.save_model(prophet_model, product_id, 'prophet')
                print(f"   [OK] Prophet model saved: {prophet_file}")
                
                # 2. Train XGBoost model for XAI (and engineer features)
                df_engineered = self.processor.engineer_features(sales_data)
                xgb_model, feature_names = self.train_xgboost_model(sales_data)
                xgb_file = self.save_model(xgb_model, product_id, 'xgboost')
                print(f"   [OK] XGBoost model saved: {xgb_file}")
                
                # 3. Calculate drivers and average price
                drivers = self.calculate_drivers(sales_data)
                sales_col = 'quantity' if 'quantity' in sales_data.columns else 'units_sold'
                avg_price = sales_data['revenue'].sum() / sales_data[sales_col].sum()
                
                # 4. Save last 30 rows of engineered data for SHAP (instead of re-loading CSV)
                sample_data = df_engineered[feature_names].tail(30)
                
                # 5. Save metadata with drivers, price, and sample data
                meta_file = self.save_metadata(product_id, feature_names, drivers, avg_price, sample_data)
                print(f"   [OK] Metadata saved: {meta_file}")
                print(f"   [DATA] Drivers: {len(drivers)}, Avg Price: ${avg_price:.2f}, Sample rows: {len(sample_data)}")
                
                trained_count += 1
                
            except Exception as e:
                import traceback
                print(f"   [ERROR] Error training {product_id}: {e}")
                print(f"   {traceback.format_exc()}")
                skipped_count += 1
        
        print("\n" + "=" * 60)
        print(f"[SUCCESS] Training Complete!")
        print(f"   [OK] Trained: {trained_count} models")
        print(f"   [WARN]  Skipped: {skipped_count} models")
        print(f"   [EMOJI] Models saved in: {self.model_path}/")
        print("=" * 60 + "\n")


def main():
    trainer = ModelTrainer()
    trainer.train_all_models()


if __name__ == "__main__":
    main()
