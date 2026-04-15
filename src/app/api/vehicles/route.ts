import { eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { vehicles } from '@/db/schema';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const activeParam = req.nextUrl.searchParams.get('active');

  const rows = await db
    .select()
    .from(vehicles)
    .where(activeParam === 'true' ? eq(vehicles.isActive, true) : undefined)
    .orderBy(vehicles.name);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, make, model, year, plate } = body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const yearNum = year !== undefined ? parseInt(String(year), 10) : undefined;
  if (yearNum !== undefined && isNaN(yearNum)) {
    return NextResponse.json({ error: 'year must be a number' }, { status: 400 });
  }

  const [vehicle] = await db
    .insert(vehicles)
    .values({
      name: name.trim(),
      make: make ?? null,
      model: model ?? null,
      year: yearNum ?? null,
      plate: plate ?? null,
    })
    .returning();

  return NextResponse.json(vehicle, { status: 201 });
}
