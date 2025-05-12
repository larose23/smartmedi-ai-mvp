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

/**
 * @openapi
 * /api/checkins:
 *   get:
 *     summary: Get all active patient check-ins
 *     description: Returns a list of all non-archived patient check-ins, with optional pagination.
 *     tags:
 *       - Patients
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Maximum number of check-ins to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Number of check-ins to skip
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Field to sort by (default: created_at)
 *       - in: query
 *         name: sortDirection
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort direction (default: desc)
 *     responses:
 *       200:
 *         description: A list of patient check-ins
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Patient'
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     totalCount:
 *                       type: integer
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortDirection = (searchParams.get('sortDirection') || 'desc') as 'asc' | 'desc';
    
    // Build query
    let query = supabase
      .from('check_ins')
      .select('*')
      .not('status', 'eq', 'archived')
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
        'Failed to fetch check-ins', 
        HttpStatus.INTERNAL_SERVER_ERROR, 
        { details: error.message }
      );
    }
    
    // Process and normalize data
    const processedData = data.map((item: any) => {
      // Handle the case where fields might be strings (from JSON)
      const symptoms = typeof item.symptoms === 'string' ? JSON.parse(item.symptoms) : item.symptoms || {};
      const additionalSymptoms =
        typeof item.additional_symptoms === 'string'
          ? JSON.parse(item.additional_symptoms)
          : item.additional_symptoms || [];
      const riskFactors =
        typeof item.risk_factors === 'string' ? JSON.parse(item.risk_factors) : item.risk_factors || [];
      const potentialDiagnoses =
        typeof item.potential_diagnoses === 'string'
          ? JSON.parse(item.potential_diagnoses)
          : item.potential_diagnoses || [];
      const recommendedActions =
        typeof item.recommended_actions === 'string'
          ? JSON.parse(item.recommended_actions)
          : item.recommended_actions || [];

      return {
        ...item,
        symptoms,
        additional_symptoms: additionalSymptoms,
        risk_factors: riskFactors,
        potential_diagnoses: potentialDiagnoses,
        recommended_actions: recommendedActions,
      };
    });
    
    return successResponse(processedData, {
      count: count || processedData.length,
      page: offset ? Math.floor(parseInt(offset) / (parseInt(limit) || 10)) + 1 : 1,
      totalCount: count
    });
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const body = await request.json();
    
    // Validate required fields
    if (!body.full_name || !body.date_of_birth) {
      return errorResponse(
        'Full name and date of birth are required', 
        HttpStatus.BAD_REQUEST
      );
    }
    
    // Insert the new check-in
    const { data, error } = await supabase
      .from('check_ins')
      .insert([body])
      .select('*')
      .single();
    
    if (error) {
      return errorResponse(
        'Failed to create check-in', 
        HttpStatus.INTERNAL_SERVER_ERROR, 
        { details: error.message }
      );
    }
    
    return successResponse(data);
  });
} 