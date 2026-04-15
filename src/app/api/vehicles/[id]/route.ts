import { eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { vehicles } from '@/db/schema';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vehicleId = parseInt(id, 10);
  if (isNaN(vehicleId)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const body = await req.json();
  const updates: Partial<typeof vehicles.$inferInsert> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 });
    }
    updates.name = body.name.trim();
  }
  if (body.make !== undefined) updates.make = body.make;
  if (body.model !== undefined) updates.model = body.model;
  if (body.year !== undefined) {
    const y = parseInt(String(body.year), 10);
    if (isNaN(y)) return NextResponse.json({ error: 'year must be a number' }, { status: 400 });
    updates.year = y;
  }
  if (body.plate !== undefined) updates.plate = body.plate;
  if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 });
  }

  const [updated] = await db
    .update(vehicles)
    .set(updates)
    .where(eq(vehicles.id, vehicleId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: 'vehicle not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
