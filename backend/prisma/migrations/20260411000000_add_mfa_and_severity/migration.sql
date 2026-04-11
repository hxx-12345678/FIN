-- Add MFA columns to users table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mfa_enabled') THEN
        ALTER TABLE "users" ADD COLUMN "mfa_enabled" BOOLEAN DEFAULT false NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mfa_secret') THEN
        ALTER TABLE "users" ADD COLUMN "mfa_secret" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mfa_backup_codes') THEN
        ALTER TABLE "users" ADD COLUMN "mfa_backup_codes" TEXT;
    END IF;
END $$;

-- Add severity column to alert_rules table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alert_rules' AND column_name='severity') THEN
        ALTER TABLE "alert_rules" ADD COLUMN "severity" TEXT DEFAULT 'warning' NOT NULL;
    END IF;
END $$;
