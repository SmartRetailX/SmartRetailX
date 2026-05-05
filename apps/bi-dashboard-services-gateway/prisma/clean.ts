import { resolve } from 'path';
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';

// Load .env from project root
const envPath = resolve(__dirname, '../../../.env');
if (existsSync(envPath)) {
  loadEnvFile(envPath);
}

import { PrismaClient } from '../src/generated/prisma';

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is not set. Export it in your shell or create a workspace .env file before running prisma:bi-dashboard:clean.'
  );
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

/**
 * Truncate/Clean all database tables for BI Dashboard
 * Run: pnpm prisma:bi-dashboard:clean
 * 
 * WARNING: This will delete ALL BI Dashboard data from the database!
 * Use with caution in development environments only.
 */
async function main() {
  console.log('⚠️  WARNING: This will DELETE ALL BI Dashboard data from the database!');
  console.log('Starting database cleanup in 3 seconds...\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('🧹 Starting BI Dashboard database cleanup...\n');

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

    console.log('\n' + '='.repeat(60));
    console.log('✅ BI Dashboard database cleanup completed successfully!');
    console.log('⚠️  Note: Core schema tables (user, session, account, verification) are NOT affected');
    console.log('='.repeat(60));
    console.log('\n📊 Total BI Dashboard records deleted:');
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
    
    const total = products.count + customers.count + 
                  sales.count + saleItems.count + inventoryMovements.count + 
                  forecasts.count + forecastDrivers.count + alerts.count + 
                  promotions.count + promotionProducts.count + auditLogs.count + 
                  notifications.count;
    
    console.log(`\n   TOTAL: ${total} BI Dashboard records deleted`);
    console.log('\n💡 To add fresh data, run: pnpm prisma:bi-dashboard:seed');
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