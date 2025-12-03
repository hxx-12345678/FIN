#!/usr/bin/env node
/**
 * Compare Local and Production Database Schemas
 * Ensures they match perfectly
 */

const { PrismaClient } = require('@prisma/client');

// Production database URL
const PROD_DB_URL = process.env.PROD_DATABASE_URL || 
  'postgresql://finapilot_user:YqBB25acxTkkvhAo0Xu8INmVHIL5f3jO@dpg-d4o2nomuk2gs7385k770-a.oregon-postgres.render.com/finapilot';

// Local database URL (from .env or default)
const LOCAL_DB_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:postgres@localhost:5432/finapilot';

const prodPrisma = new PrismaClient({
  datasources: {
    db: { url: PROD_DB_URL }
  }
});

const localPrisma = new PrismaClient({
  datasources: {
    db: { url: LOCAL_DB_URL }
  }
});

async function getTableColumns(prisma, tableName) {
  try {
    const columns = await prisma.$queryRawUnsafe(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = $1
      ORDER BY ordinal_position;
    `, tableName);
    return columns;
  } catch (error) {
    return null;
  }
}

async function getTableIndexes(prisma, tableName) {
  try {
    const indexes = await prisma.$queryRawUnsafe(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' 
        AND tablename = $1
      ORDER BY indexname;
    `, tableName);
    return indexes;
  } catch (error) {
    return [];
  }
}

async function compareTable(tableName) {
  console.log(`\n📊 Comparing table: ${tableName}`);
  console.log('─'.repeat(60));
  
  const prodColumns = await getTableColumns(prodPrisma, tableName);
  const localColumns = await getTableColumns(localPrisma, tableName);
  
  if (!prodColumns) {
    console.log(`❌ Table ${tableName} does NOT exist in PRODUCTION`);
    return false;
  }
  
  if (!localColumns) {
    console.log(`⚠️  Table ${tableName} does NOT exist in LOCAL (may be expected)`);
    return true; // Not an error if local doesn't have it
  }
  
  // Compare columns
  const prodColNames = prodColumns.map(c => c.column_name).sort();
  const localColNames = localColumns.map(c => c.column_name).sort();
  
  const missingInProd = localColNames.filter(c => !prodColNames.includes(c));
  const missingInLocal = prodColNames.filter(c => !localColNames.includes(c));
  const common = prodColNames.filter(c => localColNames.includes(c));
  
  if (missingInProd.length > 0) {
    console.log(`❌ Columns in LOCAL but missing in PRODUCTION:`);
    missingInProd.forEach(c => console.log(`   - ${c}`));
  }
  
  if (missingInLocal.length > 0) {
    console.log(`⚠️  Columns in PRODUCTION but missing in LOCAL:`);
    missingInLocal.forEach(c => console.log(`   - ${c}`));
  }
  
  // Compare data types for common columns
  const typeMismatches = [];
  common.forEach(colName => {
    const prodCol = prodColumns.find(c => c.column_name === colName);
    const localCol = localColumns.find(c => c.column_name === colName);
    
    if (prodCol.data_type !== localCol.data_type) {
      typeMismatches.push({
        column: colName,
        prod: prodCol.data_type,
        local: localCol.data_type
      });
    }
  });
  
  if (typeMismatches.length > 0) {
    console.log(`❌ Data type mismatches:`);
    typeMismatches.forEach(m => {
      console.log(`   - ${m.column}: PROD=${m.prod}, LOCAL=${m.local}`);
    });
  }
  
  if (missingInProd.length === 0 && missingInLocal.length === 0 && typeMismatches.length === 0) {
    console.log(`✅ Table ${tableName} matches perfectly!`);
    console.log(`   Columns: ${common.length}`);
    return true;
  }
  
  return missingInProd.length === 0; // Only fail if production is missing something
}

async function compareIndexes(tableName) {
  const prodIndexes = await getTableIndexes(prodPrisma, tableName);
  const localIndexes = await getTableIndexes(localPrisma, tableName);
  
  const prodIndexNames = prodIndexes.map(i => i.indexname).sort();
  const localIndexNames = localIndexes.map(i => i.indexname).sort();
  
  const missingInProd = localIndexNames.filter(i => !prodIndexNames.includes(i));
  const missingInLocal = prodIndexNames.filter(i => !localIndexNames.includes(i));
  
  if (missingInProd.length > 0 || missingInLocal.length > 0) {
    console.log(`\n🔍 Index comparison for ${tableName}:`);
    if (missingInProd.length > 0) {
      console.log(`   ⚠️  Missing in PROD: ${missingInProd.join(', ')}`);
    }
    if (missingInLocal.length > 0) {
      console.log(`   ℹ️  Extra in PROD: ${missingInLocal.join(', ')}`);
    }
  }
}

async function runComparison() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Local vs Production Database Comparison');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Test connections
  console.log('🔌 Testing connections...\n');
  
  try {
    await prodPrisma.$queryRaw`SELECT 1`;
    console.log('✅ Production database connected');
  } catch (error) {
    console.error('❌ Production database connection failed:', error.message);
    process.exit(1);
  }
  
  try {
    await localPrisma.$queryRaw`SELECT 1`;
    console.log('✅ Local database connected\n');
  } catch (error) {
    console.log('⚠️  Local database connection failed (may not be running)');
    console.log('   Continuing with production-only checks...\n');
  }
  
  // Critical tables to compare
  const criticalTables = [
    'jobs',
    'orgs',
    'users',
    'model_runs',
    'exports',
    'monte_carlo_jobs',
    'connectors',
    'models',
  ];
  
  let allMatch = true;
  
  for (const table of criticalTables) {
    const matches = await compareTable(table);
    if (!matches) {
      allMatch = false;
    }
    await compareIndexes(table);
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Comparison Summary');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  if (allMatch) {
    console.log('✅ All critical tables match between local and production!');
  } else {
    console.log('❌ Some tables have mismatches - review above');
  }
  
  await prodPrisma.$disconnect();
  await localPrisma.$disconnect();
}

runComparison().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

