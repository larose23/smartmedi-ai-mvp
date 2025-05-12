import { supabase } from '../supabase';
import { securityLogger } from '../security/logger';
import NodeCache from 'node-cache';

// Define indexes for frequently accessed fields
const REQUIRED_INDEXES = {
  patients: [
    { name: 'idx_patients_email', fields: ['email'] },
    { name: 'idx_patients_name', fields: ['firstName', 'lastName'] },
    { name: 'idx_patients_dob', fields: ['dateOfBirth'] }
  ],
  medical_records: [
    { name: 'idx_medical_records_patient', fields: ['patientId'] },
    { name: 'idx_medical_records_type', fields: ['recordType'] },
    { name: 'idx_medical_records_date', fields: ['createdAt'] }
  ],
  appointments: [
    { name: 'idx_appointments_patient', fields: ['patientId'] },
    { name: 'idx_appointments_doctor', fields: ['doctorId'] },
    { name: 'idx_appointments_date', fields: ['date'] },
    { name: 'idx_appointments_status', fields: ['status'] }
  ],
  staff: [
    { name: 'idx_staff_email', fields: ['email'] },
    { name: 'idx_staff_role', fields: ['role'] }
  ],
  security_logs: [
    { name: 'idx_security_logs_type', fields: ['type'] },
    { name: 'idx_security_logs_date', fields: ['createdAt'] }
  ],
  hipaa_audit_logs: [
    { name: 'idx_hipaa_user', fields: ['userId'] },
    { name: 'idx_hipaa_event', fields: ['eventType'] },
    { name: 'idx_hipaa_date', fields: ['createdAt'] }
  ]
};

// Define cache configurations
const CACHE_CONFIG = {
  patients: {
    ttl: 300, // 5 minutes
    checkPeriod: 60
  },
  medical_records: {
    ttl: 180, // 3 minutes
    checkPeriod: 60
  },
  appointments: {
    ttl: 60, // 1 minute
    checkPeriod: 30
  }
};

// Define optimized queries
const OPTIMIZED_QUERIES = {
  getPatientWithRecords: `
    SELECT p.*, 
           json_agg(
             json_build_object(
               'id', mr.id,
               'recordType', mr.recordType,
               'content', mr.content,
               'createdAt', mr.createdAt
             )
           ) as medical_records
    FROM patients p
    LEFT JOIN medical_records mr ON p.id = mr.patientId
    WHERE p.id = $1
    GROUP BY p.id
  `,
  getPatientAppointments: `
    SELECT a.*, 
           json_build_object(
             'id', s.id,
             'firstName', s.firstName,
             'lastName', s.lastName,
             'role', s.role
           ) as doctor
    FROM appointments a
    LEFT JOIN staff s ON a.doctorId = s.id
    WHERE a.patientId = $1
    ORDER BY a.date DESC
  `,
  getStaffSchedule: `
    SELECT a.*,
           json_build_object(
             'id', p.id,
             'firstName', p.firstName,
             'lastName', p.lastName
           ) as patient
    FROM appointments a
    LEFT JOIN patients p ON a.patientId = p.id
    WHERE a.doctorId = $1
    AND a.date >= $2
    AND a.date <= $3
    ORDER BY a.date ASC
  `
};

class QueryOptimizationManager {
  private static instance: QueryOptimizationManager;
  private readonly caches: Map<string, NodeCache>;
  private readonly queryStats: Map<string, { hits: number; misses: number }>;

  private constructor() {
    this.caches = new Map();
    this.queryStats = new Map();
    this.initializeCaches();
  }

  public static getInstance(): QueryOptimizationManager {
    if (!QueryOptimizationManager.instance) {
      QueryOptimizationManager.instance = new QueryOptimizationManager();
    }
    return QueryOptimizationManager.instance;
  }

  private initializeCaches(): void {
    for (const [table, config] of Object.entries(CACHE_CONFIG)) {
      this.caches.set(
        table,
        new NodeCache({
          stdTTL: config.ttl,
          checkperiod: config.checkPeriod
        })
      );
    }
  }

  public async ensureIndexes(): Promise<void> {
    try {
      for (const [table, indexes] of Object.entries(REQUIRED_INDEXES)) {
        for (const index of indexes) {
          const { error } = await supabase.rpc('create_index_if_not_exists', {
            table_name: table,
            index_name: index.name,
            columns: index.fields
          });

          if (error) {
            securityLogger.log({
              type: 'database',
              severity: 'high',
              message: `Failed to create index: ${index.name}`,
              metadata: { error: error.message }
            });
          }
        }
      }

      securityLogger.log({
        type: 'database',
        severity: 'low',
        message: 'Indexes verified successfully'
      });
    } catch (error) {
      securityLogger.log({
        type: 'database',
        severity: 'high',
        message: 'Failed to ensure indexes',
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  public async getCachedData<T>(
    table: string,
    key: string,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    const cache = this.caches.get(table);
    if (!cache) {
      return fetchFn();
    }

    const cachedData = cache.get<T>(key);
    if (cachedData) {
      this.updateQueryStats(table, 'hits');
      return cachedData;
    }

    this.updateQueryStats(table, 'misses');
    const data = await fetchFn();
    cache.set(key, data);
    return data;
  }

  private updateQueryStats(table: string, type: 'hits' | 'misses'): void {
    const stats = this.queryStats.get(table) || { hits: 0, misses: 0 };
    stats[type]++;
    this.queryStats.set(table, stats);
  }

  public async executeOptimizedQuery<T>(
    queryName: keyof typeof OPTIMIZED_QUERIES,
    params: any[],
    cacheKey?: string
  ): Promise<T> {
    if (cacheKey) {
      return this.getCachedData(
        'query_cache',
        cacheKey,
        async () => {
          const { data, error } = await supabase.rpc('exec_sql', {
            sql: OPTIMIZED_QUERIES[queryName],
            params
          });

          if (error) throw error;
          return data as T;
        }
      );
    }

    const { data, error } = await supabase.rpc('exec_sql', {
      sql: OPTIMIZED_QUERIES[queryName],
      params
    });

    if (error) throw error;
    return data as T;
  }

  public getQueryStats(): Record<string, { hits: number; misses: number; hitRate: number }> {
    const stats: Record<string, any> = {};

    for (const [table, data] of this.queryStats.entries()) {
      const total = data.hits + data.misses;
      stats[table] = {
        ...data,
        hitRate: total > 0 ? (data.hits / total) * 100 : 0
      };
    }

    return stats;
  }

  public async analyzeQuery(query: string): Promise<{
    executionPlan: any;
    estimatedCost: number;
    actualTime: number;
  }> {
    try {
      const { data, error } = await supabase.rpc('analyze_query', {
        query_text: `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`
      });

      if (error) throw error;

      const plan = data[0]['QUERY PLAN'][0];
      return {
        executionPlan: plan,
        estimatedCost: plan.Plan['Total Cost'],
        actualTime: plan.Plan['Actual Total Time']
      };
    } catch (error) {
      securityLogger.log({
        type: 'database',
        severity: 'high',
        message: 'Failed to analyze query',
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  public async getTableStats(): Promise<Record<string, {
    rowCount: number;
    size: string;
    indexSize: string;
    lastVacuum: string;
  }>> {
    try {
      const { data, error } = await supabase.rpc('get_table_stats');

      if (error) throw error;

      return data.reduce((acc: Record<string, any>, stat: any) => {
        acc[stat.table_name] = {
          rowCount: stat.row_count,
          size: stat.table_size,
          indexSize: stat.index_size,
          lastVacuum: stat.last_vacuum
        };
        return acc;
      }, {});
    } catch (error) {
      securityLogger.log({
        type: 'database',
        severity: 'high',
        message: 'Failed to get table statistics',
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  public async getQueryPerformanceStats(): Promise<{
    slowQueries: Array<{
      queryId: string;
      calls: number;
      totalTime: number;
      meanTime: number;
      rows: number;
    }>;
    indexUsage: Array<{
      tableName: string;
      indexName: string;
      indexSize: string;
      indexScans: number;
      rowsFetched: number;
    }>;
    tableBloat: Array<{
      tableName: string;
      bloatRatio: number;
      bloatSize: string;
    }>;
    activeLocks: Array<{
      lockType: string;
      relation: string;
      mode: string;
      granted: boolean;
      pid: number;
      query: string;
    }>;
  }> {
    try {
      const [
        { data: queryStats },
        { data: indexUsage },
        { data: tableBloat },
        { data: locks }
      ] = await Promise.all([
        supabase.rpc('get_query_stats'),
        supabase.rpc('get_index_usage'),
        supabase.rpc('get_table_bloat'),
        supabase.rpc('get_locks')
      ]);

      return {
        slowQueries: queryStats || [],
        indexUsage: indexUsage || [],
        tableBloat: tableBloat || [],
        activeLocks: locks || []
      };
    } catch (error) {
      securityLogger.log({
        type: 'database',
        severity: 'high',
        message: 'Failed to get query performance stats',
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  public async performMaintenance(): Promise<void> {
    try {
      const tables = [
        'patients',
        'medical_records',
        'appointments',
        'staff',
        'security_logs',
        'hipaa_audit_logs'
      ];

      // Perform VACUUM ANALYZE on all tables
      await Promise.all(
        tables.map(table =>
          supabase.rpc('vacuum_analyze', { table_name: table })
        )
      );

      // Refresh materialized views
      await supabase.rpc('exec_sql', {
        sql: `
          REFRESH MATERIALIZED VIEW CONCURRENTLY patient_summary_view;
          REFRESH MATERIALIZED VIEW CONCURRENTLY staff_schedule_view;
        `
      });

      securityLogger.log({
        type: 'database',
        severity: 'low',
        message: 'Database maintenance completed successfully'
      });
    } catch (error) {
      securityLogger.log({
        type: 'database',
        severity: 'high',
        message: 'Failed to perform database maintenance',
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  public async monitorQueryPerformance(
    threshold: number = 1000 // milliseconds
  ): Promise<{
    slowQueries: Array<{
      query: string;
      executionTime: number;
      timestamp: string;
    }>;
  }> {
    try {
      const { data: queryStats } = await supabase.rpc('get_query_stats');
      
      const slowQueries = (queryStats || [])
        .filter((stat: any) => stat.mean_time > threshold)
        .map((stat: any) => ({
          query: stat.query_id,
          executionTime: stat.mean_time,
          timestamp: new Date().toISOString()
        }));

      if (slowQueries.length > 0) {
        securityLogger.log({
          type: 'database',
          severity: 'medium',
          message: 'Slow queries detected',
          metadata: { slowQueries }
        });
      }

      return { slowQueries };
    } catch (error) {
      securityLogger.log({
        type: 'database',
        severity: 'high',
        message: 'Failed to monitor query performance',
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  public async optimizeTable(
    tableName: string,
    options: {
      vacuum?: boolean;
      analyze?: boolean;
      reindex?: boolean;
    } = { vacuum: true, analyze: true, reindex: true }
  ): Promise<void> {
    try {
      const tasks = [];

      if (options.vacuum) {
        tasks.push(
          supabase.rpc('vacuum_analyze', { table_name: tableName })
        );
      }

      if (options.reindex) {
        tasks.push(
          supabase.rpc('exec_sql', {
            sql: `REINDEX TABLE ${tableName};`
          })
        );
      }

      await Promise.all(tasks);

      securityLogger.log({
        type: 'database',
        severity: 'low',
        message: `Table optimization completed: ${tableName}`,
        metadata: { options }
      });
    } catch (error) {
      securityLogger.log({
        type: 'database',
        severity: 'high',
        message: `Failed to optimize table: ${tableName}`,
        metadata: { error: error.message, options }
      });
      throw error;
    }
  }

  public async getCacheStats(): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    keys: number;
  }> {
    const stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
      keys: 0
    };

    for (const cache of this.caches.values()) {
      const cacheStats = cache.getStats();
      stats.hits += cacheStats.hits;
      stats.misses += cacheStats.misses;
      stats.keys += cacheStats.keys;
    }

    const total = stats.hits + stats.misses;
    stats.hitRate = total > 0 ? (stats.hits / total) * 100 : 0;

    return stats;
  }

  public async clearCache(table?: string): Promise<void> {
    if (table) {
      const cache = this.caches.get(table);
      if (cache) {
        cache.flushAll();
      }
    } else {
      for (const cache of this.caches.values()) {
        cache.flushAll();
      }
    }

    securityLogger.log({
      type: 'database',
      severity: 'low',
      message: `Cache cleared${table ? ` for table: ${table}` : ''}`
    });
  }
}

// Export singleton instance
export const queryOptimizationManager = QueryOptimizationManager.getInstance(); 