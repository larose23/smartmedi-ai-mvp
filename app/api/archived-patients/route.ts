import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { successResponse, errorResponse, withErrorHandling } from '@/lib/api/routeHelpers';
import { HttpStatus } from '@/lib/api/types';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortDirection = (searchParams.get('sortDirection') || 'desc') as 'asc' | 'desc';
    
    // Build query - get patients that have been archived
    let query = supabase
      .from('patients')
      .select('*')
      .not('archived_at', 'is', null)
      .order(sortBy, { ascending: sortDirection === 'asc' });
    
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
      return errorResponse(
        'Failed to fetch archived patients', 
        HttpStatus.INTERNAL_SERVER_ERROR, 
        { details: error.message }
      );
    }
    
    return successResponse(data, {
      count: count || data.length,
      page: offset ? Math.floor(parseInt(offset) / (parseInt(limit) || 10)) + 1 : 1,
      totalCount: count
    });
  });
} 