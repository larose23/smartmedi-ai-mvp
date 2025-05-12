import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { mfaManager, SensitiveOperation } from './mfa';
import { securityLogger } from './logger';

// Map API endpoints to sensitive operations
const SENSITIVE_ENDPOINTS: Record<string, SensitiveOperation> = {
  '/api/patients/delete': SensitiveOperation.PATIENT_DELETE,
  '/api/appointments/cancel': SensitiveOperation.APPOINTMENT_CANCEL,
  '/api/staff/role': SensitiveOperation.STAFF_ROLE_CHANGE,
  '/api/settings': SensitiveOperation.SETTINGS_UPDATE,
  '/api/billing': SensitiveOperation.BILLING_UPDATE,
  '/api/medical-records': SensitiveOperation.MEDICAL_RECORD_UPDATE
};

export async function mfaMiddleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const operation = SENSITIVE_ENDPOINTS[path];

  // If this is not a sensitive operation, proceed
  if (!operation) {
    return NextResponse.next();
  }

  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return new NextResponse(
      JSON.stringify({ error: 'User ID is required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Check if MFA is already verified for this operation
  if (mfaManager.isVerified(userId, operation)) {
    return NextResponse.next();
  }

  // If this is a verification attempt
  if (path.endsWith('/verify')) {
    const token = request.headers.get('x-mfa-token');
    if (!token) {
      return new NextResponse(
        JSON.stringify({ error: 'MFA token is required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const isValid = await mfaManager.verifyMFA(userId, token, operation);
    if (!isValid) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid MFA token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return NextResponse.next();
  }

  // For the initial request, initiate MFA
  const email = request.headers.get('x-user-email');
  if (!email) {
    return new NextResponse(
      JSON.stringify({ error: 'User email is required for MFA' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { token, expiresAt } = await mfaManager.initiateMFA(userId, operation, email);
    
    return new NextResponse(
      JSON.stringify({
        message: 'MFA required',
        expiresAt,
        verificationEndpoint: `${path}/verify`
      }),
      { 
        status: 403,
        headers: { 
          'Content-Type': 'application/json',
          'X-MFA-Required': 'true'
        }
      }
    );
  } catch (error) {
    securityLogger.log({
      type: 'auth',
      severity: 'high',
      message: 'MFA initiation failed',
      metadata: { userId, operation, error: error.message }
    });

    return new NextResponse(
      JSON.stringify({ error: 'Failed to initiate MFA' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 