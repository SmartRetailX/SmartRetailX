import pandas as pd
import numpy as np

csv_path = '../data/kaggle_sales_data_fixed.csv'
df = pd.read_csv(csv_path)

# Get product-level averages
grouped = df.groupby('Product_ID').agg({
    'Price': 'mean',
    'Discount': 'mean',
    'Competitor_Pricing': 'mean',
    'Category': 'first'
}).reset_index()

price_map = dict(zip(grouped['Product_ID'], grouped['Price']))
discount_map = dict(zip(grouped['Product_ID'], grouped['Discount']))
comp_map = dict(zip(grouped['Product_ID'], grouped['Competitor_Pricing']))
cat_map = dict(zip(grouped['Product_ID'], grouped['Category']))

# Helper for realistic price/discount
SEASON_DISCOUNT = {
    'Winter': 0.20,
    'Summer': 0.15,
    'Spring': 0.10,
    'Autumn': 0.12
}
CATEGORY_PEAK = {
    'Toys': 'Winter',
    'Clothing': 'Spring',
    'Electronics': 'Autumn',
    'Groceries': 'Summer',
    'Furniture': 'Autumn'
}

for idx, row in df.iterrows():
    pid = row['Product_ID']
    season = row['Seasonality']
    cat = row['Category']
    promo = row['Holiday/Promotion']
    base_price = price_map[pid]
    base_discount = discount_map[pid]
    base_comp = comp_map[pid]

    # Start with base price/discount
    price = base_price
    discount = base_discount

    # Apply seasonal effects
    if cat in CATEGORY_PEAK and season == CATEGORY_PEAK[cat]:
        price *= 1.10  # peak season, higher price
        discount *= 0.8  # less discount in peak season
    else:
        discount += SEASON_DISCOUNT.get(season, 0.10) * 100

    # Promotions/holidays: higher discount, lower price
    if promo == 1:
        discount += 10 + np.random.uniform(0, 10)
        price *= 0.95

    # Add some store-level variation
    price *= np.random.uniform(0.97, 1.03)
    discount *= np.random.uniform(0.95, 1.05)

    # Clamp discount to [0, 60]
    discount = max(0, min(discount, 60))
    price = round(price, 2)
    discount = round(discount, 2)

    # Competitor pricing: close to product price, sometimes undercut, sometimes higher
    comp_price = price * np.random.uniform(0.95, 1.08)
    comp_price = round(comp_price, 2)

    df.at[idx, 'Price'] = price
    df.at[idx, 'Discount'] = discount
    df.at[idx, 'Competitor_Pricing'] = comp_price

# Save the updated dataset
real_path = '../data/kaggle_sales_data_realistic.csv'
df.to_csv(real_path, index=False)
print(f"Realistic dataset saved to {real_path}")
