import { eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { fillUps, vehicles } from '@/db/schema';

interface ImportRow {
  pump_date: string;
  petrol_l: number | string;
  mileage_km: number | string;
  cost: number | string;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { vehicle_id, rows } = body;

  if (!vehicle_id) {
    return NextResponse.json({ error: 'vehicle_id is required' }, { status: 400 });
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'rows must be a non-empty array' }, { status: 400 });
  }

  const vehicleId = parseInt(String(vehicle_id), 10);
  if (isNaN(vehicleId)) {
    return NextResponse.json({ error: 'invalid vehicle_id' }, { status: 400 });
  }

  // Verify vehicle exists (inactive vehicles are allowed for historical import)
  const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1);
  if (!vehicle) {
    return NextResponse.json({ error: 'vehicle not found' }, { status: 404 });
  }

  // Validate and clean each row
  const validRows: {
    vehicleId: number;
    pumpDate: string;
    petrolL: string;
    mileageKm: string;
    cost: string;
  }[] = [];
  const errors: { index: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as ImportRow;

    if (!row.pump_date || !/^\d{4}-\d{2}-\d{2}$/.test(String(row.pump_date))) {
      errors.push({ index: i, error: 'pump_date must be YYYY-MM-DD' });
      continue;
    }

    const petrolL = parseFloat(String(row.petrol_l));
    const mileageKm = parseFloat(String(row.mileage_km));
    const cost = parseFloat(String(row.cost));

    if (isNaN(petrolL) || petrolL <= 0) {
      errors.push({ index: i, error: 'petrol_l must be a positive number' });
      continue;
    }
    if (isNaN(mileageKm) || mileageKm <= 0) {
      errors.push({ index: i, error: 'mileage_km must be a positive number' });
      continue;
    }
    if (isNaN(cost) || cost <= 0) {
      errors.push({ index: i, error: 'cost must be a positive number' });
      continue;
    }

    validRows.push({
      vehicleId,
      pumpDate: String(row.pump_date),
      petrolL: String(petrolL),
      mileageKm: String(mileageKm),
      cost: String(cost),
    });
  }

  if (validRows.length === 0) {
    return NextResponse.json({ error: 'no valid rows to insert', errors }, { status: 400 });
  }

  // Insert in batches of 100, skipping rows that already exist
  let inserted = 0;
  let duplicates = 0;
  const batchSize = 100;
  for (let i = 0; i < validRows.length; i += batchSize) {
    const batch = validRows.slice(i, i + batchSize);
    const result = await db
      .insert(fillUps)
      .values(batch)
      .onConflictDoNothing()
      .returning({ id: fillUps.id });
    inserted += result.length;
    duplicates += batch.length - result.length;
  }

  return NextResponse.json({ inserted, skipped: errors.length + duplicates, errors });
}
