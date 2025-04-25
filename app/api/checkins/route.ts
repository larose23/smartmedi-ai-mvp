import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    // Validate request method
    if (request.method !== 'GET') {
      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    
    // Build query
    let query = supabase
      .from('check_ins')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Apply pagination if specified
    if (limit) {
      const limitNum = parseInt(limit);
      query = query.limit(limitNum);
      
      if (offset) {
        const offsetNum = parseInt(offset);
        query = query.range(offsetNum, offsetNum + limitNum - 1);
      }
    }
    
    // Execute query
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch check-ins' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      data,
      count: count || data.length,
    });
  } catch (error) {
    console.error('Check-ins API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 