import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/app/lib/db-init';

// API endpoint to manually trigger database initialization
export async function GET() {
  try {
    console.log('[DB Init API] Manual database initialization triggered');
    
    const results = await initializeDatabase();
    
    if (results.success) {
      console.log('[DB Init API] Database initialization completed successfully');
      return NextResponse.json({
        success: true,
        message: 'Database initialization completed successfully',
        operations: results.operations,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('[DB Init API] Database initialization completed with errors:', results.errors);
      return NextResponse.json({
        success: false,
        message: 'Database initialization completed with errors',
        operations: results.operations,
        errors: results.errors,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[DB Init API] Error initializing database:', error);
    return NextResponse.json({
      success: false,
      message: 'Error initializing database',
      error: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 