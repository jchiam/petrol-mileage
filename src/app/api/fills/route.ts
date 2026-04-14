import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { fillUps, vehicles } from '@/db/schema'
import { and, desc, eq, isNull } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const vehicleIdParam = searchParams.get('vehicle_id')
  const voidedParam = searchParams.get('voided') // 'true' = include voided, default = exclude
  const limitParam = searchParams.get('limit')
  const offsetParam = searchParams.get('offset')

  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 200) : 50
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0

  if (isNaN(limit) || isNaN(offset)) {
    return NextResponse.json({ error: 'invalid limit or offset' }, { status: 400 })
  }

  const conditions = []
  if (vehicleIdParam) {
    const vehicleId = parseInt(vehicleIdParam, 10)
    if (isNaN(vehicleId)) {
      return NextResponse.json({ error: 'invalid vehicle_id' }, { status: 400 })
    }
    conditions.push(eq(fillUps.vehicleId, vehicleId))
  }
  if (voidedParam !== 'true') {
    conditions.push(isNull(fillUps.voidedAt))
  }

  const rows = await db
    .select()
    .from(fillUps)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(fillUps.pumpDate), desc(fillUps.id))
    .limit(limit)
    .offset(offset)

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { vehicle_id, pump_date, petrol_l, mileage_km, cost } = body

  if (!vehicle_id || !pump_date || petrol_l == null || mileage_km == null || cost == null) {
    return NextResponse.json(
      { error: 'vehicle_id, pump_date, petrol_l, mileage_km, and cost are required' },
      { status: 400 },
    )
  }

  const vehicleId = parseInt(String(vehicle_id), 10)
  if (isNaN(vehicleId)) {
    return NextResponse.json({ error: 'invalid vehicle_id' }, { status: 400 })
  }

  // Validate date format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pump_date)) {
    return NextResponse.json({ error: 'pump_date must be YYYY-MM-DD' }, { status: 400 })
  }

  const petrolLNum = parseFloat(String(petrol_l))
  const mileageKmNum = parseFloat(String(mileage_km))
  const costNum = parseFloat(String(cost))

  if (isNaN(petrolLNum) || petrolLNum <= 0) {
    return NextResponse.json({ error: 'petrol_l must be a positive number' }, { status: 400 })
  }
  if (isNaN(mileageKmNum) || mileageKmNum <= 0) {
    return NextResponse.json({ error: 'mileage_km must be a positive number' }, { status: 400 })
  }
  if (isNaN(costNum) || costNum <= 0) {
    return NextResponse.json({ error: 'cost must be a positive number' }, { status: 400 })
  }

  // Verify vehicle exists
  const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1)
  if (!vehicle) {
    return NextResponse.json({ error: 'vehicle not found' }, { status: 404 })
  }

  const [fill] = await db
    .insert(fillUps)
    .values({
      vehicleId,
      pumpDate: pump_date,
      petrolL: String(petrolLNum),
      mileageKm: String(mileageKmNum),
      cost: String(costNum),
    })
    .returning()

  return NextResponse.json(fill, { status: 201 })
}
