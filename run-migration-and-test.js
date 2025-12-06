/**
 * Run database migration and then run all tests
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Running Database Migration and Tests\n');

// Step 1: Read SQL migration file
const sqlFile = path.join(__dirname, 'backend/prisma/migrations/manual_add_approval_columns.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

console.log('📝 SQL Migration file found\n');

// Step 2: Try to run via Prisma
console.log('🔄 Attempting to apply migration via Prisma...\n');

try {
  // First, try to generate Prisma client
  console.log('1. Regenerating Prisma client...');
  execSync('cd backend && npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client regenerated\n');
  
  // Try to apply migration using Prisma db execute
  console.log('2. Applying migration...');
  try {
    execSync(`cd backend && npx prisma db execute --file prisma/migrations/manual_add_approval_columns.sql --schema prisma/schema.prisma`, { stdio: 'inherit' });
    console.log('✅ Migration applied via Prisma\n');
  } catch (e) {
    console.log('⚠️  Prisma db execute failed, trying direct SQL...\n');
    // If that fails, we'll need manual SQL execution
    console.log('📋 Please run this SQL manually in your PostgreSQL database:');
    console.log('='.repeat(70));
    console.log(sql);
    console.log('='.repeat(70));
    console.log('\nOr use psql:');
    console.log(`psql -d fina_pilot -f ${sqlFile}\n`);
  }
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\n📋 Please run this SQL manually:');
  console.log('='.repeat(70));
  console.log(sql);
  console.log('='.repeat(70));
}

// Step 3: Run tests
console.log('\n🧪 Running comprehensive tests...\n');
try {
  execSync('node comprehensive-edge-case-tests.js', { stdio: 'inherit', cwd: __dirname });
} catch (error) {
  console.error('\n❌ Tests failed');
  process.exit(1);
}

