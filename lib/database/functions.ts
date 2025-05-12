import { supabase } from '../supabase';
import { securityLogger } from '../security/logger';

// SQL functions for query optimization
const SQL_FUNCTIONS = {
  create_index_if_not_exists: `
    CREATE OR REPLACE FUNCTION create_index_if_not_exists(
      table_name text,
      index_name text,
      columns text[]
    ) RETURNS void AS $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = table_name
        AND indexname = index_name
      ) THEN
        EXECUTE format(
          'CREATE INDEX %I ON %I (%s)',
          index_name,
          table_name,
          array_to_string(columns, ', ')
        );
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `,

  analyze_query: `
    CREATE OR REPLACE FUNCTION analyze_query(query_text text)
    RETURNS json AS $$
    BEGIN
      RETURN (SELECT json_agg(plan) FROM EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) EXECUTE query_text);
    END;
    $$ LANGUAGE plpgsql;
  `,

  get_table_stats: `
    CREATE OR REPLACE FUNCTION get_table_stats()
    RETURNS TABLE (
      table_name text,
      row_count bigint,
      table_size text,
      index_size text,
      last_vacuum timestamp
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT
        schemaname || '.' || relname as table_name,
        n_live_tup as row_count,
        pg_size_pretty(pg_total_relation_size(schemaname || '.' || relname)) as table_size,
        pg_size_pretty(pg_indexes_size(schemaname || '.' || relname)) as index_size,
        last_vacuum
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC;
    END;
    $$ LANGUAGE plpgsql;
  `,

  exec_sql: `
    CREATE OR REPLACE FUNCTION exec_sql(sql text, params jsonb DEFAULT '[]'::jsonb)
    RETURNS json AS $$
    DECLARE
      result json;
    BEGIN
      EXECUTE sql INTO result USING params;
      RETURN result;
    END;
    $$ LANGUAGE plpgsql;
  `,

  get_query_stats: `
    CREATE OR REPLACE FUNCTION get_query_stats()
    RETURNS TABLE (
      query_id text,
      calls bigint,
      total_time double precision,
      mean_time double precision,
      rows bigint
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT
        queryid::text,
        calls,
        total_time,
        mean_time,
        rows
      FROM pg_stat_statements
      ORDER BY total_time DESC;
    END;
    $$ LANGUAGE plpgsql;
  `,

  vacuum_analyze: `
    CREATE OR REPLACE FUNCTION vacuum_analyze(table_name text)
    RETURNS void AS $$
    BEGIN
      EXECUTE format('VACUUM ANALYZE %I', table_name);
    END;
    $$ LANGUAGE plpgsql;
  `,

  get_index_usage: `
    CREATE OR REPLACE FUNCTION get_index_usage()
    RETURNS TABLE (
      table_name text,
      index_name text,
      index_size text,
      index_scans bigint,
      rows_fetched bigint
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT
        schemaname || '.' || tablename as table_name,
        indexname as index_name,
        pg_size_pretty(pg_relation_size(schemaname || '.' || indexname::regclass)) as index_size,
        idx_scan as index_scans,
        idx_tup_fetch as rows_fetched
      FROM pg_stat_user_indexes
      ORDER BY idx_scan DESC;
    END;
    $$ LANGUAGE plpgsql;
  `,

  get_table_bloat: `
    CREATE OR REPLACE FUNCTION get_table_bloat()
    RETURNS TABLE (
      table_name text,
      bloat_ratio numeric,
      bloat_size text
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT
        schemaname || '.' || relname as table_name,
        CASE WHEN otta = 0 THEN 0.0 ELSE ROUND((CASE WHEN relpages < otta THEN 0 ELSE bs * sml.relpages - otta END)::numeric / (CASE WHEN relpages < otta THEN otta ELSE bs * sml.relpages END)::numeric * 100, 1) END as bloat_ratio,
        pg_size_pretty((CASE WHEN relpages < otta THEN 0 ELSE bs * sml.relpages - otta END)::bigint) as bloat_size
      FROM (
        SELECT
          schemaname, tablename, cc.reltuples, cc.relpages, bs,
          CEIL((cc.reltuples * ((datahdr + ma - (CASE WHEN datahdr % ma = 0 THEN ma ELSE datahdr % ma END)) + nullhdr2 + 4)) / (bs - 20::float)) AS otta
        FROM (
          SELECT
            ma, bs, schemaname, tablename,
            (datawidth + (hdr + ma - (CASE WHEN hdr % ma = 0 THEN ma ELSE hdr % ma END)))::numeric AS datahdr,
            (maxfrac * (bs - hdr))::numeric AS nullhdr2
          FROM (
            SELECT
              schemaname, tablename, hdr, ma, bs,
              SUM((1 - null_frac) * avg_width) AS datawidth,
              MAX(null_frac) AS maxfrac
            FROM pg_stats CROSS JOIN (
              SELECT
                (SELECT current_setting('block_size')::numeric) AS bs,
                CASE WHEN SUBSTRING(v, 12, 3) IN ('8.0','8.1','8.2') THEN 27 ELSE 23 END AS hdr,
                CASE WHEN v ~ 'mingw32' THEN 8 ELSE 4 END AS ma
              FROM (SELECT version() AS v) AS foo
            ) AS constants
            GROUP BY 1, 2, 3, 4, 5
          ) AS foo
        ) AS rs
        JOIN pg_class cc ON cc.relname = rs.tablename
        JOIN pg_namespace nn ON cc.relnamespace = nn.oid AND nn.nspname = rs.schemaname
      ) AS sml
      ORDER BY bloat_ratio DESC;
    END;
    $$ LANGUAGE plpgsql;
  `,

  get_locks: `
    CREATE OR REPLACE FUNCTION get_locks()
    RETURNS TABLE (
      lock_type text,
      relation text,
      mode text,
      granted boolean,
      pid integer,
      query text
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT
        locktype::text,
        relation::regclass::text,
        mode::text,
        granted,
        pid,
        query
      FROM pg_locks l
      JOIN pg_stat_activity a ON l.pid = a.pid
      ORDER BY pid;
    END;
    $$ LANGUAGE plpgsql;
  `
};

class DatabaseFunctions {
  private static instance: DatabaseFunctions;

  private constructor() {}

  public static getInstance(): DatabaseFunctions {
    if (!DatabaseFunctions.instance) {
      DatabaseFunctions.instance = new DatabaseFunctions();
    }
    return DatabaseFunctions.instance;
  }

  public async initializeFunctions(): Promise<void> {
    try {
      for (const [name, sql] of Object.entries(SQL_FUNCTIONS)) {
        const { error } = await supabase.rpc('exec_sql', {
          sql
        });

        if (error) {
          securityLogger.log({
            type: 'database',
            severity: 'high',
            message: `Failed to create function: ${name}`,
            metadata: { error: error.message }
          });
          throw error;
        }
      }

      securityLogger.log({
        type: 'database',
        severity: 'low',
        message: 'Database functions initialized successfully'
      });
    } catch (error) {
      securityLogger.log({
        type: 'database',
        severity: 'high',
        message: 'Failed to initialize database functions',
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  public async createMaterializedView(
    name: string,
    query: string,
    refreshInterval: string = '1 hour'
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE MATERIALIZED VIEW IF NOT EXISTS ${name} AS
          ${query}
          WITH DATA;
          
          CREATE UNIQUE INDEX IF NOT EXISTS ${name}_idx ON ${name} (id);
          
          CREATE OR REPLACE FUNCTION refresh_${name}()
          RETURNS void AS $$
          BEGIN
            REFRESH MATERIALIZED VIEW CONCURRENTLY ${name};
          END;
          $$ LANGUAGE plpgsql;
          
          SELECT cron.schedule(
            'refresh-${name}',
            '${refreshInterval}',
            'SELECT refresh_${name}()'
          );
        `
      });

      if (error) throw error;

      securityLogger.log({
        type: 'database',
        severity: 'low',
        message: `Materialized view created: ${name}`
      });
    } catch (error) {
      securityLogger.log({
        type: 'database',
        severity: 'high',
        message: `Failed to create materialized view: ${name}`,
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  public async createPartitionedTable(
    tableName: string,
    partitionKey: string,
    partitionType: 'range' | 'list',
    partitionDefinition: string
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS ${tableName} (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            ${partitionKey} ${partitionType === 'range' ? 'timestamp' : 'text'},
            -- Add other columns here
            created_at timestamp with time zone DEFAULT now()
          ) PARTITION BY ${partitionType} (${partitionKey});
          
          ${partitionDefinition}
        `
      });

      if (error) throw error;

      securityLogger.log({
        type: 'database',
        severity: 'low',
        message: `Partitioned table created: ${tableName}`
      });
    } catch (error) {
      securityLogger.log({
        type: 'database',
        severity: 'high',
        message: `Failed to create partitioned table: ${tableName}`,
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  public async createIndex(
    tableName: string,
    indexName: string,
    columns: string[],
    indexType: 'btree' | 'hash' | 'gist' | 'gin' = 'btree'
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE INDEX IF NOT EXISTS ${indexName}
          ON ${tableName}
          USING ${indexType}
          (${columns.join(', ')});
        `
      });

      if (error) throw error;

      securityLogger.log({
        type: 'database',
        severity: 'low',
        message: `Index created: ${indexName} on ${tableName}`
      });
    } catch (error) {
      securityLogger.log({
        type: 'database',
        severity: 'high',
        message: `Failed to create index: ${indexName}`,
        metadata: { error: error.message }
      });
      throw error;
    }
  }
}

// Export singleton instance
export const databaseFunctions = DatabaseFunctions.getInstance(); 