"""
Extract source-catalog products into BI seed and training helper formats.

The canonical input is apps/bi-dashboard-ml-service/data/product-catalog.json,
which mirrors the teammate's product shape with itemID and itemCode fields.
"""

from pathlib import Path
import json


ROOT = Path(__file__).resolve().parent
CATALOG_FILE = ROOT / 'data' / 'product-catalog.json'


def load_catalog():
    with CATALOG_FILE.open('r', encoding='utf-8') as handle:
        return json.load(handle)


def category_label(category: str) -> str:
    return {
        'Groceries': 'ආහාර',
        'Vegetables': 'එළවළු',
        'Fruits': 'පලතුරු',
        'Toys': 'සෙල්ලම් බඩු',
        'Electronics': 'ඉලෙක්ට්‍රොනික',
        'Furniture': 'ගෘහ භාණ්ඩ',
        'Clothing': 'ඇඳුම්',
    }.get(category, category)


def name_label(name: str) -> str:
    return {
        'Basmati Rice 5kg': 'බාස්මති සහල් 5kg',
        'Carrot': 'කැරට්',
        'Potato': 'අල',
        'Fresh Milk 1L': 'නැවුම් කිරි 1L',
        'Banana Bunch': 'කෙසෙල් ගුලිය',
        'Apple': 'ඇපල්',
        'White Sugar 1kg': 'සුදු සීනි 1kg',
        'Coconut Oil 1L': 'පොල් තෙල් 1L',
        'Bluetooth Speaker': 'බ්ලූටූත් ශබ්ද විකාශක',
        'Wireless Mouse': 'රැහැන් රහිත මූසිකය',
        'Office Chair': 'කාර්යාල පුටුව',
        'Study Desk': 'අධ්‍යයන මේසය',
        'Cotton T-Shirt': 'කපු ටී ෂර්ට්',
        'Denim Jeans': 'ඩෙනිම් ජීන්ස්',
        'Running Shoes': 'ධාවන සපත්තු',
        'USB Flash Drive 32GB': 'යූඑස්බී ෆ්ලෑෂ් ඩ්‍රයිව් 32GB',
        'Ambarella': 'අම්බරැල්ල',
        'Action Figure Toy': 'ක්‍රියාදාමී රූපයන්',
        'Educational Board Game': 'අධ්‍යාපනික මේස ක්‍රීඩාව',
        'Board Game Set': 'මේස ක්‍රීඩා කට්ටලය',
    }.get(name, name)


def seed_row(product: dict, idx: int) -> dict:
    return {
        'id': str(product['itemID']),
        'sku': product['itemCode'],
        'name': product['name'],
        'nameSi': name_label(product['name']),
        'category': product['category'],
        'categorySi': category_label(product['category']),
        'price': product['price'],
        'cost': round(product['price'] * 0.75, 2),
        'stock': 80 + idx * 15,
        'reorder': 180 if idx % 4 == 1 else 200,
        'max': 900 + (idx % 3) * 50,
        'imageUrl': product['imageUrl'],
        'isAvailable': product['isAvailable'],
    }


def main():
    source_products = load_catalog()
    seed_products = [seed_row(product, idx) for idx, product in enumerate(source_products)]

    print('const productCatalog = [')
    for product in source_products:
        print(
            f"  {{ itemID: {product['itemID']}, itemCode: '{product['itemCode']}', category: '{product['category']}', categoryId: {product['categoryId']}, name: '{product['name']}', price: {product['price']}, uom: '{product['uom']}', imageUrl: '{product['imageUrl']}', isAvailable: {str(product['isAvailable']).lower()} }},"
        )
    print('];')

    print('\nconst productData = [')
    for product in seed_products:
        print(
            f"  {{ sku: '{product['sku']}', name: '{product['name']}', nameSi: '{product['nameSi']}', category: '{product['category']}', categorySi: '{product['categorySi']}', price: {product['price']}, cost: {product['cost']}, stock: {product['stock']}, reorder: {product['reorder']}, max: {product['max']} }},"
        )
    print('];')

    print('\n// Product key map for training / migration:')
    print(json.dumps(
        [
            {
                'itemID': product['itemID'],
                'itemCode': product['itemCode'],
                'biProductId': str(product['itemID']),
                'modelKey': str(product['itemID']),
            }
            for product in source_products
        ],
        indent=2,
    ))


if __name__ == '__main__':
    main()
