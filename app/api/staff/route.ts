import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { successResponse, errorResponse, withErrorHandling, validateRequest } from '@/lib/api/routeHelpers';
import { HttpStatus } from '@/lib/api/types';
import type { StaffCreate, StaffUpdate } from '@/lib/api/services/staff';

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
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortDirection = (searchParams.get('sortDirection') || 'asc') as 'asc' | 'desc';
    const available = searchParams.get('available');
    const department = searchParams.get('department');
    
    // Build query
    let query = supabase
      .from('staff')
      .select('*')
      .order(sortBy, { ascending: sortDirection === 'asc' });
    
    // Apply filters if specified
    if (available === 'true') {
      query = query.eq('available', true);
    }
    
    if (department) {
      query = query.eq('department', department);
    }
    
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
        'Failed to fetch staff', 
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

// Validator for staff creation
function isValidStaffCreate(data: any): data is StaffCreate {
  return (
    typeof data === 'object' &&
    typeof data.name === 'string' &&
    typeof data.role === 'string'
  );
}

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const body = await request.json();
    
    // Validate request body
    const validation = validateRequest<StaffCreate>(body, isValidStaffCreate);
    if (!validation.isValid) {
      return validation.error;
    }
    
    // Create staff member
    const { data, error } = await supabase
      .from('staff')
      .insert([validation.data])
      .select('*')
      .single();
    
    if (error) {
      return errorResponse(
        'Failed to create staff member', 
        HttpStatus.INTERNAL_SERVER_ERROR, 
        { details: error.message }
      );
    }
    
    return successResponse(data);
  });
} 