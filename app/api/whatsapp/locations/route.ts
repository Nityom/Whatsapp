import { NextResponse } from 'next/server';
import { getConvexClient } from '@/lib/conversation';
import { api } from '@/convex/_generated/api';

export async function GET() {
  try {
    const convex = getConvexClient();
    const locations = await convex.query(api.locations.listLocationsWithVehicles);
    return NextResponse.json({ success: true, locations });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
