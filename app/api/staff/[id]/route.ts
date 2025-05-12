import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { successResponse, errorResponse, withErrorHandling, validateRequest } from '@/lib/api/routeHelpers';
import { HttpStatus } from '@/lib/api/types';
import type { StaffUpdate } from '@/lib/api/services/staff';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Validator for staff update
function isValidStaffUpdate(data: any): data is StaffUpdate {
  return (
    typeof data === 'object' &&
    Object.keys(data).length > 0
  );
}

// Helper function to check if staff exists
async function staffExists(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('staff')
    .select('id')
    .eq('id', id)
    .single();
    
  return !error && !!data;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withErrorHandling(async () => {
    const id = params.id;
    
    // Get staff member by ID
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - staff member not found
        return errorResponse(
          `Staff member with ID ${id} not found`,
          HttpStatus.NOT_FOUND
        );
      }
      
      return errorResponse(
        'Failed to fetch staff member',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { details: error.message }
      );
    }
    
    return successResponse(data);
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withErrorHandling(async () => {
    const id = params.id;
    const body = await request.json();
    
    // Validate request body
    const validation = validateRequest<StaffUpdate>(body, isValidStaffUpdate, 'Invalid staff update data');
    if (!validation.isValid) {
      return validation.error;
    }
    
    // Check if staff exists
    if (!(await staffExists(id))) {
      return errorResponse(
        `Staff member with ID ${id} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    
    // Update staff member
    const { data, error } = await supabase
      .from('staff')
      .update(validation.data)
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) {
      return errorResponse(
        'Failed to update staff member',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { details: error.message }
      );
    }
    
    return successResponse(data);
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withErrorHandling(async () => {
    const id = params.id;
    
    // Check if staff exists
    if (!(await staffExists(id))) {
      return errorResponse(
        `Staff member with ID ${id} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    
    // Delete staff member
    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', id);
    
    if (error) {
      return errorResponse(
        'Failed to delete staff member',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { details: error.message }
      );
    }
    
    return successResponse({ success: true });
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withErrorHandling(async () => {
    const id = params.id;
    const body = await request.json();
    
    // Check if staff exists
    if (!(await staffExists(id))) {
      return errorResponse(
        `Staff member with ID ${id} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    
    // Update staff member (for partial updates)
    const { data, error } = await supabase
      .from('staff')
      .update(body)
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) {
      return errorResponse(
        'Failed to update staff member',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { details: error.message }
      );
    }
    
    return successResponse(data);
  });
} 