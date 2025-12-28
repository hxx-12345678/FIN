#!/bin/bash
# Script to mark all Prisma migrations as applied
# Run this when database schema is already in sync but migrations tracking is not

echo "📋 Marking all migrations as applied..."

npx prisma migrate resolve --applied 20251114135522_init
npx prisma migrate resolve --applied 20251114180920_add_invitation_tokens
npx prisma migrate resolve --applied 20251114194706_add_provenance_indexes
npx prisma migrate resolve --applied 20251115000000_add_job_lifecycle_fields
npx prisma migrate resolve --applied 20251115000001_add_alerts_ai_plans_settings
npx prisma migrate resolve --applied 20251119125152_alert_ai_plan_and_job_lifecycle
npx prisma migrate resolve --applied 20251126000000_add_connector_sync_fields
npx prisma migrate resolve --applied 20251126000001_add_export_status
npx prisma migrate resolve --applied 20251126120000_add_budgets_table
npx prisma migrate resolve --applied 20251126163353_add_budgets_table
npx prisma migrate resolve --applied 20251127000000_add_connector_updated_at
npx prisma migrate resolve --applied 20251129_add_excel_sync_mappings_quotas
npx prisma migrate resolve --applied 20251201_add_board_report_schedules
npx prisma migrate resolve --applied 20251201_add_file_data_fallback_to_exports
npx prisma migrate resolve --applied 20251201_add_meta_json_to_exports
npx prisma migrate resolve --applied 20251201_add_realtime_simulations
npx prisma migrate resolve --applied 20251201_add_updated_at_to_exports
npx prisma migrate resolve --applied 20251210213931_add_user_usage
npx prisma migrate resolve --applied 20251227_add_settings_tables

echo ""
echo "✅ All migrations marked as applied!"
echo "📊 Checking status..."
npx prisma migrate status

