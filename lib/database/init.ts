import { databaseFunctions } from './functions';
import { queryOptimizationManager } from './optimization';
import { securityLogger } from '../security/logger';
import { supabase } from '../supabase';
import { archiveTables, archiveIndexes, archiveTriggers } from './schema';

export async function initializeDatabase(): Promise<void> {
  try {
    // Initialize database functions
    await databaseFunctions.initialize();

    // Create materialized views
    await databaseFunctions.createMaterializedView(
      'patient_summary_view',
      `
      SELECT 
        p.*,
        COUNT(mr.id) as medical_record_count,
        COUNT(a.id) as appointment_count
      FROM patients p
      LEFT JOIN medical_records mr ON p.id = mr.patient_id
      LEFT JOIN appointments a ON p.id = a.patient_id
      GROUP BY p.id
      `,
      '1 hour'
    );

    await databaseFunctions.createMaterializedView(
      'staff_schedule_view',
      `
      SELECT 
        s.*,
        COUNT(a.id) as upcoming_appointments,
        MIN(a.scheduled_at) as next_appointment
      FROM staff s
      LEFT JOIN appointments a ON s.id = a.staff_id
      WHERE a.scheduled_at > NOW()
      GROUP BY s.id
      `,
      '30 minutes'
    );

    // Create partitioned tables
    await databaseFunctions.createPartitionedTable(
      'security_logs_partitioned',
      'created_at',
      'RANGE',
      [
        {
          name: 'security_logs_2024_01',
          start: '2024-01-01',
          end: '2024-02-01'
        },
        {
          name: 'security_logs_2024_02',
          start: '2024-02-01',
          end: '2024-03-01'
        }
      ]
    );

    await databaseFunctions.createPartitionedTable(
      'hipaa_audit_logs_partitioned',
      'created_at',
      'RANGE',
      [
        {
          name: 'hipaa_audit_logs_2024_01',
          start: '2024-01-01',
          end: '2024-02-01'
        },
        {
          name: 'hipaa_audit_logs_2024_02',
          start: '2024-02-01',
          end: '2024-03-01'
        }
      ]
    );

    // Create archive tables
    for (const [name, sql] of Object.entries(archiveTables)) {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        throw new Error(`Failed to create archive table ${name}: ${error.message}`);
      }
    }

    // Create archive indexes
    for (const [name, sql] of Object.entries(archiveIndexes)) {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        throw new Error(`Failed to create archive index ${name}: ${error.message}`);
      }
    }

    // Create archive triggers
    for (const [name, sql] of Object.entries(archiveTriggers)) {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        throw new Error(`Failed to create archive trigger ${name}: ${error.message}`);
      }
    }

    // Create status change tables
    for (const table of statusChangeTables) {
      const { error } = await supabase.rpc('exec_sql', { sql: table });
      if (error) {
        console.error('Failed to create status change table:', error);
        throw error;
      }
    }

    // Create status change indexes
    for (const index of statusChangeIndexes) {
      const { error } = await supabase.rpc('exec_sql', { sql: index });
      if (error) {
        console.error('Failed to create status change index:', error);
        throw error;
      }
    }

    // Create status change triggers
    for (const trigger of statusChangeTriggers) {
      const { error } = await supabase.rpc('exec_sql', { sql: trigger });
      if (error) {
        console.error('Failed to create status change trigger:', error);
        throw error;
      }
    }

    // Create additional indexes for performance
    await databaseFunctions.createIndex('medical_records', 'patient_id', 'btree');
    await databaseFunctions.createIndex('medical_records', 'created_at', 'btree');
    await databaseFunctions.createIndex('appointments', 'patient_id', 'btree');
    await databaseFunctions.createIndex('appointments', 'staff_id', 'btree');
    await databaseFunctions.createIndex('appointments', 'scheduled_at', 'btree');
    await databaseFunctions.createIndex('security_logs', 'created_at', 'btree');
    await databaseFunctions.createIndex('security_logs', 'type', 'btree');
    await databaseFunctions.createIndex('hipaa_audit_logs', 'created_at', 'btree');
    await databaseFunctions.createIndex('hipaa_audit_logs', 'event_type', 'btree');

    // Ensure all required indexes exist
    await queryOptimizationManager.ensureIndexes();

    // Set up monitoring and maintenance schedules
    await supabase.rpc('exec_sql', {
      sql: `
        -- Enable pg_stat_statements extension
        CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
        
        -- Set up monitoring parameters
        ALTER SYSTEM SET track_activities = on;
        ALTER SYSTEM SET track_counts = on;
        ALTER SYSTEM SET track_io_timing = on;
        ALTER SYSTEM SET track_functions = all;
        
        -- Set up maintenance schedules
        SELECT cron.schedule(
          'vacuum-analyze',
          '0 2 * * *', -- Run at 2 AM daily
          'SELECT vacuum_analyze(table_name) FROM information_schema.tables WHERE table_schema = ''public'';'
        );
        
        SELECT cron.schedule(
          'monitor-performance',
          '*/15 * * * *', -- Run every 15 minutes
          'SELECT monitor_query_performance();'
        );
        
        SELECT cron.schedule(
          'refresh-views',
          '0 * * * *', -- Run hourly
          'SELECT refresh_materialized_views();'
        );
      `
    });

    // Perform initial maintenance
    await queryOptimizationManager.performMaintenance();

    // Analyze tables for better query planning
    const { error: analyzeError } = await supabase.rpc('exec_sql', {
      sql: `
        ANALYZE patients;
        ANALYZE medical_records;
        ANALYZE appointments;
        ANALYZE staff;
        ANALYZE security_logs;
        ANALYZE hipaa_audit_logs;
        ANALYZE archive_transactions;
        ANALYZE archived_medical_records;
        ANALYZE archived_appointments;
        ANALYZE archived_patients;
      `
    });

    if (analyzeError) {
      throw new Error(`Failed to analyze tables: ${analyzeError.message}`);
    }

    // Set up monitoring alerts
    const { error: alertError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION check_performance_alerts()
        RETURNS void AS $$
        DECLARE
          slow_queries record;
          table_bloat record;
        BEGIN
          -- Check for slow queries
          FOR slow_queries IN
            SELECT * FROM get_query_stats()
            WHERE mean_time > 1000 -- 1 second threshold
          LOOP
            -- Log alert
            INSERT INTO security_logs (
              type,
              severity,
              message,
              metadata
            ) VALUES (
              'performance',
              'high',
              'Slow query detected',
              jsonb_build_object(
                'query_id', slow_queries.query_id,
                'mean_time', slow_queries.mean_time
              )
            );
          END LOOP;

          -- Check for table bloat
          FOR table_bloat IN
            SELECT * FROM get_table_bloat()
            WHERE bloat_ratio > 20 -- 20% threshold
          LOOP
            -- Log alert
            INSERT INTO security_logs (
              type,
              severity,
              message,
              metadata
            ) VALUES (
              'performance',
              'medium',
              'Table bloat detected',
              jsonb_build_object(
                'table_name', table_bloat.table_name,
                'bloat_ratio', table_bloat.bloat_ratio
              )
            );
          END LOOP;
        END;
        $$ LANGUAGE plpgsql;

        -- Schedule performance alerts
        SELECT cron.schedule(
          'performance-alerts',
          '*/5 * * * *', -- Run every 5 minutes
          'SELECT check_performance_alerts();'
        );
      `
    });

    if (alertError) {
      throw alertError;
    }

    // Create backup tables
    for (const [tableName, createTableSQL] of Object.entries(backupTables)) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
        if (error) throw error;
        console.log(`Created backup table: ${tableName}`);
      } catch (error) {
        console.error(`Failed to create backup table ${tableName}:`, error);
        throw error;
      }
    }

    // Create backup indexes
    for (const [indexName, createIndexSQL] of Object.entries(backupIndexes)) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: createIndexSQL });
        if (error) throw error;
        console.log(`Created backup index: ${indexName}`);
      } catch (error) {
        console.error(`Failed to create backup index ${indexName}:`, error);
        throw error;
      }
    }

    // Create backup triggers
    for (const [name, sql] of Object.entries(backupCreationTriggers)) {
      try {
        await supabase.rpc('exec_sql', { sql });
        console.log(`Created backup trigger: ${name}`);
      } catch (error) {
        console.error(`Failed to create backup trigger ${name}:`, error);
        throw error;
      }
    }

    securityLogger.log({
      type: 'system',
      severity: 'low',
      message: 'Database optimizations completed successfully'
    });
  } catch (error) {
    securityLogger.log({
      type: 'system',
      severity: 'high',
      message: 'Failed to initialize database optimizations',
      metadata: { error: error.message }
    });
    throw error;
  }
}

// Export initialization function
export default initializeDatabase; 