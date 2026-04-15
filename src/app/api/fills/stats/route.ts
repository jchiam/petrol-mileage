import { eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { fillUps } from '@/db/schema';
import { computeStats } from '@/lib/stats';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const vehicleIdParam = req.nextUrl.searchParams.get('vehicle_id');

  if (!vehicleIdParam) {
    return NextResponse.json({ error: 'vehicle_id is required' }, { status: 400 });
  }

  const vehicleId = parseInt(vehicleIdParam, 10);
  if (isNaN(vehicleId)) {
    return NextResponse.json({ error: 'invalid vehicle_id' }, { status: 400 });
  }

  // Fetch all fills for this vehicle (voided + active) so stats include full history
  const rows = await db
    .select()
    .from(fillUps)
    .where(eq(fillUps.vehicleId, vehicleId))
    .orderBy(fillUps.pumpDate, fillUps.id);

  const result = computeStats(rows);
  return NextResponse.json(result);
}
