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

load_dotenv()


class ForecastService:
    def __init__(self):
        self.prophet_models = {}
        self.xgboost_models = {}
        self.model_path = os.getenv("MODEL_PATH", "./models")
        self.db_url = os.getenv("DATABASE_URL")
        
        # Remove schema parameter if present (psycopg2 doesn't support it)
        if self.db_url and "?schema=" in self.db_url:
            self.db_url = self.db_url.split("?schema=")[0]
        
        # Create engine with connection pooling and auto-reconnect
        if self.db_url:
            self.engine = create_engine(
                self.db_url,
                pool_pre_ping=True,
                pool_recycle=3600,
                pool_size=5,
                max_overflow=10
            )
        else:
            self.engine = None
        
        # Create models directory if not exists
        os.makedirs(self.model_path, exist_ok=True)
    
    def is_model_loaded(self) -> bool:
        """Check if any models are loaded"""
        return len(self.prophet_models) > 0 or len(self.xgboost_models) > 0
    
    def _prepare_prophet_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prepare data for Prophet (needs 'ds' and 'y' columns)"""
        # Handle both 'quantity' and 'units_sold' column names
        sales_col = 'quantity' if 'quantity' in df.columns else 'units_sold'
        prophet_df = df[['date', sales_col]].copy()
        prophet_df.columns = ['ds', 'y']
        return prophet_df
    
    def _train_prophet(self, df: pd.DataFrame) -> Prophet:
        """Train Prophet model"""
        model = Prophet(
            seasonality_mode='multiplicative',
            changepoint_prior_scale=0.05,
            daily_seasonality=True,
            weekly_seasonality=True,
            yearly_seasonality=False,
        )
        model.fit(df)
        return model
    
    def _engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Engineer features for XGBoost using ALL available data"""
        from utils.data_processor import DataProcessor
        processor = DataProcessor()
        
        df = df.copy()
        df['date'] = pd.to_datetime(df['date'])
        
        # Use DataProcessor to engineer all features
        df = processor.engineer_features(df)
        
        return df.dropna()
    
    def _train_xgboost(self, df: pd.DataFrame) -> xgb.XGBRegressor:
        """Train XGBoost model with ALL features"""
        # Select all numeric features
        feature_cols = [
            'day_of_week', 'day_of_month', 'month', 'week_of_year', 'is_weekend',
            'holiday_promotion', 'discount', 'price', 'inventory_level',
            'lag_1', 'lag_7', 'lag_14', 'rolling_mean_7', 'rolling_std_7', 'rolling_mean_30'
        ]
        
        # Add encoded weather features if available
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
        
        # Store feature names for SHAP later
        self.feature_names = available_features
        
        return model
    
    def load_model(self, product_id: str, store_id: str):
        """Load pre-trained Prophet model from disk"""
        model_file = f"{self.model_path}/{product_id}_{store_id}_prophet.pkl"
        
        if os.path.exists(model_file):
            print(f"[LOAD] Loading pre-trained model: {model_file}")
            with open(model_file, 'rb') as f:
                return pickle.load(f)
        else:
            print(f"[WARN]  No pre-trained model found for {product_id}_{store_id}")
            return None
    
    def save_model(self, model, product_id: str, store_id: str, model_type: str = 'prophet'):
        """Save trained model to disk"""
        filename = f"{self.model_path}/{product_id}_{store_id}_{model_type}.pkl"
        with open(filename, 'wb') as f:
            pickle.dump(model, f)
        print(f"[EMOJI] Saved {model_type} model: {filename}")
        return filename
    
    def save_model_metadata(self, product_id: str, store_id: str, feature_names: list, drivers: List[Dict[str, Any]] = None, avg_price: float = None):
        """Save feature names, drivers, and price for future predictions"""
        metadata = {
            'feature_names': feature_names,
            'drivers': drivers or [],
            'avg_price': avg_price,
            'trained_at': datetime.now().isoformat()
        }
        filename = f"{self.model_path}/{product_id}_{store_id}_metadata.pkl"
        with open(filename, 'wb') as f:
            pickle.dump(metadata, f)
        return filename
    
    def load_xgboost_model(self, product_id: str, store_id: str):
        """Load pre-trained XGBoost model from disk"""
        model_file = f"{self.model_path}/{product_id}_{store_id}_xgboost.pkl"
        
        if os.path.exists(model_file):
            print(f"[LOAD] Loading pre-trained XGBoost model: {model_file}")
            with open(model_file, 'rb') as f:
                return pickle.load(f)
        return None
    
    def load_model_metadata(self, product_id: str, store_id: str) -> Dict[str, Any]:
        """Load saved metadata (drivers, price, feature names)"""
        metadata_file = f"{self.model_path}/{product_id}_{store_id}_metadata.pkl"
        
        if os.path.exists(metadata_file):
            with open(metadata_file, 'rb') as f:
                return pickle.load(f)
        
        # Return defaults if no metadata
        return {
            'drivers': [],
            'avg_price': 10.0,
            'feature_names': [],
            'trained_at': None
        }
    
    async def predict(self, product_id: str, store_id: str, 
                     horizon: int = 30, lang: str = "en") -> Dict[str, Any]:
        """
        Generate forecast using PRE-TRAINED models (Prophet + XGBoost)
        Models should be trained via train_models.py script or /retrain endpoint
        """
        # Check cache first
        model_key = f"{product_id}_{store_id}"
        
        # Try to load Prophet model (check cache, then disk)
        if model_key in self.prophet_models:
            prophet_model = self.prophet_models[model_key]
            print(f"[OK] Using cached Prophet model for {model_key}")
        else:
            prophet_model = self.load_model(product_id, store_id)
            if prophet_model:
                self.prophet_models[model_key] = prophet_model
                print(f"[OK] Loaded and cached Prophet model for {model_key}")
        
        # If no pre-trained model exists, fail with clear error message
        if prophet_model is None:
            raise FileNotFoundError(
                f"[ERROR] No pre-trained model found for {product_id} in {store_id}.\n"
                f"Please run: cd ml-service && python train_models.py\n"
                f"This will train all models from the Kaggle dataset."
            )
        
        # Load saved metadata (drivers, price) - NO CSV loading!
        metadata = self.load_model_metadata(product_id, store_id)
        
        # Generate Prophet forecast
        future = prophet_model.make_future_dataframe(periods=horizon)
        prophet_forecast = prophet_model.predict(future)
        
        # Get only future predictions
        forecast_data = prophet_forecast.tail(horizon)
        
        # Format response using saved metadata (no CSV loading!)
        forecasts = []
        avg_price = metadata.get('avg_price', 10.0)
        
        for idx, row in forecast_data.iterrows():
            date = row['ds'].strftime('%Y-%m-%d')
            predicted_sales = max(0, row['yhat'])
            confidence_lower = max(0, row['yhat_lower'])
            confidence_upper = max(0, row['yhat_upper'])
            
            # Use price from metadata (saved during training)
            revenue = predicted_sales * avg_price
            
            forecasts.append({
                'date': date,
                'predictedSales': round(predicted_sales, 2),
                'confidenceLower': round(confidence_lower, 2),
                'confidenceUpper': round(confidence_upper, 2),
                'revenue': round(revenue, 2)
            })
        
        # Get drivers from metadata (calculated once during training)
        drivers = metadata.get('drivers', [])
        
        return {
            'productId': product_id,
            'storeId': store_id,
            'modelType': 'Prophet',
            'confidence': 0.87,
            'generatedAt': datetime.now().isoformat(),
            'forecasts': forecasts,
            'drivers': drivers
        }
    
    def _calculate_drivers(self, df: pd.DataFrame, lang: str) -> List[Dict[str, Any]]:
        """Calculate forecast drivers using actual data features"""
        df = df.copy()
        df['date'] = pd.to_datetime(df['date'])
        df['day_of_week'] = df['date'].dt.dayofweek
        
        # Handle both column names
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
        
        # 2. DISCOUNT IMPACT
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
        
        # 3. SEASONALITY IMPACT
        if 'seasonality' in df.columns:
            season_sales = df.groupby('seasonality')[sales_col].mean()
            if len(season_sales) > 1:
                max_season = season_sales.idxmax()
                min_season = season_sales.idxmin()
                seasonal_impact = (season_sales.max() - season_sales.min()) / season_sales.mean()
                
                drivers.append({
                    'name': 'Seasonal Patterns',
                    'nameSi': 'කාලීය රටා',
                    'impact': round(seasonal_impact, 2),
                    'description': f'{max_season} has highest sales, {min_season} has lowest',
                    'descriptionSi': f'{max_season} හි ඉහළම විකුණුම්, {min_season} හි අඩුම'
                })
        
        # 4. WEATHER IMPACT
        if 'weather_condition' in df.columns:
            weather_sales = df.groupby('weather_condition')[sales_col].mean()
            if len(weather_sales) > 1:
                best_weather = weather_sales.idxmax()
                weather_impact = (weather_sales.max() - weather_sales.min()) / weather_sales.mean()
                
                drivers.append({
                    'name': 'Weather Conditions',
                    'nameSi': 'කාලගුණ තත්ත්වය',
                    'impact': round(weather_impact, 2),
                    'description': f'{best_weather} weather drives higher sales',
                    'descriptionSi': f'{best_weather} කාලගුණය ඉහළ විකුණුම් ඇති කරයි'
                })
        
        # 5. WEEKEND EFFECT
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
        
        # 6. PRICE COMPETITIVENESS
        if 'price_vs_competitor' in df.columns:
            price_corr = df[['price_vs_competitor', sales_col]].corr().iloc[0, 1]
            
            drivers.append({
                'name': 'Price Competitiveness',
                'nameSi': 'මිල තරඟකාරීත්වය',
                'impact': round(abs(price_corr), 2),
                'description': f'Competitive pricing {"positively" if price_corr > 0 else "negatively"} impacts sales',
                'descriptionSi': f'තරඟකාරී මිල නියම කිරීම විකුණුම්වලට {"ධනාත්මක" if price_corr > 0 else "සෘණාත්මක"} බලපෑමක් කරයි'
            })
        
        # Sort by impact (highest first)
        drivers.sort(key=lambda x: x['impact'], reverse=True)
        
        # Return top 5 drivers
        return drivers[:5]
    
    async def retrain(self, product_id: str = None, store_id: str = None) -> Dict[str, Any]:
        """Retrain models - redirects to train_models.py"""
        return {
            'status': 'error',
            'message': (
                'Model training must be done via train_models.py script.\n'
                'This ensures proper data loading from Kaggle dataset.\n'
                'Run: cd ml-service && python train_models.py'
            ),
            'timestamp': datetime.now().isoformat()
        }
