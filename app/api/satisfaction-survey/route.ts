import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { satisfaction, comments, trigger, timestamp } = await request.json();

    if (typeof satisfaction !== 'number' || satisfaction < 1 || satisfaction > 5) {
      return NextResponse.json(
        { error: 'Valid satisfaction rating is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.from('satisfaction_surveys').insert([
      {
        satisfaction,
        comments,
        trigger,
        timestamp,
      },
    ]);

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error submitting satisfaction survey:', error);
    return NextResponse.json(
      { error: 'Failed to submit satisfaction survey' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('satisfaction_surveys')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) throw error;

    // Calculate average satisfaction
    const averageSatisfaction =
      data.reduce((acc, survey) => acc + survey.satisfaction, 0) / data.length;

    return NextResponse.json({
      surveys: data,
      averageSatisfaction: averageSatisfaction.toFixed(1),
    });
  } catch (error) {
    console.error('Error fetching satisfaction surveys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch satisfaction surveys' },
      { status: 500 }
    );
  }
} 