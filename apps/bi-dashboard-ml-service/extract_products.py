"""
Extract product details from Kaggle dataset for seed file
"""
import pandas as pd
import json

# Load Kaggle dataset
df = pd.read_csv('data/kaggle_sales_data.csv')

# Get product details
products = df.groupby('Product_ID').agg({
    'Category': 'first',
    'Price': 'mean'
}).reset_index()

products = products.sort_values('Product_ID')

# Category-based product naming
category_products = {
    'Groceries': [
        ('Basmati Rice 5kg', 'බාස්මති සහල් 5kg'),
        ('Fresh Milk 1L', 'නැවුම් කිරි 1L'),
        ('Coconut Oil 1L', 'පොල් තෙල් 1L'),
        ('White Sugar 1kg', 'සුදු සීනි 1kg'),
    ],
    'Toys': [
        ('Building Blocks Set', 'ගොඩනැගීමේ කුට්ටි කට්ටලය'),
        ('Remote Control Car', 'දුරස්ථ පාලන මෝටර් රථය'),
        ('Board Game Set', 'මේස ක්‍රීඩා කට්ටලය'),
        ('Action Figure Toy', 'ක්‍රියාදාමී රූපයන්'),
    ],
    'Electronics': [
        ('Bluetooth Speaker', 'බ්ලූටූත් ශබ්ද විකාශක'),
        ('Wireless Mouse', 'රැහැන් රහිත මූසිකය'),
        ('USB Flash Drive 32GB', 'යූඑස්බී ෆ්ලෑෂ් ඩ්‍රයිව් 32GB'),
        ('HDMI Cable 2m', 'HDMI කේබලය 2m'),
    ],
    'Furniture': [
        ('Office Chair', 'කාර්යාල පුටුව'),
        ('Study Desk', 'අධ්‍යයන මේසය'),
        ('Bookshelf 4-Tier', 'පොත් රාක්කය 4 මට්ටම'),
        ('Floor Lamp', 'බිම ලාම්පුව'),
    ],
    'Clothing': [
        ('Cotton T-Shirt', 'කපු ටී ෂර්ට්'),
        ('Denim Jeans', 'ඩෙනිම් ජීන්ස්'),
        ('Sports Jacket', 'ක්‍රීඩා ජැකට්'),
        ('Running Shoes', 'ධාවන සපත්තු'),
    ]
}

# Generate product list
product_list = []
cat_counters = {cat: 0 for cat in category_products.keys()}

for idx, row in products.iterrows():
    product_id = row['Product_ID']
    category = row['Category']
    avg_price = round(row['Price'], 2)
    
    # Get name for this category
    if category in category_products and cat_counters[category] < len(category_products[category]):
        name_en, name_si = category_products[category][cat_counters[category]]
        cat_counters[category] += 1
    else:
        name_en = f"{category} Item"
        name_si = f"{category} භාණ්ඩය"
    
    product_list.append({
        'id': product_id,
        'sku': f'{category.upper()[:3]}-{product_id}',
        'name': name_en,
        'nameSi': name_si,
        'category': category,
        'categorySi': {
            'Groceries': 'ආහාර',
            'Toys': 'සෙල්ලම් බඩු',
            'Electronics': 'ඉලෙක්ට්‍රොනික',
            'Furniture': 'ගෘහ භාණ්ඩ',
            'Clothing': 'ඇඳුම්'
        }.get(category, category),
        'price': avg_price,
        'cost': round(avg_price * 0.75, 2)  # 25% margin
    })

# Print as TypeScript array
print("const productData = [")
for i, p in enumerate(product_list):
    print(f"  {{ sku: '{p['sku']}', name: '{p['name']}', nameSi: '{p['nameSi']}', category: '{p['category']}', categorySi: '{p['categorySi']}', price: {p['price']}, cost: {p['cost']}, stock: {50 + i*5}, reorder: {20 + i*2}, max: {200 + i*10} }},")
print("];")

print("\n\n// JSON format:")
print(json.dumps(product_list, indent=2))
