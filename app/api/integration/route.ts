import { NextRequest, NextResponse } from 'next/server';
import { IntegrationService } from '@/lib/services/IntegrationService';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  
  throw lastError;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    const body = await request.json();

    // Handle FHIR requests
    if (contentType.includes('application/fhir+json')) {
      const resource = body;
      const result = await retryOperation(() => 
        IntegrationService.createFHIRResource(resource)
      );
      return NextResponse.json(result);
    }

    // Handle HL7 messages
    if (contentType.includes('application/hl7-v2')) {
      const message = body.message;
      const config = body.config;
      
      if (!message || !config) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }

      try {
        await retryOperation(() => 
          IntegrationService.processHL7Message(message, config)
        );
        return NextResponse.json({ status: 'success' });
      } catch (error) {
        // Log the error
        await supabase
          .from('integration_logs')
          .insert({
            integration_type: 'HL7',
            direction: 'INBOUND',
            status: 'ERROR',
            payload: { message, config },
            error_message: error instanceof Error ? error.message : 'Unknown error'
          });

        return NextResponse.json(
          { error: 'Failed to process HL7 message' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Unsupported content type' },
      { status: 415 }
    );
  } catch (error) {
    console.error('Integration API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const resourceType = searchParams.get('resourceType');
    const id = searchParams.get('id');

    if (!resourceType) {
      return NextResponse.json(
        { error: 'Missing resourceType parameter' },
        { status: 400 }
      );
    }

    if (id) {
      const resource = await IntegrationService.getFHIRResource(resourceType, id);
      return NextResponse.json(resource);
    }

    const params: Record<string, any> = {};
    searchParams.forEach((value, key) => {
      if (key !== 'resourceType') {
        params[key] = value;
      }
    });

    const resources = await IntegrationService.searchFHIRResources(resourceType, params);
    return NextResponse.json(resources);
  } catch (error) {
    console.error('Integration API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    
    if (!contentType.includes('application/fhir+json')) {
      return NextResponse.json(
        { error: 'Unsupported content type' },
        { status: 415 }
      );
    }

    const resource = await request.json();
    const result = await IntegrationService.updateFHIRResource(resource);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Integration API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 