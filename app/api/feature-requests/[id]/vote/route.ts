import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // First, get the current feature request
    const { data: featureRequest, error: fetchError } = await supabase
      .from('feature_requests')
      .select('votes')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Update the votes count
    const { data, error } = await supabase
      .from('feature_requests')
      .update({ votes: featureRequest.votes + 1 })
      .eq('id', id)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error voting for feature request:', error);
    return NextResponse.json(
      { error: 'Failed to vote for feature request' },
      { status: 500 }
    );
  }
} 