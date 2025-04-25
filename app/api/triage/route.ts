import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Define validation schema
const triageSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  day: z.string().min(1, 'Day is required'),
  month: z.string().min(1, 'Month is required'),
  year: z.string().min(1, 'Year is required'),
  contactInfo: z.string().min(1, 'Contact information is required'),
  primarySymptom: z.enum(['Chest Pain', 'Fever', 'Headache', 'Other']),
  additionalSymptoms: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    // Validate request method
    if (request.method !== 'POST') {
      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = triageSchema.parse(body);
    
    // Calculate triage score
    let triageScore: 'High' | 'Medium' | 'Low';
    switch (validatedData.primarySymptom) {
      case 'Chest Pain':
        triageScore = 'High';
        break;
      case 'Fever':
        triageScore = 'Medium';
        break;
      default:
        triageScore = 'Low';
    }
    
    // Format date of birth
    const dateOfBirth = new Date(
      parseInt(validatedData.year),
      parseInt(validatedData.month) - 1,
      parseInt(validatedData.day)
    ).toISOString();
    
    // Insert into Supabase
    const { data, error } = await supabase
      .from('check_ins')
      .insert([
        {
          full_name: validatedData.fullName,
          date_of_birth: dateOfBirth,
          contact_info: validatedData.contactInfo,
          primary_symptom: validatedData.primarySymptom,
          additional_symptoms: validatedData.additionalSymptoms,
          triage_score: triageScore,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to save check-in data' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Triage API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 