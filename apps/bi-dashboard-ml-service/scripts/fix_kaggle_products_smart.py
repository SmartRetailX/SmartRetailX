import pandas as pd
import numpy as np

# Load the dataset
csv_path = '../data/kaggle_sales_data_fixed.csv'
df = pd.read_csv(csv_path)

# For each product_id, calculate average price, discount, competitor pricing
grouped = df.groupby('Product_ID').agg({
    'Price': 'mean',
    'Discount': 'mean',
    'Competitor_Pricing': 'mean'
}).reset_index()

# Helper to randomize within ±15% of average
def randomize(val, percent=0.15):
    return round(val * np.random.uniform(1 - percent, 1 + percent), 2)

# Map product_id to averages
price_map = dict(zip(grouped['Product_ID'], grouped['Price']))
discount_map = dict(zip(grouped['Product_ID'], grouped['Discount']))
comp_map = dict(zip(grouped['Product_ID'], grouped['Competitor_Pricing']))

# Update each row
for idx, row in df.iterrows():
    pid = row['Product_ID']
    # Price
    avg_price = price_map[pid]
    df.at[idx, 'Price'] = randomize(avg_price, percent=0.15)
    # Discount
    avg_discount = discount_map[pid]
    df.at[idx, 'Discount'] = randomize(avg_discount, percent=0.25)  # discounts can vary more
    # Competitor Pricing
    avg_comp = comp_map[pid]
    # Competitor price should be close to product price, but not identical
    df.at[idx, 'Competitor_Pricing'] = randomize(avg_comp, percent=0.12)
    # You can add more logic for other columns if needed

# Save the updated dataset
smart_path = '../data/kaggle_sales_data_smart.csv'
df.to_csv(smart_path, index=False)
print(f"Smart dataset saved to {smart_path}")
