import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { sql } = await request.json();
    
    if (!sql) {
      return NextResponse.json({ 
        success: false, 
        error: 'No SQL query provided' 
      }, { status: 400 });
    }
    
    console.log(`[Direct SQL] Running query: ${sql}`);
    
    // Execute the SQL directly using the REST API
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        query: sql
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Direct SQL] Error executing query:', errorData);
      return NextResponse.json({ 
        success: false, 
        error: `Error executing query: ${JSON.stringify(errorData)}`
      }, { status: 500 });
    }
    
    const result = await response.json();
    console.log('[Direct SQL] Query executed successfully');
    
    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('[Direct SQL] Unhandled error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error)
    }, { status: 500 });
  }
} 