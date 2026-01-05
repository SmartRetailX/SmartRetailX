import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create Admin User
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@smartretailx.com' },
    update: {},
    create: {
      email: 'admin@smartretailx.com',
      password: hashedPassword,
      name: 'System Admin',
      role: 'ADMIN',
      phone: '+94112345678',
      language: 'en',
      active: true,
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create Stores
  const stores = await Promise.all([
    prisma.store.upsert({
      where: { id: 'S001' },
      update: {},
      create: {
        id: 'S001',
        name: 'Colombo Central',
        nameSi: 'කොළඹ මධ්‍යම',
        address: '123 Main Street, Colombo 01',
        city: 'Colombo',
        phone: '+94112345678',
        manager: 'John Perera',
        openingHours: '08:00-20:00',
        latitude: 6.9271,
        longitude: 79.8612,
        active: true,
      },
    }),
    prisma.store.upsert({
      where: { id: 'S002' },
      update: {},
      create: {
        id: 'S002',
        name: 'Galle Fort',
        nameSi: 'ගාල්ල කොටුව',
        address: '456 Fort Road, Galle',
        city: 'Galle',
        phone: '+94912234567',
        manager: 'Priya Fernando',
        openingHours: '09:00-19:00',
        latitude: 6.0328,
        longitude: 80.217,
        active: true,
      },
    }),
  ]);
  console.log(`✅ ${stores.length} stores created`);

  // Create Shop Owner
  const shopOwner = await prisma.user.upsert({
    where: { email: 'owner@smartretailx.com' },
    update: {},
    create: {
      email: 'owner@smartretailx.com',
      password: hashedPassword,
      name: 'Shop Owner',
      role: 'SHOP_OWNER',
      phone: '+94771234567',
      language: 'si',
      active: true,
    },
  });

  // Link owner to stores
  await prisma.userStore.createMany({
    data: [
      { userId: shopOwner.id, storeId: 'S001' },
      { userId: shopOwner.id, storeId: 'S002' },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Shop owner created and linked to stores');

  // Create Products (20 products matching Kaggle dataset)
  // Stock levels adjusted to trigger alerts:
  // - P0002: Stock 8, Reorder 22 (HIGH urgency - way below reorder)
  // - P0005: Stock 15, Reorder 28 (MEDIUM urgency - below reorder)
  // - P0009: Stock 25, Reorder 36 (LOW urgency - approaching reorder)
  const productData = [
    { sku: 'GRO-P0001', name: 'Basmati Rice 5kg', nameSi: 'බාස්මති සහල් 5kg', category: 'Groceries', categorySi: 'ආහාර', price: 54.55, cost: 40.91, stock: 50, reorder: 20, max: 200, storeId: 'S001' },
    { sku: 'TOY-P0002', name: 'Building Blocks Set', nameSi: 'ගොඩනැගීමේ කුට්ටි කට්ටලය', category: 'Toys', categorySi: 'සෙල්ලම් බඩු', price: 55.27, cost: 41.45, stock: 8, reorder: 22, max: 210, storeId: 'S001' },
    { sku: 'TOY-P0003', name: 'Remote Control Car', nameSi: 'දුරස්ථ පාලන මෝටර් රථය', category: 'Toys', categorySi: 'සෙල්ලම් බඩු', price: 54.89, cost: 41.17, stock: 60, reorder: 24, max: 220, storeId: 'S002' },
    { sku: 'TOY-P0004', name: 'Board Game Set', nameSi: 'මේස ක්‍රීඩා කට්ටලය', category: 'Toys', categorySi: 'සෙල්ලම් බඩු', price: 55.54, cost: 41.66, stock: 65, reorder: 26, max: 230, storeId: 'S002' },
    { sku: 'ELE-P0005', name: 'Bluetooth Speaker', nameSi: 'බ්ලූටූත් ශබ්ද විකාශක', category: 'Electronics', categorySi: 'ඉලෙක්ට්‍රොනික', price: 55.02, cost: 41.27, stock: 15, reorder: 28, max: 240, storeId: 'S001' },
    { sku: 'GRO-P0006', name: 'Fresh Milk 1L', nameSi: 'නැවුම් කිරි 1L', category: 'Groceries', categorySi: 'ආහාර', price: 54.77, cost: 41.08, stock: 75, reorder: 30, max: 250, storeId: 'S001' },
    { sku: 'FUR-P0007', name: 'Office Chair', nameSi: 'කාර්යාල පුටුව', category: 'Furniture', categorySi: 'ගෘහ භාණ්ඩ', price: 54.92, cost: 41.19, stock: 80, reorder: 32, max: 260, storeId: 'S002' },
    { sku: 'CLO-P0008', name: 'Cotton T-Shirt', nameSi: 'කපු ටී ෂර්ට්', category: 'Clothing', categorySi: 'ඇඳුම්', price: 55.35, cost: 41.51, stock: 85, reorder: 34, max: 270, storeId: 'S002' },
    { sku: 'ELE-P0009', name: 'Wireless Mouse', nameSi: 'රැහැන් රහිත මූසිකය', category: 'Electronics', categorySi: 'ඉලෙක්ට්‍රොනික', price: 55.16, cost: 41.37, stock: 25, reorder: 36, max: 280, storeId: 'S001' },
    { sku: 'TOY-P0010', name: 'Action Figure Toy', nameSi: 'ක්‍රියාදාමී රූපයන්', category: 'Toys', categorySi: 'සෙල්ලම් බඩු', price: 55.36, cost: 41.52, stock: 95, reorder: 38, max: 290, storeId: 'S001' },
    { sku: 'FUR-P0011', name: 'Study Desk', nameSi: 'අධ්‍යයන මේසය', category: 'Furniture', categorySi: 'ගෘහ භාණ්ඩ', price: 56.43, cost: 42.32, stock: 100, reorder: 40, max: 300, storeId: 'S002' },
    { sku: 'CLO-P0012', name: 'Denim Jeans', nameSi: 'ඩෙනිම් ජීන්ස්', category: 'Clothing', categorySi: 'ඇඳුම්', price: 54.96, cost: 41.22, stock: 105, reorder: 42, max: 310, storeId: 'S002' },
    { sku: 'TOY-P0013', name: 'Puzzle Game Set', nameSi: 'ප්‍රහේලිකා ක්‍රීඩා කට්ටලය', category: 'Toys', categorySi: 'සෙල්ලම් බඩු', price: 55.06, cost: 41.3, stock: 110, reorder: 44, max: 320, storeId: 'S001' },
    { sku: 'CLO-P0014', name: 'Sports Jacket', nameSi: 'ක්‍රීඩා ජැකට්', category: 'Clothing', categorySi: 'ඇඳුම්', price: 55.76, cost: 41.82, stock: 115, reorder: 46, max: 330, storeId: 'S001' },
    { sku: 'CLO-P0015', name: 'Running Shoes', nameSi: 'ධාවන සපත්තු', category: 'Clothing', categorySi: 'ඇඳුම්', price: 54.77, cost: 41.08, stock: 120, reorder: 48, max: 340, storeId: 'S002' },
    { sku: 'ELE-P0016', name: 'USB Flash Drive 32GB', nameSi: 'යූඑස්බී ෆ්ලෑෂ් ඩ්‍රයිව් 32GB', category: 'Electronics', categorySi: 'ඉලෙක්ට්‍රොනික', price: 54.83, cost: 41.12, stock: 125, reorder: 50, max: 350, storeId: 'S002' },
    { sku: 'TOY-P0017', name: 'Toy Racing Car', nameSi: 'සෙල්ලම් ධාවන මෝටර් රථය', category: 'Toys', categorySi: 'සෙල්ලම් බඩු', price: 54.65, cost: 40.99, stock: 130, reorder: 52, max: 360, storeId: 'S001' },
    { sku: 'CLO-P0018', name: 'Casual Shirt', nameSi: 'සාමාන්‍ය කමිසය', category: 'Clothing', categorySi: 'ඇඳුම්', price: 54.82, cost: 41.12, stock: 135, reorder: 54, max: 370, storeId: 'S001' },
    { sku: 'CLO-P0019', name: 'Formal Trousers', nameSi: 'විධිමත් කලිසම', category: 'Clothing', categorySi: 'ඇඳුම්', price: 55.08, cost: 41.31, stock: 140, reorder: 56, max: 380, storeId: 'S002' },
    { sku: 'TOY-P0020', name: 'Educational Board Game', nameSi: 'අධ්‍යාපනික මේස ක්‍රීඩාව', category: 'Toys', categorySi: 'සෙල්ලම් බඩු', price: 55.52, cost: 41.64, stock: 145, reorder: 58, max: 390, storeId: 'S002' },
  ];

  const products = await Promise.all(
    productData.map((p, idx) =>
      prisma.product.create({
        data: {
          id: `P${String(idx + 1).padStart(4, '0')}`,
          sku: p.sku,
          barcode: `890${String(idx + 1).padStart(10, '0')}`,
          name: p.name,
          nameSi: p.nameSi,
          category: p.category,
          categorySi: p.categorySi,
          price: p.price,
          cost: p.cost,
          storeId: p.storeId,
          currentStock: p.stock,
          reorderLevel: p.reorder,
          maxStock: p.max,
          status: p.stock > p.reorder ? 'IN_STOCK' : p.stock > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK',
          supplier: 'Premium Suppliers Ltd',
          lastRestocked: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          imageUrl: `https://cdn.smartretailx.com/products/P${String(idx + 1).padStart(4, '0')}.jpg`,
        },
      })
    )
  );
  console.log(`✅ ${products.length} products created`);

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
    customerData.map((c, idx) =>
      prisma.customer.create({
        data: {
          id: `C${String(idx + 1).padStart(4, '0')}`,
          name: c.name,
          email: c.email,
          phone: c.phone,
          storeId: idx % 2 === 0 ? 'S001' : 'S002',
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
        },
      })
    )
  );
  console.log(`✅ ${customers.length} customers created`);

  // Create Sales transactions (90 days history for ML training)
  console.log('📊 Creating sales history...');
  const salesData = [];
  for (let day = 0; day < 90; day++) {
    const txCount = Math.floor(Math.random() * 15) + 10; // 10-25 transactions per day
    for (let tx = 0; tx < txCount; tx++) {
      const timestamp = new Date(Date.now() - day * 24 * 60 * 60 * 1000 + Math.random() * 24 * 60 * 60 * 1000);
      const itemCount = Math.floor(Math.random() * 3) + 1; // 1-3 items per transaction
      let totalAmount = 0;
      const items = [];

      for (let i = 0; i < itemCount; i++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        const revenue = product.price * quantity;
        const cost = product.cost * quantity;
        items.push({
          productId: product.id,
          quantity,
          unitPrice: product.price,
          revenue,
          cost,
          profit: revenue - cost,
        });
        totalAmount += revenue;
      }

      const discount = Math.random() < 0.3 ? totalAmount * 0.1 : 0;
      const txnNumber = (89 - day) * 100 + tx;
      const storeId = Math.random() < 0.5 ? 'S001' : 'S002';
      const storeCustomers = customers.filter(c => c.storeId === storeId);
      salesData.push({
        transactionId: `TXN-${new Date(timestamp).toISOString().split('T')[0]}-${String(txnNumber).padStart(6, '0')}`,
        storeId,
        customerId: Math.random() < 0.7 ? storeCustomers[Math.floor(Math.random() * storeCustomers.length)].id : null,
        totalAmount,
        discount,
        finalAmount: totalAmount - discount,
        paymentMethod: ['CASH', 'CARD', 'MOBILE'][Math.floor(Math.random() * 3)] as any,
        timestamp,
        items: { create: items },
      });
    }
  }

  for (const saleData of salesData) {
    await prisma.sale.create({ data: saleData });
  }
  console.log(`✅ ${salesData.length} sales transactions created`);

  // NOTE: Alerts are NOT seeded - they are generated dynamically by the ML service
  // Call POST /v1/alerts/generate to create alerts based on real inventory analysis
  console.log('ℹ️  Alerts are generated dynamically. Run: POST /v1/alerts/generate');

  // Create Promotions
  const promotion = await prisma.promotion.create({
    data: {
      id: 'PRM001',
      name: 'Weekend Special',
      nameSi: 'සති අන්ත විශේෂය',
      storeId: 'S001',
      discount: 15,
      startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      targetedRevenue: 50000,
      actualRevenue: 32000,
      lift: 22.5,
    },
  });

  await prisma.promotionProduct.createMany({
    data: [
      { promotionId: promotion.id, productId: 'P0001' },
      { promotionId: promotion.id, productId: 'P0002' },
      { promotionId: promotion.id, productId: 'P0005' },
    ],
  });
  console.log('✅ Promotion created');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📝 Login Credentials:');
  console.log('Admin: admin@smartretailx.com / Admin@123');
  console.log('Shop Owner: owner@smartretailx.com / Admin@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
