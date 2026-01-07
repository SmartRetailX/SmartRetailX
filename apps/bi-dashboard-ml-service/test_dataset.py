"""
Test script to verify Kaggle dataset integration
"""

import pandas as pd
import sys
sys.path.append('..')

from utils.data_processor import DataProcessor

def test_kaggle_dataset():
    """Test loading and processing Kaggle dataset"""
    
    print("=" * 60)
    print("[EMOJI] Testing Kaggle Dataset Integration")
    print("=" * 60)
    
    # Initialize processor
    processor = DataProcessor()
    
    # 1. Load dataset
    print("\n1⃣ Loading Kaggle dataset...")
    try:
        df = processor.load_kaggle_data('./data/kaggle_sales_data.csv')
        print(f"[OK] Loaded {len(df):,} rows")
        print(f"   Columns: {', '.join(df.columns)}")
        print(f"   Date range: {df['date'].min()} to {df['date'].max()}")
    except Exception as e:
        print(f"[ERROR] Error loading dataset: {e}")
        return
    
    # 2. Clean data
    print("\n2⃣ Cleaning data...")
    try:
        df_clean = processor.clean_data(df)
        print(f"[OK] Cleaned to {len(df_clean):,} rows")
        print(f"   Removed {len(df) - len(df_clean):,} invalid rows")
    except Exception as e:
        print(f"[ERROR] Error cleaning data: {e}")
        return
    
    # 3. Show sample data
    print("\n3⃣ Sample data:")
    print(df_clean.head(3).to_string())
    
    # 4. Test aggregation for a specific product/store
    print("\n4⃣ Testing aggregation for Product P0001, Store S001...")
    try:
        df_daily = processor.aggregate_daily(df_clean, 'P0001', 'S001')
        print(f"[OK] Aggregated to {len(df_daily)} days")
        
        # Show stats (use 'quantity' column from aggregation)
        qty_col = 'quantity' if 'quantity' in df_daily.columns else 'units_sold'
        print(f"\n[DATA] Sales Statistics:")
        print(f"   Average daily sales: {df_daily[qty_col].mean():.2f} units")
        print(f"   Max daily sales: {df_daily[qty_col].max():.0f} units")
        print(f"   Min daily sales: {df_daily[qty_col].min():.0f} units")
        if 'revenue' in df_daily.columns:
            print(f"   Total revenue: ${df_daily['revenue'].sum():,.2f}")
        
        if 'holiday_promotion' in df_daily.columns:
            promo_days = df_daily[df_daily['holiday_promotion'] > 0]
            non_promo_days = df_daily[df_daily['holiday_promotion'] == 0]
            if len(promo_days) > 0 and len(non_promo_days) > 0:
                print(f"\n[SUCCESS] Promotion Analysis:")
                print(f"   Promotion days: {len(promo_days)}")
                print(f"   Avg sales (promo): {promo_days[qty_col].mean():.2f} units")
                print(f"   Avg sales (no promo): {non_promo_days[qty_col].mean():.2f} units")
                if non_promo_days[qty_col].mean() > 0:
                    print(f"   Uplift: {(promo_days[qty_col].mean() / non_promo_days[qty_col].mean() - 1) * 100:.1f}%")
        
        if 'discount' in df_daily.columns:
            print(f"\n[EMOJI] Discount Analysis:")
            print(f"   Average discount: {df_daily['discount'].mean():.1f}%")
            print(f"   Max discount: {df_daily['discount'].max():.0f}%")
        
        if 'seasonality' in df_daily.columns:
            season_sales = df_daily.groupby('seasonality')[qty_col].mean()
            print(f"\n[EMOJI] Seasonal Analysis:")
            for season, sales in season_sales.items():
                print(f"   {season}: {sales:.2f} units avg")
        
    except Exception as e:
        print(f"[ERROR] Error aggregating data: {e}")
        return
    
    # 5. Test feature engineering
    print("\n5⃣ Testing feature engineering...")
    try:
        df_features = processor.engineer_features(df_clean.head(100))
        
        # Count engineered features
        original_cols = set(df_clean.columns)
        new_cols = set(df_features.columns) - original_cols
        
        print(f"[OK] Added {len(new_cols)} new features")
        print(f"   New features: {', '.join(sorted(list(new_cols)[:10]))}...")
        print(f"   Total features: {len(df_features.columns)}")
    except Exception as e:
        print(f"[ERROR] Error engineering features: {e}")
        return
    
    # 6. Show available products and stores
    print("\n6⃣ Available Products & Stores:")
    unique_products = df_clean['product_id'].nunique()
    unique_stores = df_clean['store_id'].nunique()
    print(f"   Products: {unique_products}")
    print(f"   Stores: {unique_stores}")
    print(f"   Sample Product IDs: {', '.join(df_clean['product_id'].unique()[:5])}")
    print(f"   Sample Store IDs: {', '.join(df_clean['store_id'].unique()[:5])}")
    
    print("\n" + "=" * 60)
    print("[OK] All tests passed! Your Kaggle dataset is ready to use!")
    print("=" * 60)
    print("\n[EMOJI] Next Steps:")
    print("   1. Start ML service: python main.py")
    print("   2. Test forecast API with your Product/Store IDs")
    print("   3. Example: curl -X POST http://localhost:8000/api/v1/forecast \\")
    print("             -H 'Content-Type: application/json' \\")
    print("             -d '{\"productId\":\"P0001\",\"storeId\":\"S001\",\"horizon\":30}'")
    print()

if __name__ == "__main__":
    test_kaggle_dataset()
