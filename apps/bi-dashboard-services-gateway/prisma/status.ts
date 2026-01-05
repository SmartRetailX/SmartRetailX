import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Database status check - Show current record counts
 * Run: npm run prisma:status
 */
async function main() {
  console.log('\n📊 Smart RetailX Database Status');
  console.log('='.repeat(60));

  try {
    const [
      userCount,
      storeCount,
      productCount,
      customerCount,
      saleCount,
      saleItemCount,
      inventoryCount,
      forecastCount,
      forecastDriverCount,
      alertCount,
      promotionCount,
      auditLogCount,
      notificationCount,
      refreshTokenCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.store.count(),
      prisma.product.count(),
      prisma.customer.count(),
      prisma.sale.count(),
      prisma.saleItem.count(),
      prisma.inventoryMovement.count(),
      prisma.forecast.count(),
      prisma.forecastDriver.count(),
      prisma.alert.count(),
      prisma.promotion.count(),
      prisma.auditLog.count(),
      prisma.notification.count(),
      prisma.refreshToken.count(),
    ]);

    console.log('\n👥 Core Data:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Stores: ${storeCount}`);
    console.log(`   Products: ${productCount}`);
    console.log(`   Customers: ${customerCount}`);

    console.log('\n💰 Transactional Data:');
    console.log(`   Sales: ${saleCount}`);
    console.log(`   Sale Items: ${saleItemCount}`);
    console.log(`   Inventory Movements: ${inventoryCount}`);

    console.log('\n📈 AI & Analytics:');
    console.log(`   Forecasts: ${forecastCount}`);
    console.log(`   Forecast Drivers: ${forecastDriverCount}`);
    console.log(`   Alerts: ${alertCount}`);

    console.log('\n🎁 Marketing:');
    console.log(`   Promotions: ${promotionCount}`);

    console.log('\n📝 System:');
    console.log(`   Audit Logs: ${auditLogCount}`);
    console.log(`   Notifications: ${notificationCount}`);
    console.log(`   Refresh Tokens: ${refreshTokenCount}`);

    const total = userCount + storeCount + productCount + customerCount + 
                  saleCount + saleItemCount + inventoryCount + 
                  forecastCount + forecastDriverCount + alertCount + 
                  promotionCount + auditLogCount + notificationCount + 
                  refreshTokenCount;

    console.log('\n' + '='.repeat(60));
    console.log(`📊 Total Records: ${total.toLocaleString()}`);
    console.log('='.repeat(60));

    // Additional insights
    if (productCount > 0) {
      const stockStatus = await prisma.product.groupBy({
        by: ['status'],
        _count: true,
      });

      console.log('\n📦 Product Stock Status:');
      stockStatus.forEach(s => {
        console.log(`   ${s.status}: ${s._count} products`);
      });
    }

    if (customerCount > 0) {
      const segments = await prisma.customer.groupBy({
        by: ['segment'],
        _count: true,
      });

      console.log('\n👤 Customer Segments:');
      segments.forEach(s => {
        console.log(`   ${s.segment}: ${s._count} customers`);
      });
    }

    if (alertCount > 0) {
      const alertStatus = await prisma.alert.groupBy({
        by: ['status'],
        _count: true,
      });

      console.log('\n🚨 Alert Status:');
      alertStatus.forEach(a => {
        console.log(`   ${a.status}: ${a._count} alerts`);
      });
    }

    if (saleCount > 0) {
      const totalRevenue = await prisma.sale.aggregate({
        _sum: { finalAmount: true },
      });

      console.log(`\n💵 Total Revenue: LKR ${totalRevenue._sum.finalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`);
    }

    // Database connection info
    console.log('\n🔗 Database Connection:');
    console.log(`   Status: ✅ Connected`);
    console.log(`   URL: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@') || 'Not set'}`);

    console.log('\n💡 Quick Commands:');
    console.log('   Add data: npm run prisma:seed:advanced');
    console.log('   Clean data: npm run prisma:clean');
    console.log('   Reset: npm run prisma:reset');
    console.log('   Prisma Studio: npx prisma studio');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Error fetching database status:', error);
    console.log('\n💡 Is the database running?');
    console.log('   Try: npm run docker:up');
    throw error;
  }
}

main()
  .catch((e) => {
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
