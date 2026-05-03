-- ULTIMATE FAIL-SAFE MIGRATION FOR PRODUCTION PARITY
-- This migration handles table renames and column renames with extreme case-insensitivity

DO $$
DECLARE
    found_table_name TEXT;
    found_column_name TEXT;
BEGIN
    -- Process Model: User (Target Table: users)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('users') 
                  OR LOWER(table_name) = LOWER('User')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'users' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "users"';
            found_table_name := 'users';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'users';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'users';
        END;
    END IF;
    -- Column: passwordHash -> password_hash
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('passwordHash') OR LOWER(column_name) = LOWER('password_hash'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'password_hash' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "password_hash"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'password_hash';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'password_hash';
            END;
        END IF;
    END IF;
    -- Column: isActive -> is_active
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('isActive') OR LOWER(column_name) = LOWER('is_active'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'is_active' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "is_active"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'is_active';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'is_active';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: lastLogin -> last_login
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('lastLogin') OR LOWER(column_name) = LOWER('last_login'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'last_login' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "last_login"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'last_login';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'last_login';
            END;
        END IF;
    END IF;
    -- Column: mfaEnabled -> mfa_enabled
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('mfaEnabled') OR LOWER(column_name) = LOWER('mfa_enabled'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'mfa_enabled' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "mfa_enabled"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'mfa_enabled';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'mfa_enabled';
            END;
        END IF;
    END IF;
    -- Column: mfaSecret -> mfa_secret
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('mfaSecret') OR LOWER(column_name) = LOWER('mfa_secret'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'mfa_secret' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "mfa_secret"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'mfa_secret';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'mfa_secret';
            END;
        END IF;
    END IF;
    -- Column: mfaBackupCodes -> mfa_backup_codes
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('mfaBackupCodes') OR LOWER(column_name) = LOWER('mfa_backup_codes'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'mfa_backup_codes' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "mfa_backup_codes"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'mfa_backup_codes';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'mfa_backup_codes';
            END;
        END IF;
    END IF;

    -- Process Model: Org (Target Table: orgs)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('orgs') 
                  OR LOWER(table_name) = LOWER('Org')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'orgs' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "orgs"';
            found_table_name := 'orgs';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'orgs';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'orgs';
        END;
    END IF;
    -- Column: planTier -> plan_tier
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('planTier') OR LOWER(column_name) = LOWER('plan_tier'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'plan_tier' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "plan_tier"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'plan_tier';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'plan_tier';
            END;
        END IF;
    END IF;
    -- Column: dataRegion -> data_region
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('dataRegion') OR LOWER(column_name) = LOWER('data_region'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'data_region' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "data_region"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'data_region';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'data_region';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;

    -- Process Model: UserOrgRole (Target Table: user_org_roles)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('user_org_roles') 
                  OR LOWER(table_name) = LOWER('UserOrgRole')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'user_org_roles' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "user_org_roles"';
            found_table_name := 'user_org_roles';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'user_org_roles';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'user_org_roles';
        END;
    END IF;
    -- Column: userId -> user_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('userId') OR LOWER(column_name) = LOWER('user_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'user_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "user_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'user_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'user_id';
            END;
        END IF;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;

    -- Process Model: Connector (Target Table: connectors)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('connectors') 
                  OR LOWER(table_name) = LOWER('Connector')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'connectors' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "connectors"';
            found_table_name := 'connectors';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'connectors';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'connectors';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: configJson -> config_json
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('configJson') OR LOWER(column_name) = LOWER('config_json'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'config_json' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "config_json"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'config_json';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'config_json';
            END;
        END IF;
    END IF;
    -- Column: encryptedConfig -> encrypted_config
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('encryptedConfig') OR LOWER(column_name) = LOWER('encrypted_config'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'encrypted_config' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "encrypted_config"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'encrypted_config';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'encrypted_config';
            END;
        END IF;
    END IF;
    -- Column: lastSyncedAt -> last_synced_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('lastSyncedAt') OR LOWER(column_name) = LOWER('last_synced_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'last_synced_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "last_synced_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'last_synced_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'last_synced_at';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: syncFrequencyHours -> sync_frequency_hours
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('syncFrequencyHours') OR LOWER(column_name) = LOWER('sync_frequency_hours'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'sync_frequency_hours' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "sync_frequency_hours"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'sync_frequency_hours';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'sync_frequency_hours';
            END;
        END IF;
    END IF;
    -- Column: autoSyncEnabled -> auto_sync_enabled
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('autoSyncEnabled') OR LOWER(column_name) = LOWER('auto_sync_enabled'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'auto_sync_enabled' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "auto_sync_enabled"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'auto_sync_enabled';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'auto_sync_enabled';
            END;
        END IF;
    END IF;
    -- Column: lastSyncStatus -> last_sync_status
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('lastSyncStatus') OR LOWER(column_name) = LOWER('last_sync_status'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'last_sync_status' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "last_sync_status"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'last_sync_status';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'last_sync_status';
            END;
        END IF;
    END IF;
    -- Column: lastSyncError -> last_sync_error
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('lastSyncError') OR LOWER(column_name) = LOWER('last_sync_error'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'last_sync_error' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "last_sync_error"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'last_sync_error';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'last_sync_error';
            END;
        END IF;
    END IF;
    -- Column: updatedAt -> updated_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('updatedAt') OR LOWER(column_name) = LOWER('updated_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'updated_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "updated_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'updated_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'updated_at';
            END;
        END IF;
    END IF;

    -- Process Model: RawTransaction (Target Table: raw_transactions)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('raw_transactions') 
                  OR LOWER(table_name) = LOWER('RawTransaction')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'raw_transactions' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "raw_transactions"';
            found_table_name := 'raw_transactions';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'raw_transactions';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'raw_transactions';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: connectorId -> connector_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('connectorId') OR LOWER(column_name) = LOWER('connector_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'connector_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "connector_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'connector_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'connector_id';
            END;
        END IF;
    END IF;
    -- Column: sourceId -> source_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('sourceId') OR LOWER(column_name) = LOWER('source_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'source_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "source_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'source_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'source_id';
            END;
        END IF;
    END IF;
    -- Column: rawPayload -> raw_payload
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('rawPayload') OR LOWER(column_name) = LOWER('raw_payload'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'raw_payload' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "raw_payload"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'raw_payload';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'raw_payload';
            END;
        END IF;
    END IF;
    -- Column: importedAt -> imported_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('importedAt') OR LOWER(column_name) = LOWER('imported_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'imported_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "imported_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'imported_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'imported_at';
            END;
        END IF;
    END IF;
    -- Column: importBatchId -> import_batch_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('importBatchId') OR LOWER(column_name) = LOWER('import_batch_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'import_batch_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "import_batch_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'import_batch_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'import_batch_id';
            END;
        END IF;
    END IF;
    -- Column: isDuplicate -> is_duplicate
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('isDuplicate') OR LOWER(column_name) = LOWER('is_duplicate'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'is_duplicate' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "is_duplicate"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'is_duplicate';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'is_duplicate';
            END;
        END IF;
    END IF;

    -- Process Model: DataImportBatch (Target Table: data_import_batches)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('data_import_batches') 
                  OR LOWER(table_name) = LOWER('DataImportBatch')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'data_import_batches' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "data_import_batches"';
            found_table_name := 'data_import_batches';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'data_import_batches';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'data_import_batches';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: sourceType -> source_type
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('sourceType') OR LOWER(column_name) = LOWER('source_type'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'source_type' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "source_type"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'source_type';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'source_type';
            END;
        END IF;
    END IF;
    -- Column: sourceRef -> source_ref
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('sourceRef') OR LOWER(column_name) = LOWER('source_ref'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'source_ref' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "source_ref"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'source_ref';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'source_ref';
            END;
        END IF;
    END IF;
    -- Column: fileHash -> file_hash
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('fileHash') OR LOWER(column_name) = LOWER('file_hash'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'file_hash' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "file_hash"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'file_hash';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'file_hash';
            END;
        END IF;
    END IF;
    -- Column: mappingJson -> mapping_json
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('mappingJson') OR LOWER(column_name) = LOWER('mapping_json'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'mapping_json' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "mapping_json"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'mapping_json';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'mapping_json';
            END;
        END IF;
    END IF;
    -- Column: statsJson -> stats_json
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('statsJson') OR LOWER(column_name) = LOWER('stats_json'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'stats_json' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "stats_json"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'stats_json';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'stats_json';
            END;
        END IF;
    END IF;
    -- Column: createdByUserId -> created_by_user_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdByUserId') OR LOWER(column_name) = LOWER('created_by_user_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_by_user_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_by_user_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_by_user_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_by_user_id';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;

    -- Process Model: ChartOfAccount (Target Table: chart_of_accounts)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('chart_of_accounts') 
                  OR LOWER(table_name) = LOWER('ChartOfAccount')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'chart_of_accounts' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "chart_of_accounts"';
            found_table_name := 'chart_of_accounts';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'chart_of_accounts';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'chart_of_accounts';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: mappedToModelItem -> mapped_to_model_item
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('mappedToModelItem') OR LOWER(column_name) = LOWER('mapped_to_model_item'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'mapped_to_model_item' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "mapped_to_model_item"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'mapped_to_model_item';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'mapped_to_model_item';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;

    -- Process Model: Model (Target Table: models)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('models') 
                  OR LOWER(table_name) = LOWER('Model')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'models' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "models"';
            found_table_name := 'models';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'models';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'models';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: modelJson -> model_json
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('modelJson') OR LOWER(column_name) = LOWER('model_json'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'model_json' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "model_json"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'model_json';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'model_json';
            END;
        END IF;
    END IF;
    -- Column: createdById -> created_by_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdById') OR LOWER(column_name) = LOWER('created_by_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_by_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_by_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_by_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_by_id';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;

    -- Process Model: ModelRun (Target Table: model_runs)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('model_runs') 
                  OR LOWER(table_name) = LOWER('ModelRun')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'model_runs' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "model_runs"';
            found_table_name := 'model_runs';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'model_runs';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'model_runs';
        END;
    END IF;
    -- Column: modelId -> model_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('modelId') OR LOWER(column_name) = LOWER('model_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'model_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "model_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'model_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'model_id';
            END;
        END IF;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: runType -> run_type
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('runType') OR LOWER(column_name) = LOWER('run_type'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'run_type' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "run_type"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'run_type';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'run_type';
            END;
        END IF;
    END IF;
    -- Column: paramsJson -> params_json
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('paramsJson') OR LOWER(column_name) = LOWER('params_json'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'params_json' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "params_json"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'params_json';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'params_json';
            END;
        END IF;
    END IF;
    -- Column: resultS3 -> result_s3
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('resultS3') OR LOWER(column_name) = LOWER('result_s3'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'result_s3' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "result_s3"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'result_s3';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'result_s3';
            END;
        END IF;
    END IF;
    -- Column: summaryJson -> summary_json
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('summaryJson') OR LOWER(column_name) = LOWER('summary_json'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'summary_json' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "summary_json"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'summary_json';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'summary_json';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: finishedAt -> finished_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('finishedAt') OR LOWER(column_name) = LOWER('finished_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'finished_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "finished_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'finished_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'finished_at';
            END;
        END IF;
    END IF;

    -- Process Model: MonteCarloJob (Target Table: monte_carlo_jobs)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('monte_carlo_jobs') 
                  OR LOWER(table_name) = LOWER('MonteCarloJob')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'monte_carlo_jobs' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "monte_carlo_jobs"';
            found_table_name := 'monte_carlo_jobs';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'monte_carlo_jobs';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'monte_carlo_jobs';
        END;
    END IF;
    -- Column: modelRunId -> model_run_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('modelRunId') OR LOWER(column_name) = LOWER('model_run_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'model_run_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "model_run_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'model_run_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'model_run_id';
            END;
        END IF;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: numSimulations -> num_simulations
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('numSimulations') OR LOWER(column_name) = LOWER('num_simulations'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'num_simulations' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "num_simulations"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'num_simulations';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'num_simulations';
            END;
        END IF;
    END IF;
    -- Column: paramsHash -> params_hash
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('paramsHash') OR LOWER(column_name) = LOWER('params_hash'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'params_hash' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "params_hash"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'params_hash';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'params_hash';
            END;
        END IF;
    END IF;
    -- Column: resultS3 -> result_s3
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('resultS3') OR LOWER(column_name) = LOWER('result_s3'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'result_s3' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "result_s3"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'result_s3';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'result_s3';
            END;
        END IF;
    END IF;
    -- Column: percentilesJson -> percentiles_json
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('percentilesJson') OR LOWER(column_name) = LOWER('percentiles_json'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'percentiles_json' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "percentiles_json"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'percentiles_json';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'percentiles_json';
            END;
        END IF;
    END IF;
    -- Column: cpuSecondsEstimate -> cpu_seconds_estimate
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('cpuSecondsEstimate') OR LOWER(column_name) = LOWER('cpu_seconds_estimate'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'cpu_seconds_estimate' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "cpu_seconds_estimate"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'cpu_seconds_estimate';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'cpu_seconds_estimate';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: finishedAt -> finished_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('finishedAt') OR LOWER(column_name) = LOWER('finished_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'finished_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "finished_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'finished_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'finished_at';
            END;
        END IF;
    END IF;
    -- Column: sensitivityJson -> sensitivity_json
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('sensitivityJson') OR LOWER(column_name) = LOWER('sensitivity_json'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'sensitivity_json' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "sensitivity_json"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'sensitivity_json';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'sensitivity_json';
            END;
        END IF;
    END IF;
    -- Column: confidenceLevel -> confidence_level
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('confidenceLevel') OR LOWER(column_name) = LOWER('confidence_level'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'confidence_level' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "confidence_level"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'confidence_level';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'confidence_level';
            END;
        END IF;
    END IF;
    -- Column: cpuSecondsActual -> cpu_seconds_actual
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('cpuSecondsActual') OR LOWER(column_name) = LOWER('cpu_seconds_actual'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'cpu_seconds_actual' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "cpu_seconds_actual"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'cpu_seconds_actual';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'cpu_seconds_actual';
            END;
        END IF;
    END IF;

    -- Process Model: Driver (Target Table: drivers)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('drivers') 
                  OR LOWER(table_name) = LOWER('Driver')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'drivers' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "drivers"';
            found_table_name := 'drivers';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'drivers';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'drivers';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: modelId -> model_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('modelId') OR LOWER(column_name) = LOWER('model_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'model_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "model_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'model_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'model_id';
            END;
        END IF;
    END IF;
    -- Column: timeGranularity -> time_granularity
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('timeGranularity') OR LOWER(column_name) = LOWER('time_granularity'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'time_granularity' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "time_granularity"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'time_granularity';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'time_granularity';
            END;
        END IF;
    END IF;
    -- Column: isCalculated -> is_calculated
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('isCalculated') OR LOWER(column_name) = LOWER('is_calculated'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'is_calculated' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "is_calculated"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'is_calculated';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'is_calculated';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: updatedAt -> updated_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('updatedAt') OR LOWER(column_name) = LOWER('updated_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'updated_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "updated_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'updated_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'updated_at';
            END;
        END IF;
    END IF;
    -- Column: isLocked -> is_locked
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('isLocked') OR LOWER(column_name) = LOWER('is_locked'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'is_locked' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "is_locked"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'is_locked';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'is_locked';
            END;
        END IF;
    END IF;
    -- Column: maxRange -> max_range
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('maxRange') OR LOWER(column_name) = LOWER('max_range'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'max_range' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "max_range"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'max_range';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'max_range';
            END;
        END IF;
    END IF;
    -- Column: minRange -> min_range
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('minRange') OR LOWER(column_name) = LOWER('min_range'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'min_range' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "min_range"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'min_range';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'min_range';
            END;
        END IF;
    END IF;

    -- Process Model: DriverValue (Target Table: driver_values)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('driver_values') 
                  OR LOWER(table_name) = LOWER('DriverValue')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'driver_values' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "driver_values"';
            found_table_name := 'driver_values';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'driver_values';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'driver_values';
        END;
    END IF;
    -- Column: driverId -> driver_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('driverId') OR LOWER(column_name) = LOWER('driver_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'driver_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "driver_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'driver_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'driver_id';
            END;
        END IF;
    END IF;
    -- Column: scenarioId -> scenario_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('scenarioId') OR LOWER(column_name) = LOWER('scenario_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'scenario_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "scenario_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'scenario_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'scenario_id';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: updatedAt -> updated_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('updatedAt') OR LOWER(column_name) = LOWER('updated_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'updated_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "updated_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'updated_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'updated_at';
            END;
        END IF;
    END IF;

    -- Process Model: FinancialScenario (Target Table: financial_scenarios)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('financial_scenarios') 
                  OR LOWER(table_name) = LOWER('FinancialScenario')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'financial_scenarios' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "financial_scenarios"';
            found_table_name := 'financial_scenarios';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'financial_scenarios';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'financial_scenarios';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: modelId -> model_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('modelId') OR LOWER(column_name) = LOWER('model_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'model_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "model_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'model_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'model_id';
            END;
        END IF;
    END IF;
    -- Column: isDefault -> is_default
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('isDefault') OR LOWER(column_name) = LOWER('is_default'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'is_default' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "is_default"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'is_default';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'is_default';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: updatedAt -> updated_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('updatedAt') OR LOWER(column_name) = LOWER('updated_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'updated_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "updated_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'updated_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'updated_at';
            END;
        END IF;
    END IF;

    -- Process Model: DriverFormula (Target Table: driver_formulas)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('driver_formulas') 
                  OR LOWER(table_name) = LOWER('DriverFormula')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'driver_formulas' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "driver_formulas"';
            found_table_name := 'driver_formulas';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'driver_formulas';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'driver_formulas';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: modelId -> model_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('modelId') OR LOWER(column_name) = LOWER('model_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'model_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "model_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'model_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'model_id';
            END;
        END IF;
    END IF;
    -- Column: driverId -> driver_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('driverId') OR LOWER(column_name) = LOWER('driver_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'driver_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "driver_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'driver_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'driver_id';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: updatedAt -> updated_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('updatedAt') OR LOWER(column_name) = LOWER('updated_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'updated_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "updated_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'updated_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'updated_at';
            END;
        END IF;
    END IF;

    -- Process Model: Dimension (Target Table: dimensions)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('dimensions') 
                  OR LOWER(table_name) = LOWER('Dimension')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'dimensions' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "dimensions"';
            found_table_name := 'dimensions';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'dimensions';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'dimensions';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: modelId -> model_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('modelId') OR LOWER(column_name) = LOWER('model_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'model_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "model_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'model_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'model_id';
            END;
        END IF;
    END IF;
    -- Column: displayOrder -> display_order
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('displayOrder') OR LOWER(column_name) = LOWER('display_order'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'display_order' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "display_order"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'display_order';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'display_order';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: updatedAt -> updated_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('updatedAt') OR LOWER(column_name) = LOWER('updated_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'updated_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "updated_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'updated_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'updated_at';
            END;
        END IF;
    END IF;

    -- Process Model: DimensionMember (Target Table: dimension_members)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('dimension_members') 
                  OR LOWER(table_name) = LOWER('DimensionMember')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'dimension_members' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "dimension_members"';
            found_table_name := 'dimension_members';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'dimension_members';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'dimension_members';
        END;
    END IF;
    -- Column: dimensionId -> dimension_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('dimensionId') OR LOWER(column_name) = LOWER('dimension_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'dimension_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "dimension_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'dimension_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'dimension_id';
            END;
        END IF;
    END IF;
    -- Column: parentId -> parent_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('parentId') OR LOWER(column_name) = LOWER('parent_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'parent_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "parent_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'parent_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'parent_id';
            END;
        END IF;
    END IF;
    -- Column: displayOrder -> display_order
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('displayOrder') OR LOWER(column_name) = LOWER('display_order'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'display_order' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "display_order"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'display_order';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'display_order';
            END;
        END IF;
    END IF;
    -- Column: isActive -> is_active
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('isActive') OR LOWER(column_name) = LOWER('is_active'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'is_active' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "is_active"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'is_active';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'is_active';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: updatedAt -> updated_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('updatedAt') OR LOWER(column_name) = LOWER('updated_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'updated_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "updated_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'updated_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'updated_at';
            END;
        END IF;
    END IF;

    -- Process Model: MetricCube (Target Table: metric_cube)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('metric_cube') 
                  OR LOWER(table_name) = LOWER('MetricCube')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'metric_cube' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "metric_cube"';
            found_table_name := 'metric_cube';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'metric_cube';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'metric_cube';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: modelId -> model_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('modelId') OR LOWER(column_name) = LOWER('model_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'model_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "model_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'model_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'model_id';
            END;
        END IF;
    END IF;
    -- Column: metricName -> metric_name
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('metricName') OR LOWER(column_name) = LOWER('metric_name'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'metric_name' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "metric_name"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'metric_name';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'metric_name';
            END;
        END IF;
    END IF;
    -- Column: geographyId -> geography_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('geographyId') OR LOWER(column_name) = LOWER('geography_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'geography_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "geography_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'geography_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'geography_id';
            END;
        END IF;
    END IF;
    -- Column: productId -> product_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('productId') OR LOWER(column_name) = LOWER('product_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'product_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "product_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'product_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'product_id';
            END;
        END IF;
    END IF;
    -- Column: departmentId -> department_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('departmentId') OR LOWER(column_name) = LOWER('department_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'department_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "department_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'department_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'department_id';
            END;
        END IF;
    END IF;
    -- Column: segmentId -> segment_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('segmentId') OR LOWER(column_name) = LOWER('segment_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'segment_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "segment_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'segment_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'segment_id';
            END;
        END IF;
    END IF;
    -- Column: channelId -> channel_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('channelId') OR LOWER(column_name) = LOWER('channel_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'channel_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "channel_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'channel_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'channel_id';
            END;
        END IF;
    END IF;
    -- Column: scenarioId -> scenario_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('scenarioId') OR LOWER(column_name) = LOWER('scenario_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'scenario_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "scenario_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'scenario_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'scenario_id';
            END;
        END IF;
    END IF;
    -- Column: customDim1Id -> custom_dim1_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('customDim1Id') OR LOWER(column_name) = LOWER('custom_dim1_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'custom_dim1_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "custom_dim1_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'custom_dim1_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'custom_dim1_id';
            END;
        END IF;
    END IF;
    -- Column: customDim2Id -> custom_dim2_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('customDim2Id') OR LOWER(column_name) = LOWER('custom_dim2_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'custom_dim2_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "custom_dim2_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'custom_dim2_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'custom_dim2_id';
            END;
        END IF;
    END IF;
    -- Column: isCalculated -> is_calculated
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('isCalculated') OR LOWER(column_name) = LOWER('is_calculated'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'is_calculated' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "is_calculated"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'is_calculated';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'is_calculated';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: updatedAt -> updated_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('updatedAt') OR LOWER(column_name) = LOWER('updated_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'updated_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "updated_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'updated_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'updated_at';
            END;
        END IF;
    END IF;

    -- Process Model: Prompt (Target Table: prompts)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('prompts') 
                  OR LOWER(table_name) = LOWER('Prompt')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'prompts' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "prompts"';
            found_table_name := 'prompts';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'prompts';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'prompts';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: userId -> user_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('userId') OR LOWER(column_name) = LOWER('user_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'user_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "user_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'user_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'user_id';
            END;
        END IF;
    END IF;
    -- Column: promptTemplate -> prompt_template
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('promptTemplate') OR LOWER(column_name) = LOWER('prompt_template'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'prompt_template' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "prompt_template"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'prompt_template';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'prompt_template';
            END;
        END IF;
    END IF;
    -- Column: renderedPrompt -> rendered_prompt
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('renderedPrompt') OR LOWER(column_name) = LOWER('rendered_prompt'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'rendered_prompt' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "rendered_prompt"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'rendered_prompt';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'rendered_prompt';
            END;
        END IF;
    END IF;
    -- Column: responseText -> response_text
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('responseText') OR LOWER(column_name) = LOWER('response_text'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'response_text' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "response_text"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'response_text';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'response_text';
            END;
        END IF;
    END IF;
    -- Column: modelUsed -> model_used
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('modelUsed') OR LOWER(column_name) = LOWER('model_used'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'model_used' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "model_used"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'model_used';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'model_used';
            END;
        END IF;
    END IF;
    -- Column: tokensUsed -> tokens_used
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('tokensUsed') OR LOWER(column_name) = LOWER('tokens_used'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'tokens_used' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "tokens_used"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'tokens_used';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'tokens_used';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;

    -- Process Model: ProvenanceEntry (Target Table: provenance_entries)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('provenance_entries') 
                  OR LOWER(table_name) = LOWER('ProvenanceEntry')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'provenance_entries' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "provenance_entries"';
            found_table_name := 'provenance_entries';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'provenance_entries';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'provenance_entries';
        END;
    END IF;
    -- Column: modelRunId -> model_run_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('modelRunId') OR LOWER(column_name) = LOWER('model_run_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'model_run_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "model_run_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'model_run_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'model_run_id';
            END;
        END IF;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: cellKey -> cell_key
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('cellKey') OR LOWER(column_name) = LOWER('cell_key'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'cell_key' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "cell_key"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'cell_key';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'cell_key';
            END;
        END IF;
    END IF;
    -- Column: sourceType -> source_type
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('sourceType') OR LOWER(column_name) = LOWER('source_type'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'source_type' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "source_type"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'source_type';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'source_type';
            END;
        END IF;
    END IF;
    -- Column: sourceRef -> source_ref
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('sourceRef') OR LOWER(column_name) = LOWER('source_ref'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'source_ref' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "source_ref"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'source_ref';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'source_ref';
            END;
        END IF;
    END IF;
    -- Column: promptId -> prompt_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('promptId') OR LOWER(column_name) = LOWER('prompt_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'prompt_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "prompt_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'prompt_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'prompt_id';
            END;
        END IF;
    END IF;
    -- Column: confidenceScore -> confidence_score
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('confidenceScore') OR LOWER(column_name) = LOWER('confidence_score'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'confidence_score' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "confidence_score"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'confidence_score';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'confidence_score';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;

    -- Process Model: Export (Target Table: exports)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('exports') 
                  OR LOWER(table_name) = LOWER('Export')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'exports' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "exports"';
            found_table_name := 'exports';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'exports';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'exports';
        END;
    END IF;
    -- Column: modelRunId -> model_run_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('modelRunId') OR LOWER(column_name) = LOWER('model_run_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'model_run_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "model_run_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'model_run_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'model_run_id';
            END;
        END IF;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: s3Key -> s3_key
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('s3Key') OR LOWER(column_name) = LOWER('s3_key'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 's3_key' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "s3_key"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 's3_key';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 's3_key';
            END;
        END IF;
    END IF;
    -- Column: createdById -> created_by_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdById') OR LOWER(column_name) = LOWER('created_by_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_by_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_by_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_by_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_by_id';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: provenanceAppendix -> provenance_appendix
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('provenanceAppendix') OR LOWER(column_name) = LOWER('provenance_appendix'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'provenance_appendix' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "provenance_appendix"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'provenance_appendix';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'provenance_appendix';
            END;
        END IF;
    END IF;
    -- Column: fileData -> file_data
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('fileData') OR LOWER(column_name) = LOWER('file_data'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'file_data' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "file_data"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'file_data';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'file_data';
            END;
        END IF;
    END IF;
    -- Column: metaJson -> meta_json
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('metaJson') OR LOWER(column_name) = LOWER('meta_json'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'meta_json' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "meta_json"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'meta_json';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'meta_json';
            END;
        END IF;
    END IF;
    -- Column: updatedAt -> updated_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('updatedAt') OR LOWER(column_name) = LOWER('updated_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'updated_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "updated_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'updated_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'updated_at';
            END;
        END IF;
    END IF;

    -- Process Model: Job (Target Table: jobs)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('jobs') 
                  OR LOWER(table_name) = LOWER('Job')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'jobs' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "jobs"';
            found_table_name := 'jobs';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'jobs';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'jobs';
        END;
    END IF;
    -- Column: jobType -> job_type
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('jobType') OR LOWER(column_name) = LOWER('job_type'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'job_type' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "job_type"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'job_type';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'job_type';
            END;
        END IF;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: objectId -> object_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('objectId') OR LOWER(column_name) = LOWER('object_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'object_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "object_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'object_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'object_id';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: updatedAt -> updated_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('updatedAt') OR LOWER(column_name) = LOWER('updated_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'updated_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "updated_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'updated_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'updated_at';
            END;
        END IF;
    END IF;
    -- Column: maxAttempts -> max_attempts
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('maxAttempts') OR LOWER(column_name) = LOWER('max_attempts'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'max_attempts' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "max_attempts"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'max_attempts';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'max_attempts';
            END;
        END IF;
    END IF;
    -- Column: lastError -> last_error
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('lastError') OR LOWER(column_name) = LOWER('last_error'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'last_error' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "last_error"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'last_error';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'last_error';
            END;
        END IF;
    END IF;
    -- Column: nextRunAt -> next_run_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('nextRunAt') OR LOWER(column_name) = LOWER('next_run_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'next_run_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "next_run_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'next_run_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'next_run_at';
            END;
        END IF;
    END IF;
    -- Column: workerId -> worker_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('workerId') OR LOWER(column_name) = LOWER('worker_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'worker_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "worker_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'worker_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'worker_id';
            END;
        END IF;
    END IF;
    -- Column: runStartedAt -> run_started_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('runStartedAt') OR LOWER(column_name) = LOWER('run_started_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'run_started_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "run_started_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'run_started_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'run_started_at';
            END;
        END IF;
    END IF;
    -- Column: visibilityExpiresAt -> visibility_expires_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('visibilityExpiresAt') OR LOWER(column_name) = LOWER('visibility_expires_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'visibility_expires_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "visibility_expires_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'visibility_expires_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'visibility_expires_at';
            END;
        END IF;
    END IF;
    -- Column: finishedAt -> finished_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('finishedAt') OR LOWER(column_name) = LOWER('finished_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'finished_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "finished_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'finished_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'finished_at';
            END;
        END IF;
    END IF;
    -- Column: cancelRequested -> cancel_requested
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('cancelRequested') OR LOWER(column_name) = LOWER('cancel_requested'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'cancel_requested' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "cancel_requested"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'cancel_requested';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'cancel_requested';
            END;
        END IF;
    END IF;
    -- Column: createdByUserId -> created_by_user_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdByUserId') OR LOWER(column_name) = LOWER('created_by_user_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_by_user_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_by_user_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_by_user_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_by_user_id';
            END;
        END IF;
    END IF;
    -- Column: billingEstimate -> billing_estimate
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('billingEstimate') OR LOWER(column_name) = LOWER('billing_estimate'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'billing_estimate' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "billing_estimate"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'billing_estimate';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'billing_estimate';
            END;
        END IF;
    END IF;
    -- Column: idempotencyKey -> idempotency_key
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('idempotencyKey') OR LOWER(column_name) = LOWER('idempotency_key'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'idempotency_key' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "idempotency_key"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'idempotency_key';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'idempotency_key';
            END;
        END IF;
    END IF;

    -- Process Model: BoardReportSchedule (Target Table: board_report_schedules)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('board_report_schedules') 
                  OR LOWER(table_name) = LOWER('BoardReportSchedule')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'board_report_schedules' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "board_report_schedules"';
            found_table_name := 'board_report_schedules';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'board_report_schedules';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'board_report_schedules';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: scheduleType -> schedule_type
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('scheduleType') OR LOWER(column_name) = LOWER('schedule_type'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'schedule_type' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "schedule_type"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'schedule_type';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'schedule_type';
            END;
        END IF;
    END IF;
    -- Column: distributionMethod -> distribution_method
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('distributionMethod') OR LOWER(column_name) = LOWER('distribution_method'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'distribution_method' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "distribution_method"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'distribution_method';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'distribution_method';
            END;
        END IF;
    END IF;
    -- Column: ccRecipients -> cc_recipients
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('ccRecipients') OR LOWER(column_name) = LOWER('cc_recipients'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'cc_recipients' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "cc_recipients"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'cc_recipients';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'cc_recipients';
            END;
        END IF;
    END IF;
    -- Column: nextRunAt -> next_run_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('nextRunAt') OR LOWER(column_name) = LOWER('next_run_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'next_run_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "next_run_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'next_run_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'next_run_at';
            END;
        END IF;
    END IF;
    -- Column: lastRunAt -> last_run_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('lastRunAt') OR LOWER(column_name) = LOWER('last_run_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'last_run_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "last_run_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'last_run_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'last_run_at';
            END;
        END IF;
    END IF;
    -- Column: createdById -> created_by_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdById') OR LOWER(column_name) = LOWER('created_by_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_by_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_by_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_by_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_by_id';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: updatedAt -> updated_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('updatedAt') OR LOWER(column_name) = LOWER('updated_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'updated_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "updated_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'updated_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'updated_at';
            END;
        END IF;
    END IF;

    -- Process Model: AuditLog (Target Table: audit_logs)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('audit_logs') 
                  OR LOWER(table_name) = LOWER('AuditLog')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'audit_logs' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "audit_logs"';
            found_table_name := 'audit_logs';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'audit_logs';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'audit_logs';
        END;
    END IF;
    -- Column: actorUserId -> actor_user_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('actorUserId') OR LOWER(column_name) = LOWER('actor_user_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'actor_user_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "actor_user_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'actor_user_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'actor_user_id';
            END;
        END IF;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: objectType -> object_type
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('objectType') OR LOWER(column_name) = LOWER('object_type'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'object_type' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "object_type"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'object_type';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'object_type';
            END;
        END IF;
    END IF;
    -- Column: objectId -> object_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('objectId') OR LOWER(column_name) = LOWER('object_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'object_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "object_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'object_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'object_id';
            END;
        END IF;
    END IF;
    -- Column: metaJson -> meta_json
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('metaJson') OR LOWER(column_name) = LOWER('meta_json'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'meta_json' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "meta_json"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'meta_json';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'meta_json';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;

    -- Process Model: ShareToken (Target Table: share_tokens)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('share_tokens') 
                  OR LOWER(table_name) = LOWER('ShareToken')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'share_tokens' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "share_tokens"';
            found_table_name := 'share_tokens';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'share_tokens';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'share_tokens';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: expiresAt -> expires_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('expiresAt') OR LOWER(column_name) = LOWER('expires_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'expires_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "expires_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'expires_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'expires_at';
            END;
        END IF;
    END IF;
    -- Column: createdById -> created_by_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdById') OR LOWER(column_name) = LOWER('created_by_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_by_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_by_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_by_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_by_id';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;

    -- Process Model: InvitationToken (Target Table: invitation_tokens)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('invitation_tokens') 
                  OR LOWER(table_name) = LOWER('InvitationToken')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'invitation_tokens' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "invitation_tokens"';
            found_table_name := 'invitation_tokens';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'invitation_tokens';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'invitation_tokens';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: expiresAt -> expires_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('expiresAt') OR LOWER(column_name) = LOWER('expires_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'expires_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "expires_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'expires_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'expires_at';
            END;
        END IF;
    END IF;
    -- Column: usedAt -> used_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('usedAt') OR LOWER(column_name) = LOWER('used_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'used_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "used_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'used_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'used_at';
            END;
        END IF;
    END IF;
    -- Column: createdById -> created_by_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdById') OR LOWER(column_name) = LOWER('created_by_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_by_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_by_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_by_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_by_id';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;

    -- Process Model: BillingUsage (Target Table: billing_usage)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('billing_usage') 
                  OR LOWER(table_name) = LOWER('BillingUsage')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'billing_usage' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "billing_usage"';
            found_table_name := 'billing_usage';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'billing_usage';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'billing_usage';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: bucketTime -> bucket_time
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('bucketTime') OR LOWER(column_name) = LOWER('bucket_time'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'bucket_time' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "bucket_time"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'bucket_time';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'bucket_time';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;

    -- Process Model: AlertRule (Target Table: alert_rules)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('alert_rules') 
                  OR LOWER(table_name) = LOWER('AlertRule')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'alert_rules' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "alert_rules"';
            found_table_name := 'alert_rules';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'alert_rules';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'alert_rules';
        END;
    END IF;
    -- Column: notifyEmail -> notify_email
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('notifyEmail') OR LOWER(column_name) = LOWER('notify_email'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'notify_email' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "notify_email"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'notify_email';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'notify_email';
            END;
        END IF;
    END IF;
    -- Column: notifySlack -> notify_slack
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('notifySlack') OR LOWER(column_name) = LOWER('notify_slack'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'notify_slack' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "notify_slack"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'notify_slack';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'notify_slack';
            END;
        END IF;
    END IF;
    -- Column: slackWebhook -> slack_webhook
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('slackWebhook') OR LOWER(column_name) = LOWER('slack_webhook'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'slack_webhook' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "slack_webhook"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'slack_webhook';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'slack_webhook';
            END;
        END IF;
    END IF;
    -- Column: lastTriggered -> last_triggered
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('lastTriggered') OR LOWER(column_name) = LOWER('last_triggered'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'last_triggered' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "last_triggered"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'last_triggered';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'last_triggered';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: updatedAt -> updated_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('updatedAt') OR LOWER(column_name) = LOWER('updated_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'updated_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "updated_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'updated_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'updated_at';
            END;
        END IF;
    END IF;
    -- Column: createdById -> created_by_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdById') OR LOWER(column_name) = LOWER('created_by_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_by_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_by_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_by_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_by_id';
            END;
        END IF;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;

    -- Process Model: AICFOPlan (Target Table: ai_cfo_plans)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('ai_cfo_plans') 
                  OR LOWER(table_name) = LOWER('AICFOPlan')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'ai_cfo_plans' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "ai_cfo_plans"';
            found_table_name := 'ai_cfo_plans';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'ai_cfo_plans';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'ai_cfo_plans';
        END;
    END IF;
    -- Column: planJson -> plan_json
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('planJson') OR LOWER(column_name) = LOWER('plan_json'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'plan_json' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "plan_json"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'plan_json';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'plan_json';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: updatedAt -> updated_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('updatedAt') OR LOWER(column_name) = LOWER('updated_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'updated_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "updated_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'updated_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'updated_at';
            END;
        END IF;
    END IF;
    -- Column: createdById -> created_by_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdById') OR LOWER(column_name) = LOWER('created_by_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_by_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_by_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_by_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_by_id';
            END;
        END IF;
    END IF;
    -- Column: modelRunId -> model_run_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('modelRunId') OR LOWER(column_name) = LOWER('model_run_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'model_run_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "model_run_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'model_run_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'model_run_id';
            END;
        END IF;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;

    -- Process Model: AICFOConversation (Target Table: ai_cfo_conversations)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('ai_cfo_conversations') 
                  OR LOWER(table_name) = LOWER('AICFOConversation')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'ai_cfo_conversations' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "ai_cfo_conversations"';
            found_table_name := 'ai_cfo_conversations';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'ai_cfo_conversations';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'ai_cfo_conversations';
        END;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: updatedAt -> updated_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('updatedAt') OR LOWER(column_name) = LOWER('updated_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'updated_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "updated_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'updated_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'updated_at';
            END;
        END IF;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: userId -> user_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('userId') OR LOWER(column_name) = LOWER('user_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'user_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "user_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'user_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'user_id';
            END;
        END IF;
    END IF;

    -- Process Model: AICFOMessage (Target Table: ai_cfo_messages)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('ai_cfo_messages') 
                  OR LOWER(table_name) = LOWER('AICFOMessage')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'ai_cfo_messages' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "ai_cfo_messages"';
            found_table_name := 'ai_cfo_messages';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'ai_cfo_messages';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'ai_cfo_messages';
        END;
    END IF;
    -- Column: agentType -> agent_type
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('agentType') OR LOWER(column_name) = LOWER('agent_type'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'agent_type' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "agent_type"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'agent_type';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'agent_type';
            END;
        END IF;
    END IF;
    -- Column: dataSources -> data_sources
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('dataSources') OR LOWER(column_name) = LOWER('data_sources'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'data_sources' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "data_sources"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'data_sources';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'data_sources';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: conversationId -> conversation_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('conversationId') OR LOWER(column_name) = LOWER('conversation_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'conversation_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "conversation_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'conversation_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'conversation_id';
            END;
        END IF;
    END IF;

    -- Process Model: ComputationTrace (Target Table: computation_traces)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('computation_traces') 
                  OR LOWER(table_name) = LOWER('ComputationTrace')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'computation_traces' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "computation_traces"';
            found_table_name := 'computation_traces';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'computation_traces';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'computation_traces';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: modelId -> model_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('modelId') OR LOWER(column_name) = LOWER('model_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'model_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "model_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'model_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'model_id';
            END;
        END IF;
    END IF;
    -- Column: triggerNodeId -> trigger_node_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('triggerNodeId') OR LOWER(column_name) = LOWER('trigger_node_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'trigger_node_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "trigger_node_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'trigger_node_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'trigger_node_id';
            END;
        END IF;
    END IF;
    -- Column: triggerUserId -> trigger_user_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('triggerUserId') OR LOWER(column_name) = LOWER('trigger_user_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'trigger_user_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "trigger_user_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'trigger_user_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'trigger_user_id';
            END;
        END IF;
    END IF;
    -- Column: affectedNodes -> affected_nodes
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('affectedNodes') OR LOWER(column_name) = LOWER('affected_nodes'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'affected_nodes' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "affected_nodes"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'affected_nodes';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'affected_nodes';
            END;
        END IF;
    END IF;
    -- Column: durationMs -> duration_ms
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('durationMs') OR LOWER(column_name) = LOWER('duration_ms'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'duration_ms' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "duration_ms"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'duration_ms';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'duration_ms';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;

    -- Process Model: Forecast (Target Table: forecasts)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('forecasts') 
                  OR LOWER(table_name) = LOWER('Forecast')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'forecasts' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "forecasts"';
            found_table_name := 'forecasts';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'forecasts';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'forecasts';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: modelId -> model_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('modelId') OR LOWER(column_name) = LOWER('model_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'model_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "model_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'model_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'model_id';
            END;
        END IF;
    END IF;
    -- Column: metricName -> metric_name
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('metricName') OR LOWER(column_name) = LOWER('metric_name'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'metric_name' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "metric_name"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'metric_name';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'metric_name';
            END;
        END IF;
    END IF;
    -- Column: forecastData -> forecast_data
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('forecastData') OR LOWER(column_name) = LOWER('forecast_data'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'forecast_data' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "forecast_data"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'forecast_data';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'forecast_data';
            END;
        END IF;
    END IF;
    -- Column: historicalData -> historical_data
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('historicalData') OR LOWER(column_name) = LOWER('historical_data'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'historical_data' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "historical_data"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'historical_data';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'historical_data';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;

    -- Process Model: Notification (Target Table: notifications)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('notifications') 
                  OR LOWER(table_name) = LOWER('Notification')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'notifications' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "notifications"';
            found_table_name := 'notifications';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'notifications';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'notifications';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: userId -> user_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('userId') OR LOWER(column_name) = LOWER('user_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'user_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "user_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'user_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'user_id';
            END;
        END IF;
    END IF;
    -- Column: readAt -> read_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('readAt') OR LOWER(column_name) = LOWER('read_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'read_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "read_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'read_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'read_at';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;

    -- Process Model: NotificationChannel (Target Table: notification_channels)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('notification_channels') 
                  OR LOWER(table_name) = LOWER('NotificationChannel')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'notification_channels' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "notification_channels"';
            found_table_name := 'notification_channels';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'notification_channels';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'notification_channels';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: userId -> user_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('userId') OR LOWER(column_name) = LOWER('user_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'user_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "user_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'user_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'user_id';
            END;
        END IF;
    END IF;
    -- Column: configJson -> config_json
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('configJson') OR LOWER(column_name) = LOWER('config_json'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'config_json' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "config_json"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'config_json';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'config_json';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: updatedAt -> updated_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('updatedAt') OR LOWER(column_name) = LOWER('updated_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'updated_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "updated_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'updated_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'updated_at';
            END;
        END IF;
    END IF;

    -- Process Model: OrgSettings (Target Table: org_settings)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('org_settings') 
                  OR LOWER(table_name) = LOWER('OrgSettings')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'org_settings' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "org_settings"';
            found_table_name := 'org_settings';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'org_settings';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'org_settings';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: dataRetentionDays -> data_retention_days
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('dataRetentionDays') OR LOWER(column_name) = LOWER('data_retention_days'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'data_retention_days' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "data_retention_days"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'data_retention_days';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'data_retention_days';
            END;
        END IF;
    END IF;
    -- Column: updatedById -> updated_by_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('updatedById') OR LOWER(column_name) = LOWER('updated_by_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'updated_by_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "updated_by_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'updated_by_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'updated_by_id';
            END;
        END IF;
    END IF;
    -- Column: updatedAt -> updated_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('updatedAt') OR LOWER(column_name) = LOWER('updated_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'updated_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "updated_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'updated_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'updated_at';
            END;
        END IF;
    END IF;
    -- Column: complianceJson -> compliance_json
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('complianceJson') OR LOWER(column_name) = LOWER('compliance_json'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'compliance_json' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "compliance_json"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'compliance_json';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'compliance_json';
            END;
        END IF;
    END IF;
    -- Column: securityControlsJson -> security_controls_json
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('securityControlsJson') OR LOWER(column_name) = LOWER('security_controls_json'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'security_controls_json' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "security_controls_json"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'security_controls_json';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'security_controls_json';
            END;
        END IF;
    END IF;
    -- Column: policiesJson -> policies_json
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('policiesJson') OR LOWER(column_name) = LOWER('policies_json'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'policies_json' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "policies_json"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'policies_json';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'policies_json';
            END;
        END IF;
    END IF;
    -- Column: metaJson -> meta_json
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('metaJson') OR LOWER(column_name) = LOWER('meta_json'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'meta_json' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "meta_json"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'meta_json';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'meta_json';
            END;
        END IF;
    END IF;

    -- Process Model: UserPreferences (Target Table: user_preferences)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('user_preferences') 
                  OR LOWER(table_name) = LOWER('UserPreferences')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'user_preferences' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "user_preferences"';
            found_table_name := 'user_preferences';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'user_preferences';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'user_preferences';
        END;
    END IF;
    -- Column: userId -> user_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('userId') OR LOWER(column_name) = LOWER('user_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'user_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "user_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'user_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'user_id';
            END;
        END IF;
    END IF;

    -- Process Model: OrgDetails (Target Table: org_details)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('org_details') 
                  OR LOWER(table_name) = LOWER('OrgDetails')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'org_details' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "org_details"';
            found_table_name := 'org_details';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'org_details';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'org_details';
        END;
    END IF;

    -- Process Model: LocalizationSettings (Target Table: localization_settings)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('localization_settings') 
                  OR LOWER(table_name) = LOWER('LocalizationSettings')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'localization_settings' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "localization_settings"';
            found_table_name := 'localization_settings';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'localization_settings';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'localization_settings';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;

    -- Process Model: HeadcountPlan (Target Table: headcount_plans)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('headcount_plans') 
                  OR LOWER(table_name) = LOWER('HeadcountPlan')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'headcount_plans' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "headcount_plans"';
            found_table_name := 'headcount_plans';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'headcount_plans';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'headcount_plans';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: benefitsMultiplier -> benefits_multiplier
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('benefitsMultiplier') OR LOWER(column_name) = LOWER('benefits_multiplier'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'benefits_multiplier' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "benefits_multiplier"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'benefits_multiplier';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'benefits_multiplier';
            END;
        END IF;
    END IF;
    -- Column: totalAnnualCost -> total_annual_cost
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('totalAnnualCost') OR LOWER(column_name) = LOWER('total_annual_cost'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'total_annual_cost' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "total_annual_cost"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'total_annual_cost';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'total_annual_cost';
            END;
        END IF;
    END IF;
    -- Column: startDate -> start_date
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('startDate') OR LOWER(column_name) = LOWER('start_date'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'start_date' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "start_date"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'start_date';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'start_date';
            END;
        END IF;
    END IF;
    -- Column: endDate -> end_date
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('endDate') OR LOWER(column_name) = LOWER('end_date'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'end_date' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "end_date"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'end_date';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'end_date';
            END;
        END IF;
    END IF;
    -- Column: rampMonths -> ramp_months
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('rampMonths') OR LOWER(column_name) = LOWER('ramp_months'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'ramp_months' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "ramp_months"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'ramp_months';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'ramp_months';
            END;
        END IF;
    END IF;
    -- Column: hiringStage -> hiring_stage
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('hiringStage') OR LOWER(column_name) = LOWER('hiring_stage'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'hiring_stage' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "hiring_stage"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'hiring_stage';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'hiring_stage';
            END;
        END IF;
    END IF;
    -- Column: createdById -> created_by_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdById') OR LOWER(column_name) = LOWER('created_by_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_by_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_by_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_by_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_by_id';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: updatedAt -> updated_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('updatedAt') OR LOWER(column_name) = LOWER('updated_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'updated_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "updated_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'updated_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'updated_at';
            END;
        END IF;
    END IF;

    -- Process Model: ConsolidationEntity (Target Table: consolidation_entities)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('consolidation_entities') 
                  OR LOWER(table_name) = LOWER('ConsolidationEntity')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'consolidation_entities' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "consolidation_entities"';
            found_table_name := 'consolidation_entities';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'consolidation_entities';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'consolidation_entities';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: entityType -> entity_type
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('entityType') OR LOWER(column_name) = LOWER('entity_type'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'entity_type' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "entity_type"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'entity_type';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'entity_type';
            END;
        END IF;
    END IF;
    -- Column: ownershipPct -> ownership_pct
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('ownershipPct') OR LOWER(column_name) = LOWER('ownership_pct'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'ownership_pct' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "ownership_pct"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'ownership_pct';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'ownership_pct';
            END;
        END IF;
    END IF;
    -- Column: taxRate -> tax_rate
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('taxRate') OR LOWER(column_name) = LOWER('tax_rate'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'tax_rate' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "tax_rate"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'tax_rate';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'tax_rate';
            END;
        END IF;
    END IF;
    -- Column: isActive -> is_active
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('isActive') OR LOWER(column_name) = LOWER('is_active'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'is_active' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "is_active"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'is_active';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'is_active';
            END;
        END IF;
    END IF;
    -- Column: financialData -> financial_data
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('financialData') OR LOWER(column_name) = LOWER('financial_data'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'financial_data' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "financial_data"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'financial_data';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'financial_data';
            END;
        END IF;
    END IF;
    -- Column: intercompanyMap -> intercompany_map
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('intercompanyMap') OR LOWER(column_name) = LOWER('intercompany_map'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'intercompany_map' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "intercompany_map"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'intercompany_map';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'intercompany_map';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: updatedAt -> updated_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('updatedAt') OR LOWER(column_name) = LOWER('updated_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'updated_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "updated_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'updated_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'updated_at';
            END;
        END IF;
    END IF;

    -- Process Model: Budget (Target Table: budgets)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('budgets') 
                  OR LOWER(table_name) = LOWER('Budget')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'budgets' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "budgets"';
            found_table_name := 'budgets';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'budgets';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'budgets';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: createdById -> created_by_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdById') OR LOWER(column_name) = LOWER('created_by_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_by_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_by_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_by_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_by_id';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: updatedAt -> updated_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('updatedAt') OR LOWER(column_name) = LOWER('updated_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'updated_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "updated_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'updated_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'updated_at';
            END;
        END IF;
    END IF;

    -- Process Model: ExcelSync (Target Table: excel_syncs)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('excel_syncs') 
                  OR LOWER(table_name) = LOWER('ExcelSync')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'excel_syncs' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "excel_syncs"';
            found_table_name := 'excel_syncs';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'excel_syncs';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'excel_syncs';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: fileName -> file_name
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('fileName') OR LOWER(column_name) = LOWER('file_name'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'file_name' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "file_name"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'file_name';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'file_name';
            END;
        END IF;
    END IF;
    -- Column: fileHash -> file_hash
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('fileHash') OR LOWER(column_name) = LOWER('file_hash'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'file_hash' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "file_hash"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'file_hash';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'file_hash';
            END;
        END IF;
    END IF;
    -- Column: mappingId -> mapping_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('mappingId') OR LOWER(column_name) = LOWER('mapping_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'mapping_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "mapping_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'mapping_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'mapping_id';
            END;
        END IF;
    END IF;
    -- Column: lastSyncedAt -> last_synced_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('lastSyncedAt') OR LOWER(column_name) = LOWER('last_synced_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'last_synced_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "last_synced_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'last_synced_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'last_synced_at';
            END;
        END IF;
    END IF;
    -- Column: errorMessage -> error_message
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('errorMessage') OR LOWER(column_name) = LOWER('error_message'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'error_message' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "error_message"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'error_message';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'error_message';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: updatedAt -> updated_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('updatedAt') OR LOWER(column_name) = LOWER('updated_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'updated_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "updated_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'updated_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'updated_at';
            END;
        END IF;
    END IF;

    -- Process Model: ExcelMapping (Target Table: excel_mappings)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('excel_mappings') 
                  OR LOWER(table_name) = LOWER('ExcelMapping')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'excel_mappings' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "excel_mappings"';
            found_table_name := 'excel_mappings';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'excel_mappings';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'excel_mappings';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: mappingJson -> mapping_json
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('mappingJson') OR LOWER(column_name) = LOWER('mapping_json'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'mapping_json' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "mapping_json"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'mapping_json';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'mapping_json';
            END;
        END IF;
    END IF;
    -- Column: createdById -> created_by
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdById') OR LOWER(column_name) = LOWER('created_by'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_by' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_by"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_by';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_by';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: updatedAt -> updated_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('updatedAt') OR LOWER(column_name) = LOWER('updated_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'updated_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "updated_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'updated_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'updated_at';
            END;
        END IF;
    END IF;

    -- Process Model: OrgQuota (Target Table: org_quotas)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('org_quotas') 
                  OR LOWER(table_name) = LOWER('OrgQuota')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'org_quotas' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "org_quotas"';
            found_table_name := 'org_quotas';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'org_quotas';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'org_quotas';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: monteCarloSimsLimit -> monte_carlo_sims_limit
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('monteCarloSimsLimit') OR LOWER(column_name) = LOWER('monte_carlo_sims_limit'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'monte_carlo_sims_limit' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "monte_carlo_sims_limit"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'monte_carlo_sims_limit';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'monte_carlo_sims_limit';
            END;
        END IF;
    END IF;
    -- Column: monteCarloSimsUsed -> monte_carlo_sims_used
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('monteCarloSimsUsed') OR LOWER(column_name) = LOWER('monte_carlo_sims_used'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'monte_carlo_sims_used' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "monte_carlo_sims_used"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'monte_carlo_sims_used';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'monte_carlo_sims_used';
            END;
        END IF;
    END IF;
    -- Column: monteCarloResetAt -> monte_carlo_reset_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('monteCarloResetAt') OR LOWER(column_name) = LOWER('monte_carlo_reset_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'monte_carlo_reset_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "monte_carlo_reset_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'monte_carlo_reset_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'monte_carlo_reset_at';
            END;
        END IF;
    END IF;
    -- Column: exportsLimit -> exports_limit
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('exportsLimit') OR LOWER(column_name) = LOWER('exports_limit'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'exports_limit' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "exports_limit"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'exports_limit';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'exports_limit';
            END;
        END IF;
    END IF;
    -- Column: exportsUsed -> exports_used
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('exportsUsed') OR LOWER(column_name) = LOWER('exports_used'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'exports_used' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "exports_used"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'exports_used';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'exports_used';
            END;
        END IF;
    END IF;
    -- Column: exportsResetAt -> exports_reset_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('exportsResetAt') OR LOWER(column_name) = LOWER('exports_reset_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'exports_reset_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "exports_reset_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'exports_reset_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'exports_reset_at';
            END;
        END IF;
    END IF;
    -- Column: alertsLimit -> alerts_limit
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('alertsLimit') OR LOWER(column_name) = LOWER('alerts_limit'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'alerts_limit' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "alerts_limit"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'alerts_limit';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'alerts_limit';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: updatedAt -> updated_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('updatedAt') OR LOWER(column_name) = LOWER('updated_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'updated_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "updated_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'updated_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'updated_at';
            END;
        END IF;
    END IF;

    -- Process Model: RealtimeSimulation (Target Table: realtime_simulations)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('realtime_simulations') 
                  OR LOWER(table_name) = LOWER('RealtimeSimulation')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'realtime_simulations' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "realtime_simulations"';
            found_table_name := 'realtime_simulations';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'realtime_simulations';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'realtime_simulations';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: userId -> user_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('userId') OR LOWER(column_name) = LOWER('user_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'user_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "user_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'user_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'user_id';
            END;
        END IF;
    END IF;
    -- Column: paramsJson -> params_json
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('paramsJson') OR LOWER(column_name) = LOWER('params_json'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'params_json' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "params_json"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'params_json';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'params_json';
            END;
        END IF;
    END IF;
    -- Column: resultsJson -> results_json
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('resultsJson') OR LOWER(column_name) = LOWER('results_json'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'results_json' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "results_json"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'results_json';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'results_json';
            END;
        END IF;
    END IF;
    -- Column: currentMonth -> current_month
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('currentMonth') OR LOWER(column_name) = LOWER('current_month'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'current_month' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "current_month"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'current_month';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'current_month';
            END;
        END IF;
    END IF;
    -- Column: isRunning -> is_running
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('isRunning') OR LOWER(column_name) = LOWER('is_running'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'is_running' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "is_running"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'is_running';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'is_running';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: updatedAt -> updated_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('updatedAt') OR LOWER(column_name) = LOWER('updated_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'updated_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "updated_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'updated_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'updated_at';
            END;
        END IF;
    END IF;
    -- Column: isSnapshot -> is_snapshot
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('isSnapshot') OR LOWER(column_name) = LOWER('is_snapshot'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'is_snapshot' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "is_snapshot"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'is_snapshot';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'is_snapshot';
            END;
        END IF;
    END IF;
    -- Column: snapshotToken -> snapshot_token
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('snapshotToken') OR LOWER(column_name) = LOWER('snapshot_token'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'snapshot_token' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "snapshot_token"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'snapshot_token';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'snapshot_token';
            END;
        END IF;
    END IF;

    -- Process Model: UserUsage (Target Table: user_usage)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('user_usage') 
                  OR LOWER(table_name) = LOWER('UserUsage')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'user_usage' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "user_usage"';
            found_table_name := 'user_usage';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'user_usage';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'user_usage';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: userId -> user_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('userId') OR LOWER(column_name) = LOWER('user_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'user_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "user_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'user_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'user_id';
            END;
        END IF;
    END IF;
    -- Column: simulationRunId -> simulation_run_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('simulationRunId') OR LOWER(column_name) = LOWER('simulation_run_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'simulation_run_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "simulation_run_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'simulation_run_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'simulation_run_id';
            END;
        END IF;
    END IF;
    -- Column: monteCarloJobId -> monte_carlo_job_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('monteCarloJobId') OR LOWER(column_name) = LOWER('monte_carlo_job_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'monte_carlo_job_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "monte_carlo_job_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'monte_carlo_job_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'monte_carlo_job_id';
            END;
        END IF;
    END IF;
    -- Column: creditsUsed -> credits_used
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('creditsUsed') OR LOWER(column_name) = LOWER('credits_used'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'credits_used' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "credits_used"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'credits_used';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'credits_used';
            END;
        END IF;
    END IF;
    -- Column: creditType -> credit_type
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('creditType') OR LOWER(column_name) = LOWER('credit_type'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'credit_type' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "credit_type"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'credit_type';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'credit_type';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;

    -- Process Model: FinancialLedger (Target Table: financial_ledger)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('financial_ledger') 
                  OR LOWER(table_name) = LOWER('FinancialLedger')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'financial_ledger' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "financial_ledger"';
            found_table_name := 'financial_ledger';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'financial_ledger';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'financial_ledger';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: transactionDate -> transaction_date
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('transactionDate') OR LOWER(column_name) = LOWER('transaction_date'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'transaction_date' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "transaction_date"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'transaction_date';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'transaction_date';
            END;
        END IF;
    END IF;
    -- Column: accountCode -> account_code
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('accountCode') OR LOWER(column_name) = LOWER('account_code'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'account_code' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "account_code"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'account_code';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'account_code';
            END;
        END IF;
    END IF;
    -- Column: accountName -> account_name
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('accountName') OR LOWER(column_name) = LOWER('account_name'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'account_name' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "account_name"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'account_name';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'account_name';
            END;
        END IF;
    END IF;
    -- Column: sourceType -> source_type
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('sourceType') OR LOWER(column_name) = LOWER('source_type'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'source_type' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "source_type"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'source_type';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'source_type';
            END;
        END IF;
    END IF;
    -- Column: sourceId -> source_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('sourceId') OR LOWER(column_name) = LOWER('source_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'source_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "source_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'source_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'source_id';
            END;
        END IF;
    END IF;
    -- Column: isAdjustment -> is_adjustment
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('isAdjustment') OR LOWER(column_name) = LOWER('is_adjustment'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'is_adjustment' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "is_adjustment"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'is_adjustment';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'is_adjustment';
            END;
        END IF;
    END IF;
    -- Column: adjustmentReason -> adjustment_reason
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('adjustmentReason') OR LOWER(column_name) = LOWER('adjustment_reason'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'adjustment_reason' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "adjustment_reason"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'adjustment_reason';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'adjustment_reason';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: updatedAt -> updated_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('updatedAt') OR LOWER(column_name) = LOWER('updated_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'updated_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "updated_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'updated_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'updated_at';
            END;
        END IF;
    END IF;

    -- Process Model: ApprovalRequest (Target Table: approval_requests)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('approval_requests') 
                  OR LOWER(table_name) = LOWER('ApprovalRequest')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'approval_requests' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "approval_requests"';
            found_table_name := 'approval_requests';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'approval_requests';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'approval_requests';
        END;
    END IF;
    -- Column: requesterId -> requester_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('requesterId') OR LOWER(column_name) = LOWER('requester_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'requester_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "requester_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'requester_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'requester_id';
            END;
        END IF;
    END IF;
    -- Column: approverId -> approver_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('approverId') OR LOWER(column_name) = LOWER('approver_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'approver_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "approver_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'approver_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'approver_id';
            END;
        END IF;
    END IF;
    -- Column: objectType -> object_type
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('objectType') OR LOWER(column_name) = LOWER('object_type'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'object_type' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "object_type"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'object_type';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'object_type';
            END;
        END IF;
    END IF;
    -- Column: objectId -> object_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('objectId') OR LOWER(column_name) = LOWER('object_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'object_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "object_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'object_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'object_id';
            END;
        END IF;
    END IF;
    -- Column: payloadJson -> payload_json
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('payloadJson') OR LOWER(column_name) = LOWER('payload_json'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'payload_json' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "payload_json"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'payload_json';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'payload_json';
            END;
        END IF;
    END IF;
    -- Column: reviewedAt -> reviewed_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('reviewedAt') OR LOWER(column_name) = LOWER('reviewed_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'reviewed_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "reviewed_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'reviewed_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'reviewed_at';
            END;
        END IF;
    END IF;
    -- Column: createdAt -> created_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('createdAt') OR LOWER(column_name) = LOWER('created_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'created_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "created_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'created_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'created_at';
            END;
        END IF;
    END IF;
    -- Column: updatedAt -> updated_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('updatedAt') OR LOWER(column_name) = LOWER('updated_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'updated_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "updated_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'updated_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'updated_at';
            END;
        END IF;
    END IF;

    -- Process Model: AccessRequest (Target Table: access_requests)
    SELECT table_name INTO found_table_name 
               FROM information_schema.tables 
               WHERE LOWER(table_name) = LOWER('access_requests') 
                  OR LOWER(table_name) = LOWER('AccessRequest')
               LIMIT 1;
    IF found_table_name IS NOT NULL AND found_table_name <> 'access_requests' THEN
        BEGIN
            EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME TO "access_requests"';
            found_table_name := 'access_requests';
            RAISE NOTICE 'Renamed table % to %', found_table_name, 'access_requests';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename table % to %', found_table_name, 'access_requests';
        END;
    END IF;
    -- Column: orgId -> org_id
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('orgId') OR LOWER(column_name) = LOWER('org_id'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'org_id' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "org_id"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'org_id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'org_id';
            END;
        END IF;
    END IF;
    -- Column: requestedAt -> requested_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('requestedAt') OR LOWER(column_name) = LOWER('requested_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'requested_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "requested_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'requested_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'requested_at';
            END;
        END IF;
    END IF;
    -- Column: reviewedAt -> reviewed_at
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('reviewedAt') OR LOWER(column_name) = LOWER('reviewed_at'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'reviewed_at' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "reviewed_at"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'reviewed_at';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'reviewed_at';
            END;
        END IF;
    END IF;
    -- Column: reviewedBy -> reviewed_by
    IF found_table_name IS NOT NULL THEN
        SELECT column_name INTO found_column_name 
                   FROM information_schema.columns 
                   WHERE table_name = found_table_name 
                     AND (LOWER(column_name) = LOWER('reviewedBy') OR LOWER(column_name) = LOWER('reviewed_by'))
                   LIMIT 1;
        IF found_column_name IS NOT NULL AND found_column_name <> 'reviewed_by' THEN
            BEGIN
                EXECUTE 'ALTER TABLE "' || found_table_name || '" RENAME COLUMN "' || found_column_name || '" TO "reviewed_by"';
                RAISE NOTICE 'Renamed column %.% to %', found_table_name, found_column_name, 'reviewed_by';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not rename column %.% to %', found_table_name, found_column_name, 'reviewed_by';
            END;
        END IF;
    END IF;

END $$;