import pandas as pd

# Load the dataset
csv_path = '../data/kaggle_sales_data.csv'
df = pd.read_csv(csv_path)

# Get the canonical product info for each product_id (from the first store)
canonical = df.groupby('Product_ID').first().reset_index()

# Overwrite category, region, and any other product attributes for all rows
for col in ['Category', 'Region']:
    df[col] = df['Product_ID'].map(dict(zip(canonical['Product_ID'], canonical[col])))

# Optionally, you can do the same for other columns like product name, brand, etc.
# (if you have them)

# Save the fixed dataset
fixed_path = '../data/kaggle_sales_data_fixed.csv'
df.to_csv(fixed_path, index=False)
print(f"Fixed dataset saved to {fixed_path}")
