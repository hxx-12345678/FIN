#!/usr/bin/env node
/**
 * Test Production Database Connection and Schema
 * Verifies all tables, fields, and compares with Prisma schema
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://finapilot_user:YqBB25acxTkkvhAo0Xu8INmVHIL5f3jO@dpg-d4o2nomuk2gs7385k770-a.oregon-postgres.render.com/finapilot'
    }
  }
});

// Expected tables from Prisma schema
const EXPECTED_TABLES = [
  'users',
  'orgs',
  'user_org_roles',
  'connectors',
  'raw_transactions',
  'chart_of_accounts',
  'models',
  'model_runs',
  'monte_carlo_jobs',
  'prompts',
  'provenance_entries',
  'exports',
  'jobs',
  'audit_logs',
  'share_tokens',
  'billing_usage',
  'invitation_tokens',
  'alert_rules',
  'ai_cfo_plans',
  'org_settings',
  'budgets',
  'excel_syncs',
  'excel_mappings',
  'org_quotas',
  'realtime_simulations',
  'board_report_schedules',
  'notifications',
  'notification_channels',
  'user_preferences',
  'org_details',
  'localization_settings',
];

// Critical tables that must exist for worker to function
const CRITICAL_TABLES = [
  'jobs',
  'orgs',
  'users',
  'model_runs',
  'exports',
];

async function testConnection() {
  console.log('🔌 Testing database connection...\n');
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful!\n');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function checkTables() {
  console.log('📊 Checking database tables...\n');
  
  try {
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const existingTables = tables.map(t => t.table_name);
    console.log(`Found ${existingTables.length} tables in database:\n`);
    
    // Check for expected tables
    const missingTables = EXPECTED_TABLES.filter(t => !existingTables.includes(t));
    const extraTables = existingTables.filter(t => !EXPECTED_TABLES.includes(t));
    
    // Check critical tables
    const missingCritical = CRITICAL_TABLES.filter(t => !existingTables.includes(t));
    
    if (missingCritical.length > 0) {
      console.log('❌ CRITICAL TABLES MISSING:');
      missingCritical.forEach(t => console.log(`   - ${t}`));
      console.log('');
    }
    
    if (missingTables.length > 0) {
      console.log('⚠️  Missing expected tables:');
      missingTables.forEach(t => console.log(`   - ${t}`));
      console.log('');
    }
    
    if (extraTables.length > 0) {
      console.log('ℹ️  Extra tables (not in schema):');
      extraTables.forEach(t => console.log(`   - ${t}`));
      console.log('');
    }
    
    console.log('✅ Existing tables:');
    existingTables.forEach(t => {
      const isCritical = CRITICAL_TABLES.includes(t);
      const marker = isCritical ? '🔴' : '✅';
      console.log(`   ${marker} ${t}`);
    });
    console.log('');
    
    return {
      existingTables,
      missingTables,
      missingCritical,
      extraTables
    };
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
    return null;
  }
}

async function checkJobsTableSchema() {
  console.log('🔍 Checking jobs table schema...\n');
  
  try {
    const columns = await prisma.$queryRaw`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'jobs'
      ORDER BY ordinal_position;
    `;
    
    if (columns.length === 0) {
      console.log('❌ jobs table does not exist!\n');
      return false;
    }
    
    console.log(`✅ jobs table exists with ${columns.length} columns:\n`);
    
    // Expected columns from Prisma schema
    const expectedColumns = [
      'id', 'job_type', 'orgId', 'object_id', 'status', 'progress', 'logs',
      'priority', 'queue', 'attempts', 'max_attempts', 'last_error',
      'next_run_at', 'worker_id', 'run_started_at', 'visibility_expires_at',
      'finished_at', 'cancel_requested', 'created_by_user_id', 'billing_estimate',
      'idempotency_key', 'created_at', 'updated_at'
    ];
    
    const existingColumns = columns.map(c => c.column_name);
    const missingColumns = expectedColumns.filter(c => !existingColumns.includes(c));
    
    columns.forEach(col => {
      const isExpected = expectedColumns.includes(col.column_name);
      const marker = isExpected ? '✅' : '⚠️';
      console.log(`   ${marker} ${col.column_name} (${col.data_type})`);
    });
    
    if (missingColumns.length > 0) {
      console.log('\n⚠️  Missing expected columns:');
      missingColumns.forEach(c => console.log(`   - ${c}`));
    }
    
    console.log('');
    return true;
  } catch (error) {
    console.error('❌ Error checking jobs table:', error.message);
    return false;
  }
}

async function checkIndexes() {
  console.log('🔍 Checking indexes on jobs table...\n');
  
  try {
    const indexes = await prisma.$queryRaw`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' 
        AND tablename = 'jobs'
      ORDER BY indexname;
    `;
    
    if (indexes.length === 0) {
      console.log('⚠️  No indexes found on jobs table\n');
      return;
    }
    
    console.log(`✅ Found ${indexes.length} indexes:\n`);
    indexes.forEach(idx => {
      console.log(`   ✅ ${idx.indexname}`);
    });
    console.log('');
  } catch (error) {
    console.error('❌ Error checking indexes:', error.message);
  }
}

async function testJobsTableOperations() {
  console.log('🧪 Testing jobs table operations...\n');
  
  try {
    // Test SELECT
    const count = await prisma.$queryRaw`SELECT COUNT(*) as count FROM jobs`;
    console.log(`✅ SELECT works: ${count[0].count} jobs in table`);
    
    // Test INSERT (then rollback)
    const testJob = await prisma.$executeRaw`
      INSERT INTO jobs (job_type, status, priority, queue)
      VALUES ('test', 'queued', 50, 'default')
      RETURNING id;
    `;
    console.log('✅ INSERT works');
    
    // Clean up test job
    await prisma.$executeRaw`DELETE FROM jobs WHERE job_type = 'test'`;
    console.log('✅ DELETE works');
    
    console.log('');
    return true;
  } catch (error) {
    console.error('❌ Error testing jobs table operations:', error.message);
    return false;
  }
}

async function checkOtherCriticalTables() {
  console.log('🔍 Checking other critical tables...\n');
  
  const criticalTables = ['orgs', 'users', 'model_runs', 'exports'];
  
  for (const table of criticalTables) {
    try {
      const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`);
      console.log(`✅ ${table}: ${result[0].count} records`);
    } catch (error) {
      console.log(`❌ ${table}: ${error.message}`);
    }
  }
  console.log('');
}

async function checkForeignKeys() {
  console.log('🔗 Checking foreign key constraints...\n');
  
  try {
    const fks = await prisma.$queryRaw`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'jobs';
    `;
    
    if (fks.length === 0) {
      console.log('⚠️  No foreign keys found on jobs table\n');
      return;
    }
    
    console.log(`✅ Found ${fks.length} foreign keys:\n`);
    fks.forEach(fk => {
      console.log(`   ✅ ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });
    console.log('');
  } catch (error) {
    console.error('❌ Error checking foreign keys:', error.message);
  }
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Production Database Test Suite');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const connected = await testConnection();
  if (!connected) {
    process.exit(1);
  }
  
  const tableCheck = await checkTables();
  if (!tableCheck) {
    process.exit(1);
  }
  
  // Check if jobs table exists
  if (tableCheck.missingCritical.includes('jobs')) {
    console.log('❌ CRITICAL: jobs table is missing!');
    console.log('   Run migrations: npx prisma migrate deploy\n');
    process.exit(1);
  }
  
  await checkJobsTableSchema();
  await checkIndexes();
  await checkForeignKeys();
  await testJobsTableOperations();
  await checkOtherCriticalTables();
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Test Summary');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  if (tableCheck.missingCritical.length === 0) {
    console.log('✅ All critical tables exist');
  } else {
    console.log('❌ Missing critical tables - migrations needed');
  }
  
  if (tableCheck.missingTables.length === 0) {
    console.log('✅ All expected tables exist');
  } else {
    console.log(`⚠️  ${tableCheck.missingTables.length} expected tables missing`);
  }
  
  console.log('\n✅ Database test complete!\n');
  
  await prisma.$disconnect();
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

