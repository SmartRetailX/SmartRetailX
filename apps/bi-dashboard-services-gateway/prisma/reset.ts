import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

/**
 * Reset database: Clean all data and re-seed
 * Run: npm run prisma:reset
 */
async function main() {
  console.log('🔄 Database Reset Utility');
  console.log('='.repeat(60));
  console.log('This will:');
  console.log('  1. Delete all existing data');
  console.log('  2. Re-seed with fresh data\n');
  console.log('⚠️  WARNING: All current data will be lost!');
  console.log('Starting in 3 seconds...\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    // Step 1: Clean database
    console.log('📍 Step 1/2: Cleaning database...\n');
    execSync('npm run prisma:clean', { stdio: 'inherit' });

    console.log('\n📍 Step 2/2: Seeding database...\n');
    execSync('npm run prisma:seed', { stdio: 'inherit' });

    console.log('\n' + '='.repeat(60));
    console.log('✅ Database reset completed successfully!');
    console.log('='.repeat(60));
    console.log('\n💡 Next steps:');
    console.log('   1. Create user via: POST /api/auth/sign-up/email');
    console.log('   2. Start the server: nx serve bi-dashboard-services-gateway');
    console.log('   3. Visit Swagger docs: http://localhost:3001/api/docs');
    console.log('   4. Better Auth users managed separately via auth endpoints');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Reset failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Database reset failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
