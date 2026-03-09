import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from project root
config({ path: resolve(__dirname, '../../../.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');
  console.log('ℹ️  Note: User authentication is handled by Better Auth');
  console.log('ℹ️  Create users via /api/auth/sign-up/email endpoint\n');

  // Create Products (20 products matching Kaggle dataset)
  // Stock scaled to match ML model training data (~136 units/day avg demand).
  // Reorder level = ~1.5 days supply. Healthy stock = 3–5 days supply (~400–700 units).
  // PROD002, PROD005, PROD009 intentionally below reorder to generate realistic alerts.
  const productData = [
    { sku: 'GRO-PROD001', name: 'Basmati Rice 5kg', nameSi: 'බාස්මති සහල් 5kg', category: 'Groceries', categorySi: 'ආහාර', price: 54.55, cost: 40.91, stock: 420, reorder: 180, max: 900 },
    { sku: 'TOY-PROD002', name: 'Building Blocks Set', nameSi: 'ගොඩනැගීමේ කුට්ටි කට්ටලය', category: 'Toys', categorySi: 'සෙල්ලම් බඩු', price: 55.27, cost: 41.45, stock: 85, reorder: 180, max: 900 },
    { sku: 'TOY-PROD003', name: 'Remote Control Car', nameSi: 'දුරස්ථ පාලන මෝටර් රථය', category: 'Toys', categorySi: 'සෙල්ලම් බඩු', price: 54.89, cost: 41.17, stock: 510, reorder: 200, max: 950 },
    { sku: 'TOY-PROD004', name: 'Board Game Set', nameSi: 'මේස ක්‍රීඩා කට්ටලය', category: 'Toys', categorySi: 'සෙල්ලම් බඩු', price: 55.54, cost: 41.66, stock: 480, reorder: 190, max: 900 },
    { sku: 'ELE-PROD005', name: 'Bluetooth Speaker', nameSi: 'බ්ලූටූත් ශබ්ද විකාශක', category: 'Electronics', categorySi: 'ඉලෙක්ට්‍රොනික', price: 55.02, cost: 41.27, stock: 110, reorder: 200, max: 900 },
    { sku: 'GRO-PROD006', name: 'Fresh Milk 1L', nameSi: 'නැවුම් කිරි 1L', category: 'Groceries', categorySi: 'ආහාර', price: 54.77, cost: 41.08, stock: 650, reorder: 220, max: 1000 },
    { sku: 'FUR-PROD007', name: 'Office Chair', nameSi: 'කාර්යාල පුටුව', category: 'Furniture', categorySi: 'ගෘහ භාණ්ඩ', price: 54.92, cost: 41.19, stock: 390, reorder: 170, max: 850 },
    { sku: 'CLO-PROD008', name: 'Cotton T-Shirt', nameSi: 'කපු ටී ෂර්ට්', category: 'Clothing', categorySi: 'ඇඳුම්', price: 55.35, cost: 41.51, stock: 560, reorder: 210, max: 950 },
    { sku: 'ELE-PROD009', name: 'Wireless Mouse', nameSi: 'රැහැන් රහිත මූසිකය', category: 'Electronics', categorySi: 'ඉලෙක්ට්‍රොනික', price: 55.16, cost: 41.37, stock: 140, reorder: 190, max: 900 },
    { sku: 'TOY-PROD010', name: 'Action Figure Toy', nameSi: 'ක්‍රියාදාමී රූපයන්', category: 'Toys', categorySi: 'සෙල්ලම් බඩු', price: 55.36, cost: 41.52, stock: 470, reorder: 185, max: 900 },
    { sku: 'FUR-PROD011', name: 'Study Desk', nameSi: 'අධ්‍යයන මේසය', category: 'Furniture', categorySi: 'ගෘහ භාණ්ඩ', price: 56.43, cost: 42.32, stock: 430, reorder: 175, max: 850 },
    { sku: 'CLO-PROD012', name: 'Denim Jeans', nameSi: 'ඩෙනිම් ජීන්ස්', category: 'Clothing', categorySi: 'ඇඳුම්', price: 54.96, cost: 41.22, stock: 500, reorder: 195, max: 950 },
    { sku: 'TOY-PROD013', name: 'Puzzle Game Set', nameSi: 'ප්‍රහේලිකා ක්‍රීඩා කට්ටලය', category: 'Toys', categorySi: 'සෙල්ලම් බඩු', price: 55.06, cost: 41.3, stock: 540, reorder: 200, max: 950 },
    { sku: 'CLO-PROD014', name: 'Sports Jacket', nameSi: 'ක්‍රීඩා ජැකට්', category: 'Clothing', categorySi: 'ඇඳුම්', price: 55.76, cost: 41.82, stock: 460, reorder: 180, max: 900 },
    { sku: 'CLO-PROD015', name: 'Running Shoes', nameSi: 'ධාවන සපත්තු', category: 'Clothing', categorySi: 'ඇඳුම්', price: 54.77, cost: 41.08, stock: 610, reorder: 210, max: 1000 },
    { sku: 'ELE-PROD016', name: 'USB Flash Drive 32GB', nameSi: 'යූඑස්බී ෆ්ලෑෂ් ඩ්‍රයිව් 32GB', category: 'Electronics', categorySi: 'ඉලෙක්ට්‍රොනික', price: 54.83, cost: 41.12, stock: 490, reorder: 195, max: 950 },
    { sku: 'TOY-PROD017', name: 'Toy Racing Car', nameSi: 'සෙල්ලම් ධාවන මෝටර් රථය', category: 'Toys', categorySi: 'සෙල්ලම් බඩු', price: 54.65, cost: 40.99, stock: 520, reorder: 200, max: 950 },
    { sku: 'CLO-PROD018', name: 'Casual Shirt', nameSi: 'සාමාන්‍ය කමිසය', category: 'Clothing', categorySi: 'ඇඳුම්', price: 54.82, cost: 41.12, stock: 440, reorder: 175, max: 900 },
    { sku: 'CLO-PROD019', name: 'Formal Trousers', nameSi: 'විධිමත් කලිසම', category: 'Clothing', categorySi: 'ඇඳුම්', price: 55.08, cost: 41.31, stock: 580, reorder: 215, max: 1000 },
    { sku: 'TOY-PROD020', name: 'Educational Board Game', nameSi: 'අධ්‍යාපනික මේස ක්‍රීඩාව', category: 'Toys', categorySi: 'සෙල්ලම් බඩු', price: 55.52, cost: 41.64, stock: 530, reorder: 200, max: 950 },
  ];

  const products = await Promise.all(
    productData.map((p, idx) => {
      const productId = `PROD${String(idx + 1).padStart(3, '0')}`;
      const productData = {
        sku: p.sku,
        barcode: `890${String(idx + 1).padStart(10, '0')}`,
        name: p.name,
        nameSi: p.nameSi,
        category: p.category,
        categorySi: p.categorySi,
        price: p.price,
        cost: p.cost,
        currentStock: p.stock,
        reorderLevel: p.reorder,
        maxStock: p.max,
        status: p.stock > p.reorder ? 'IN_STOCK' : p.stock > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK',
        supplier: 'Premium Suppliers Ltd',
        lastRestocked: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        imageUrl: `https://cdn.smartretailx.com/products/${productId}.jpg`,
      };
      return prisma.product.upsert({
        where: { id: productId },
        update: productData,
        create: { id: productId, ...productData },
      });
    })
  );
  console.log(`✅ ${products.length} products created/updated`);

  // Create Customers with RFM segments (7 sample customers)
  const customerData = [
    { name: 'Saman Perera', email: 'saman@example.com', phone: '+94771234567', segment: 'champions', rfm: [5, 5, 5], orders: 45, spent: 125000 },
    { name: 'Nimal Silva', email: 'nimal@example.com', phone: '+94771234568', segment: 'loyal', rfm: [4, 5, 4], orders: 38, spent: 98000 },
    { name: 'Kamala Jayasinghe', email: 'kamala@example.com', phone: '+94771234569', segment: 'potential_loyalist', rfm: [4, 3, 4], orders: 22, spent: 65000 },
    { name: 'Ruwan Fernando', email: 'ruwan@example.com', phone: '+94771234570', segment: 'new_customers', rfm: [5, 1, 2], orders: 3, spent: 8500 },
    { name: 'Dilini Rathnayake', email: 'dilini@example.com', phone: '+94771234571', segment: 'at_risk', rfm: [2, 4, 4], orders: 32, spent: 87000 },
    { name: 'Kasun Bandara', email: 'kasun@example.com', phone: '+94771234572', segment: 'hibernating', rfm: [1, 2, 3], orders: 15, spent: 42000 },
    { name: 'Ayesha Mohamed', email: 'ayesha@example.com', phone: '+94771234573', segment: 'champions', rfm: [5, 5, 5], orders: 52, spent: 145000 },
  ];

  const customers = await Promise.all(
    customerData.map((c, idx) => {
      const customerId = `C${String(idx + 1).padStart(4, '0')}`;
      const customerRecord = {
        name: c.name,
        email: c.email,
        phone: c.phone,
        segment: c.segment,
        rfmRecency: c.rfm[0],
        rfmFrequency: c.rfm[1],
        rfmMonetary: c.rfm[2],
        totalOrders: c.orders,
        totalSpent: c.spent,
        averageOrderValue: c.spent / c.orders,
        lifetimeValue: c.spent,
        lastPurchase: new Date(Date.now() - (6 - c.rfm[0]) * 10 * 24 * 60 * 60 * 1000),
        loyaltyCardNumber: `LYC-2025-${String(idx + 1).padStart(3, '0')}`,
      };
      return prisma.customer.upsert({
        where: { id: customerId },
        update: customerRecord,
        create: { id: customerId, ...customerRecord },
      });
    })
  );
  console.log(`✅ ${customers.length} customers created/updated`);

  // Create Sales transactions (30 days history)
  console.log('📊 Creating sales history...');
  const existingSalesCount = await prisma.sale.count();
  if (existingSalesCount > 0) {
    console.log(`⏭️  Skipping sales - ${existingSalesCount} transactions already exist`);
  } else {
    // Build sale rows and item rows separately for batch inserts (2 queries instead of N)
    const saleRows: any[] = [];
    const itemRows: any[] = [];

    for (let day = 0; day < 30; day++) {
      const txCount = Math.floor(Math.random() * 5) + 3;
      for (let tx = 0; tx < txCount; tx++) {
        const timestamp = new Date(Date.now() - day * 24 * 60 * 60 * 1000 + Math.random() * 24 * 60 * 60 * 1000);
        const itemCount = Math.floor(Math.random() * 3) + 1;
        const saleId = `SAL-${day}-${tx}-${Date.now()}`;
        let totalAmount = 0;

        for (let i = 0; i < itemCount; i++) {
          const product = products[Math.floor(Math.random() * products.length)];
          const quantity = Math.floor(Math.random() * 3) + 1;
          const revenue = product.price * quantity;
          const cost = product.cost * quantity;
          totalAmount += revenue;
          itemRows.push({
            id: `${saleId}-item-${i}`,
            saleId,
            productId: product.id,
            quantity,
            unitPrice: product.price,
            revenue,
            cost,
            profit: revenue - cost,
          });
        }

        const discount = Math.random() < 0.3 ? totalAmount * 0.1 : 0;
        const txnNumber = (29 - day) * 100 + tx;
        saleRows.push({
          id: saleId,
          transactionId: `TXN-${new Date(timestamp).toISOString().split('T')[0]}-${String(txnNumber).padStart(6, '0')}`,
          customerId: Math.random() < 0.7 ? customers[Math.floor(Math.random() * customers.length)].id : null,
          totalAmount,
          discount,
          finalAmount: totalAmount - discount,
          paymentMethod: (['CASH', 'CARD', 'MOBILE'] as const)[Math.floor(Math.random() * 3)],
          timestamp,
        });
      }
    }

    await prisma.sale.createMany({ data: saleRows });
    await prisma.saleItem.createMany({ data: itemRows });
    console.log(`✅ ${saleRows.length} sales transactions created (${itemRows.length} items)`);
  }

  // NOTE: Alerts are NOT seeded - they are generated dynamically by the ML service
  // Call POST /v1/alerts/generate to create alerts based on real inventory analysis
  console.log('ℹ️  Alerts are generated dynamically. Run: POST /v1/alerts/generate');

  // Create Promotions
  const promotionData = {
    name: 'Weekend Special',
    nameSi: 'සති අන්ත විශේෂය',
    discount: 15,
    startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    status: 'ACTIVE',
    targetedRevenue: 50000,
    actualRevenue: 32000,
    lift: 22.5,
  };
  
  const promotion = await prisma.promotion.upsert({
    where: { id: 'PRM001' },
    update: promotionData,
    create: { id: 'PRM001', ...promotionData },
  });

  // Delete existing promotion products and recreate
  await prisma.promotionProduct.deleteMany({
    where: { promotionId: promotion.id },
  });
  
  await prisma.promotionProduct.createMany({
    data: [
      { promotionId: promotion.id, productId: 'PROD001' },
      { promotionId: promotion.id, productId: 'PROD002' },
      { promotionId: promotion.id, productId: 'PROD005' },
    ],
  });
  console.log('✅ Promotion created/updated');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📝 Login Credentials:');
  // console.log('Admin: admin@smartretailx.com / Admin@123');
  // console.log('Shop Owner: owner@smartretailx.com / Admin@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
