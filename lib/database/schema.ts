import { supabase } from '../supabase';
import { securityLogger } from '../security/logger';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// Define required tables and their schemas
const REQUIRED_TABLES = {
  patients: {
    id: 'text primary key',
    email: 'text unique',
    firstName: 'text',
    lastName: 'text',
    dateOfBirth: 'date',
    phone: 'text',
    address: 'text',
    createdAt: 'timestamp with time zone default now()',
    updatedAt: 'timestamp with time zone default now()'
  },
  medical_records: {
    id: 'uuid primary key',
    patientId: 'text references patients(id)',
    recordType: 'text',
    content: 'jsonb',
    createdAt: 'timestamp with time zone default now()',
    updatedAt: 'timestamp with time zone default now()'
  },
  appointments: {
    id: 'uuid primary key',
    patientId: 'text references patients(id)',
    doctorId: 'text',
    date: 'timestamp with time zone',
    status: 'text',
    notes: 'text',
    createdAt: 'timestamp with time zone default now()',
    updatedAt: 'timestamp with time zone default now()'
  },
  staff: {
    id: 'text primary key',
    email: 'text unique',
    firstName: 'text',
    lastName: 'text',
    role: 'text',
    createdAt: 'timestamp with time zone default now()',
    updatedAt: 'timestamp with time zone default now()'
  },
  security_logs: {
    id: 'uuid primary key',
    type: 'text',
    severity: 'text',
    message: 'text',
    metadata: 'jsonb',
    createdAt: 'timestamp with time zone default now()'
  },
  hipaa_audit_logs: {
    id: 'uuid primary key',
    userId: 'text',
    userRole: 'text',
    eventType: 'text',
    phiCategory: 'text',
    resourceId: 'text',
    action: 'text',
    details: 'jsonb',
    ipAddress: 'text',
    userAgent: 'text',
    success: 'boolean',
    errorMessage: 'text',
    createdAt: 'timestamp with time zone default now()'
  },
  patient_consents: {
    id: 'uuid primary key',
    patientId: 'text references patients(id)',
    type: 'text',
    status: 'text',
    grantedAt: 'timestamp with time zone',
    expiresAt: 'timestamp with time zone',
    purpose: 'text',
    scope: 'text[]',
    version: 'text',
    metadata: 'jsonb',
    ipAddress: 'text',
    userAgent: 'text',
    createdAt: 'timestamp with time zone default now()'
  }
};

// Migration version tracking
interface Migration {
  version: number;
  name: string;
  up: string;
  down: string;
}

// Archive tables
export const archiveTables = {
  archive_transactions: `
    CREATE TABLE IF NOT EXISTS archive_transactions (
      id UUID PRIMARY KEY,
      operation TEXT NOT NULL,
      source_table TEXT NOT NULL,
      target_table TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TIMESTAMP WITH TIME ZONE NOT NULL,
      completed_at TIMESTAMP WITH TIME ZONE,
      error TEXT,
      metadata JSONB DEFAULT '{}',
      record_count INTEGER DEFAULT 0,
      checksum TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,
  archived_medical_records: `
    CREATE TABLE IF NOT EXISTS archived_medical_records (
      id UUID PRIMARY KEY,
      original_id UUID NOT NULL,
      table_name TEXT NOT NULL,
      data JSONB NOT NULL,
      archived_at TIMESTAMP WITH TIME ZONE NOT NULL,
      archived_by UUID NOT NULL REFERENCES staff(id),
      transaction_id UUID NOT NULL REFERENCES archive_transactions(id),
      checksum TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,
  archived_appointments: `
    CREATE TABLE IF NOT EXISTS archived_appointments (
      id UUID PRIMARY KEY,
      original_id UUID NOT NULL,
      table_name TEXT NOT NULL,
      data JSONB NOT NULL,
      archived_at TIMESTAMP WITH TIME ZONE NOT NULL,
      archived_by UUID NOT NULL REFERENCES staff(id),
      transaction_id UUID NOT NULL REFERENCES archive_transactions(id),
      checksum TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,
  archived_patients: `
    CREATE TABLE IF NOT EXISTS archived_patients (
      id UUID PRIMARY KEY,
      original_id UUID NOT NULL,
      table_name TEXT NOT NULL,
      data JSONB NOT NULL,
      archived_at TIMESTAMP WITH TIME ZONE NOT NULL,
      archived_by UUID NOT NULL REFERENCES staff(id),
      transaction_id UUID NOT NULL REFERENCES archive_transactions(id),
      checksum TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `
};

// Add archive-related indexes
export const archiveIndexes = {
  archive_transactions_status: `
    CREATE INDEX IF NOT EXISTS idx_archive_transactions_status 
    ON archive_transactions(status);
  `,
  archive_transactions_operation: `
    CREATE INDEX IF NOT EXISTS idx_archive_transactions_operation 
    ON archive_transactions(operation);
  `,
  archive_transactions_dates: `
    CREATE INDEX IF NOT EXISTS idx_archive_transactions_dates 
    ON archive_transactions(started_at, completed_at);
  `,
  archived_records_transaction: `
    CREATE INDEX IF NOT EXISTS idx_archived_records_transaction 
    ON archived_medical_records(transaction_id);
  `,
  archived_records_original: `
    CREATE INDEX IF NOT EXISTS idx_archived_records_original 
    ON archived_medical_records(original_id);
  `,
  archived_appointments_transaction: `
    CREATE INDEX IF NOT EXISTS idx_archived_appointments_transaction 
    ON archived_appointments(transaction_id);
  `,
  archived_appointments_original: `
    CREATE INDEX IF NOT EXISTS idx_archived_appointments_original 
    ON archived_appointments(original_id);
  `,
  archived_patients_transaction: `
    CREATE INDEX IF NOT EXISTS idx_archived_patients_transaction 
    ON archived_patients(transaction_id);
  `,
  archived_patients_original: `
    CREATE INDEX IF NOT EXISTS idx_archived_patients_original 
    ON archived_patients(original_id);
  `
};

// Add archive-related triggers
export const archiveTriggers = {
  archive_transactions_updated_at: `
    CREATE TRIGGER set_archive_transactions_updated_at
    BEFORE UPDATE ON archive_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `,
  archived_records_updated_at: `
    CREATE TRIGGER set_archived_records_updated_at
    BEFORE UPDATE ON archived_medical_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `,
  archived_appointments_updated_at: `
    CREATE TRIGGER set_archived_appointments_updated_at
    BEFORE UPDATE ON archived_appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `,
  archived_patients_updated_at: `
    CREATE TRIGGER set_archived_patients_updated_at
    BEFORE UPDATE ON archived_patients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `
};

// Status change tables
export const statusChangeTables = [
  `CREATE TABLE IF NOT EXISTS status_changes (
    id UUID PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id),
    previous_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    changed_by UUID NOT NULL REFERENCES staff(id),
    reason TEXT,
    approved_by UUID REFERENCES staff(id),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS status_change_approvals (
    id UUID PRIMARY KEY,
    status_change_id UUID NOT NULL REFERENCES status_changes(id),
    requested_by UUID NOT NULL REFERENCES staff(id),
    status VARCHAR(20) NOT NULL,
    approved_by UUID REFERENCES staff(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  )`
];

export const statusChangeIndexes = [
  `CREATE INDEX IF NOT EXISTS idx_status_changes_patient_id ON status_changes(patient_id)`,
  `CREATE INDEX IF NOT EXISTS idx_status_changes_changed_at ON status_changes(changed_at)`,
  `CREATE INDEX IF NOT EXISTS idx_status_changes_changed_by ON status_changes(changed_by)`,
  `CREATE INDEX IF NOT EXISTS idx_status_change_approvals_status ON status_change_approvals(status)`,
  `CREATE INDEX IF NOT EXISTS idx_status_change_approvals_requested_by ON status_change_approvals(requested_by)`
];

export const statusChangeTriggers = [
  `CREATE OR REPLACE FUNCTION update_status_changes_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql`,
  `CREATE OR REPLACE TRIGGER update_status_changes_updated_at
    BEFORE UPDATE ON status_changes
    FOR EACH ROW
    EXECUTE FUNCTION update_status_changes_updated_at()`,
  `CREATE OR REPLACE FUNCTION update_status_change_approvals_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql`,
  `CREATE OR REPLACE TRIGGER update_status_change_approvals_updated_at
    BEFORE UPDATE ON status_change_approvals
    FOR EACH ROW
    EXECUTE FUNCTION update_status_change_approvals_updated_at()`
];

// Backup tables for data verification
export const backupTables = {
  patients_backup: `
    CREATE TABLE IF NOT EXISTS patients_backup (
      id UUID PRIMARY KEY,
      backup_date TIMESTAMP WITH TIME ZONE NOT NULL,
      data JSONB NOT NULL,
      checksum TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,
  medical_records_backup: `
    CREATE TABLE IF NOT EXISTS medical_records_backup (
      id UUID PRIMARY KEY,
      backup_date TIMESTAMP WITH TIME ZONE NOT NULL,
      data JSONB NOT NULL,
      checksum TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,
  appointments_backup: `
    CREATE TABLE IF NOT EXISTS appointments_backup (
      id UUID PRIMARY KEY,
      backup_date TIMESTAMP WITH TIME ZONE NOT NULL,
      data JSONB NOT NULL,
      checksum TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `
};

// Backup table indexes
export const backupIndexes = {
  patients_backup_date: `
    CREATE INDEX IF NOT EXISTS idx_patients_backup_date 
    ON patients_backup(backup_date);
  `,
  medical_records_backup_date: `
    CREATE INDEX IF NOT EXISTS idx_medical_records_backup_date 
    ON medical_records_backup(backup_date);
  `,
  appointments_backup_date: `
    CREATE INDEX IF NOT EXISTS idx_appointments_backup_date 
    ON appointments_backup(backup_date);
  `
};

// Backup table triggers
export const backupTriggers = {
  patients_backup_updated_at: `
    CREATE TRIGGER set_patients_backup_updated_at
    BEFORE UPDATE ON patients_backup
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `,
  medical_records_backup_updated_at: `
    CREATE TRIGGER set_medical_records_backup_updated_at
    BEFORE UPDATE ON medical_records_backup
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `,
  appointments_backup_updated_at: `
    CREATE TRIGGER set_appointments_backup_updated_at
    BEFORE UPDATE ON appointments_backup
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `
};

// Backup creation triggers
export const backupCreationTriggers = {
  patients_backup_trigger: `
    CREATE OR REPLACE FUNCTION create_patients_backup()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO patients_backup (id, backup_date, data, checksum)
      VALUES (
        NEW.id,
        CURRENT_TIMESTAMP,
        row_to_json(NEW),
        encode(digest(row_to_json(NEW)::text, 'sha256'), 'hex')
      );
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_patients_backup
    AFTER INSERT OR UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION create_patients_backup();
  `,
  medical_records_backup_trigger: `
    CREATE OR REPLACE FUNCTION create_medical_records_backup()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO medical_records_backup (id, backup_date, data, checksum)
      VALUES (
        NEW.id,
        CURRENT_TIMESTAMP,
        row_to_json(NEW),
        encode(digest(row_to_json(NEW)::text, 'sha256'), 'hex')
      );
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_medical_records_backup
    AFTER INSERT OR UPDATE ON medical_records
    FOR EACH ROW
    EXECUTE FUNCTION create_medical_records_backup();
  `,
  appointments_backup_trigger: `
    CREATE OR REPLACE FUNCTION create_appointments_backup()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO appointments_backup (id, backup_date, data, checksum)
      VALUES (
        NEW.id,
        CURRENT_TIMESTAMP,
        row_to_json(NEW),
        encode(digest(row_to_json(NEW)::text, 'sha256'), 'hex')
      );
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_appointments_backup
    AFTER INSERT OR UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION create_appointments_backup();
  `
};

class SchemaManager {
  private static instance: SchemaManager;
  private readonly migrations: Migration[] = [];
  private readonly backupDir: string;

  private constructor() {
    this.backupDir = path.join(process.cwd(), 'backups');
    this.initializeMigrations();
  }

  public static getInstance(): SchemaManager {
    if (!SchemaManager.instance) {
      SchemaManager.instance = new SchemaManager();
    }
    return SchemaManager.instance;
  }

  private initializeMigrations(): void {
    // Add migrations in order
    this.migrations.push(
      {
        version: 1,
        name: 'initial_schema',
        up: `
          CREATE TABLE IF NOT EXISTS patients (
            id text primary key,
            email text unique,
            firstName text,
            lastName text,
            dateOfBirth date,
            phone text,
            address text,
            createdAt timestamp with time zone default now(),
            updatedAt timestamp with time zone default now()
          );

          CREATE TABLE IF NOT EXISTS medical_records (
            id uuid primary key,
            patientId text references patients(id),
            recordType text,
            content jsonb,
            createdAt timestamp with time zone default now(),
            updatedAt timestamp with time zone default now()
          );

          CREATE TABLE IF NOT EXISTS appointments (
            id uuid primary key,
            patientId text references patients(id),
            doctorId text,
            date timestamp with time zone,
            status text,
            notes text,
            createdAt timestamp with time zone default now(),
            updatedAt timestamp with time zone default now()
          );

          CREATE TABLE IF NOT EXISTS staff (
            id text primary key,
            email text unique,
            firstName text,
            lastName text,
            role text,
            createdAt timestamp with time zone default now(),
            updatedAt timestamp with time zone default now()
          );

          CREATE TABLE IF NOT EXISTS security_logs (
            id uuid primary key,
            type text,
            severity text,
            message text,
            metadata jsonb,
            createdAt timestamp with time zone default now()
          );

          CREATE TABLE IF NOT EXISTS hipaa_audit_logs (
            id uuid primary key,
            userId text,
            userRole text,
            eventType text,
            phiCategory text,
            resourceId text,
            action text,
            details jsonb,
            ipAddress text,
            userAgent text,
            success boolean,
            errorMessage text,
            createdAt timestamp with time zone default now()
          );

          CREATE TABLE IF NOT EXISTS patient_consents (
            id uuid primary key,
            patientId text references patients(id),
            type text,
            status text,
            grantedAt timestamp with time zone,
            expiresAt timestamp with time zone,
            purpose text,
            scope text[],
            version text,
            metadata jsonb,
            ipAddress text,
            userAgent text,
            createdAt timestamp with time zone default now()
          );

          CREATE TABLE IF NOT EXISTS schema_migrations (
            version integer primary key,
            name text,
            applied_at timestamp with time zone default now()
          );
        `,
        down: `
          DROP TABLE IF EXISTS patient_consents;
          DROP TABLE IF EXISTS hipaa_audit_logs;
          DROP TABLE IF EXISTS security_logs;
          DROP TABLE IF EXISTS staff;
          DROP TABLE IF EXISTS appointments;
          DROP TABLE IF EXISTS medical_records;
          DROP TABLE IF EXISTS patients;
          DROP TABLE IF EXISTS schema_migrations;
        `
      }
      // Add more migrations here as needed
    );
  }

  public async validateSchema(): Promise<boolean> {
    try {
      for (const [tableName, schema] of Object.entries(REQUIRED_TABLES)) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) {
          securityLogger.log({
            type: 'database',
            severity: 'high',
            message: `Table ${tableName} does not exist or has incorrect schema`,
            metadata: { error: error.message }
          });
          return false;
        }
      }

      securityLogger.log({
        type: 'database',
        severity: 'low',
        message: 'Schema validation successful'
      });
      return true;
    } catch (error) {
      securityLogger.log({
        type: 'database',
        severity: 'high',
        message: 'Schema validation failed',
        metadata: { error: error.message }
      });
      return false;
    }
  }

  private async createBackup(): Promise<string> {
    try {
      // Ensure backup directory exists
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(this.backupDir, `backup-${timestamp}.sql`);

      // Create backup using pg_dump
      const { stdout, stderr } = await execAsync(
        `pg_dump -h ${process.env.SUPABASE_DB_HOST} -U ${process.env.SUPABASE_DB_USER} -d ${process.env.SUPABASE_DB_NAME} -F c -f ${backupFile}`
      );

      if (stderr) {
        throw new Error(`Backup failed: ${stderr}`);
      }

      securityLogger.log({
        type: 'database',
        severity: 'low',
        message: 'Database backup created successfully',
        metadata: { backupFile }
      });

      return backupFile;
    } catch (error) {
      securityLogger.log({
        type: 'database',
        severity: 'high',
        message: 'Database backup failed',
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  public async runMigrations(): Promise<void> {
    try {
      // Create backup before migrations
      await this.createBackup();

      // Get current version
      const { data: currentVersion } = await supabase
        .from('schema_migrations')
        .select('version')
        .order('version', { ascending: false })
        .limit(1);

      const version = currentVersion?.[0]?.version || 0;

      // Run pending migrations
      for (const migration of this.migrations) {
        if (migration.version > version) {
          // Run migration
          const { error } = await supabase.rpc('exec_sql', {
            sql: migration.up
          });

          if (error) throw error;

          // Record migration
          await supabase
            .from('schema_migrations')
            .insert({
              version: migration.version,
              name: migration.name
            });

          securityLogger.log({
            type: 'database',
            severity: 'low',
            message: `Migration ${migration.version} (${migration.name}) applied successfully`
          });
        }
      }
    } catch (error) {
      securityLogger.log({
        type: 'database',
        severity: 'high',
        message: 'Migration failed',
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  public async rollbackMigration(version: number): Promise<void> {
    try {
      // Create backup before rollback
      await this.createBackup();

      const migration = this.migrations.find(m => m.version === version);
      if (!migration) {
        throw new Error(`Migration version ${version} not found`);
      }

      // Run rollback
      const { error } = await supabase.rpc('exec_sql', {
        sql: migration.down
      });

      if (error) throw error;

      // Remove migration record
      await supabase
        .from('schema_migrations')
        .delete()
        .eq('version', version);

      securityLogger.log({
        type: 'database',
        severity: 'low',
        message: `Migration ${version} (${migration.name}) rolled back successfully`
      });
    } catch (error) {
      securityLogger.log({
        type: 'database',
        severity: 'high',
        message: 'Migration rollback failed',
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  public async getMigrationStatus(): Promise<{
    currentVersion: number;
    pendingMigrations: Migration[];
  }> {
    try {
      const { data: currentVersion } = await supabase
        .from('schema_migrations')
        .select('version')
        .order('version', { ascending: false })
        .limit(1);

      const version = currentVersion?.[0]?.version || 0;
      const pendingMigrations = this.migrations.filter(m => m.version > version);

      return {
        currentVersion: version,
        pendingMigrations
      };
    } catch (error) {
      securityLogger.log({
        type: 'database',
        severity: 'high',
        message: 'Failed to get migration status',
        metadata: { error: error.message }
      });
      throw error;
    }
  }
}

// Export singleton instance
export const schemaManager = SchemaManager.getInstance(); 