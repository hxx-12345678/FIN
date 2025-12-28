# PowerShell script to mark all Prisma migrations as applied
# Run this when database schema is already in sync but migrations tracking is not

Write-Host "📋 Marking all migrations as applied..." -ForegroundColor Cyan

$migrations = @(
  '20251114135522_init',
  '20251114180920_add_invitation_tokens',
  '20251114194706_add_provenance_indexes',
  '20251115000000_add_job_lifecycle_fields',
  '20251115000001_add_alerts_ai_plans_settings',
  '20251119125152_alert_ai_plan_and_job_lifecycle',
  '20251126000000_add_connector_sync_fields',
  '20251126000001_add_export_status',
  '20251126120000_add_budgets_table',
  '20251126163353_add_budgets_table',
  '20251127000000_add_connector_updated_at',
  '20251129_add_excel_sync_mappings_quotas',
  '20251201_add_board_report_schedules',
  '20251201_add_file_data_fallback_to_exports',
  '20251201_add_meta_json_to_exports',
  '20251201_add_realtime_simulations',
  '20251201_add_updated_at_to_exports',
  '20251210213931_add_user_usage',
  '20251227_add_settings_tables'
)

foreach ($migration in $migrations) {
  npx prisma migrate resolve --applied $migration
}

Write-Host ""
Write-Host "✅ All migrations marked as applied!" -ForegroundColor Green
Write-Host "📊 Checking status..." -ForegroundColor Cyan
npx prisma migrate status

