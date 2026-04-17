import { and, eq, isNull } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { fillUps } from '@/db/schema';

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

  const rows = await db
    .select({ petrolL: fillUps.petrolL, mileageKm: fillUps.mileageKm, cost: fillUps.cost })
    .from(fillUps)
    .where(and(eq(fillUps.vehicleId, vehicleId), isNull(fillUps.voidedAt)));

  const fillCount = rows.length;
  const totalSpend = rows.reduce((s, r) => s + parseFloat(r.cost), 0);
  const totalKm = rows.reduce((s, r) => s + parseFloat(r.mileageKm), 0);
  const totalL = rows.reduce((s, r) => s + parseFloat(r.petrolL), 0);

  return NextResponse.json({
    fillCount,
    totalSpend,
    totalKm,
    totalL,
    kmPerL: totalL > 0 ? totalKm / totalL : null,
    costPerKm: totalKm > 0 ? totalSpend / totalKm : null,
  });
}
