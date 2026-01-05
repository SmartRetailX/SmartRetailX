import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Truncate/Clean all database tables
 * Run: npm run prisma:clean
 * 
 * WARNING: This will delete ALL data from the database!
 * Use with caution in development environments only.
 */
async function main() {
  console.log('⚠️  WARNING: This will DELETE ALL DATA from the database!');
  console.log('Starting database cleanup in 3 seconds...\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('🧹 Starting database cleanup...\n');

  try {
    // Delete in correct order to respect foreign key constraints
    
    console.log('🗑️  Deleting notifications...');
    const notifications = await prisma.notification.deleteMany({});
    console.log(`   ✅ Deleted ${notifications.count} notifications`);

    console.log('🗑️  Deleting audit logs...');
    const auditLogs = await prisma.auditLog.deleteMany({});
    console.log(`   ✅ Deleted ${auditLogs.count} audit logs`);

    console.log('🗑️  Deleting promotion products...');
    const promotionProducts = await prisma.promotionProduct.deleteMany({});
    console.log(`   ✅ Deleted ${promotionProducts.count} promotion-product links`);

    console.log('🗑️  Deleting promotions...');
    const promotions = await prisma.promotion.deleteMany({});
    console.log(`   ✅ Deleted ${promotions.count} promotions`);

    console.log('🗑️  Deleting alerts...');
    const alerts = await prisma.alert.deleteMany({});
    console.log(`   ✅ Deleted ${alerts.count} alerts`);

    console.log('🗑️  Deleting forecast drivers...');
    const forecastDrivers = await prisma.forecastDriver.deleteMany({});
    console.log(`   ✅ Deleted ${forecastDrivers.count} forecast drivers`);

    console.log('🗑️  Deleting forecasts...');
    const forecasts = await prisma.forecast.deleteMany({});
    console.log(`   ✅ Deleted ${forecasts.count} forecasts`);

    console.log('🗑️  Deleting inventory movements...');
    const inventoryMovements = await prisma.inventoryMovement.deleteMany({});
    console.log(`   ✅ Deleted ${inventoryMovements.count} inventory movements`);

    console.log('🗑️  Deleting sale items...');
    const saleItems = await prisma.saleItem.deleteMany({});
    console.log(`   ✅ Deleted ${saleItems.count} sale items`);

    console.log('🗑️  Deleting sales...');
    const sales = await prisma.sale.deleteMany({});
    console.log(`   ✅ Deleted ${sales.count} sales`);

    console.log('🗑️  Deleting customers...');
    const customers = await prisma.customer.deleteMany({});
    console.log(`   ✅ Deleted ${customers.count} customers`);

    console.log('🗑️  Deleting products...');
    const products = await prisma.product.deleteMany({});
    console.log(`   ✅ Deleted ${products.count} products`);

    console.log('🗑️  Deleting user-store links...');
    const userStores = await prisma.userStore.deleteMany({});
    console.log(`   ✅ Deleted ${userStores.count} user-store links`);

    console.log('🗑️  Deleting stores...');
    const stores = await prisma.store.deleteMany({});
    console.log(`   ✅ Deleted ${stores.count} stores`);

    console.log('🗑️  Deleting refresh tokens...');
    const refreshTokens = await prisma.refreshToken.deleteMany({});
    console.log(`   ✅ Deleted ${refreshTokens.count} refresh tokens`);

    console.log('🗑️  Deleting users...');
    const users = await prisma.user.deleteMany({});
    console.log(`   ✅ Deleted ${users.count} users`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Database cleanup completed successfully!');
    console.log('='.repeat(60));
    console.log('\n📊 Total records deleted:');
    console.log(`   Users: ${users.count}`);
    console.log(`   Stores: ${stores.count}`);
    console.log(`   Products: ${products.count}`);
    console.log(`   Customers: ${customers.count}`);
    console.log(`   Sales: ${sales.count}`);
    console.log(`   Sale Items: ${saleItems.count}`);
    console.log(`   Inventory Movements: ${inventoryMovements.count}`);
    console.log(`   Forecasts: ${forecasts.count}`);
    console.log(`   Forecast Drivers: ${forecastDrivers.count}`);
    console.log(`   Alerts: ${alerts.count}`);
    console.log(`   Promotions: ${promotions.count}`);
    console.log(`   Promotion Products: ${promotionProducts.count}`);
    console.log(`   Audit Logs: ${auditLogs.count}`);
    console.log(`   Notifications: ${notifications.count}`);
    console.log(`   Refresh Tokens: ${refreshTokens.count}`);
    console.log(`   User-Store Links: ${userStores.count}`);
    
    const total = users.count + stores.count + products.count + customers.count + 
                  sales.count + saleItems.count + inventoryMovements.count + 
                  forecasts.count + forecastDrivers.count + alerts.count + 
                  promotions.count + promotionProducts.count + auditLogs.count + 
                  notifications.count + refreshTokens.count + userStores.count;
    
    console.log(`\n   TOTAL: ${total} records deleted`);
    console.log('\n💡 To add fresh data, run: npm run prisma:seed');
    console.log('   or for advanced seed: npm run prisma:seed:advanced');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
