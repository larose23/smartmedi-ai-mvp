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

// Helper function to check if staff exists
async function staffExists(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('staff')
    .select('id')
    .eq('id', id)
    .single();
    
  return !error && !!data;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withErrorHandling(async () => {
    const id = params.id;
    const body = await request.json();
    
    // Validate required field
    if (typeof body.available !== 'boolean') {
      return errorResponse(
        'The "available" property is required and must be a boolean',
        HttpStatus.BAD_REQUEST
      );
    }
    
    // Check if staff exists
    if (!(await staffExists(id))) {
      return errorResponse(
        `Staff member with ID ${id} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    
    // Update staff availability
    const { data, error } = await supabase
      .from('staff')
      .update({ available: body.available })
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) {
      return errorResponse(
        'Failed to update staff availability',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { details: error.message }
      );
    }
    
    return successResponse(data);
  });
} 