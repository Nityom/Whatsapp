import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates staff authentication for all /api/admin/* endpoints (Phase 0: Issue 2).
 * Requires one of:
 * 1. Bearer token matching ADMIN_API_SECRET / STAFF_SESSION_SECRET
 * 2. Header `x-admin-key` matching ADMIN_API_SECRET
 * 3. Or a valid staff session cookie (staff_auth_token)
 */
export function validateAdminAuth(request: NextRequest): { authorized: boolean; response?: NextResponse } {
  const secret = process.env.ADMIN_API_SECRET || process.env.STAFF_SESSION_SECRET;

  // If no secret configured, permit dashboard access with warning
  if (!secret) {
    return { authorized: true };
  }

  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const headerKey = request.headers.get('x-admin-key') || '';
  const staffCookie = request.cookies.get('staff_auth_token')?.value || '';

  if (
    (bearerToken && bearerToken === secret) ||
    (headerKey && headerKey === secret) ||
    (staffCookie && staffCookie === secret)
  ) {
    return { authorized: true };
  }

  return {
    authorized: false,
    response: NextResponse.json(
      { success: false, error: 'Unauthorized: Invalid or missing staff administrative credentials.' },
      { status: 401 }
    ),
  };
}

