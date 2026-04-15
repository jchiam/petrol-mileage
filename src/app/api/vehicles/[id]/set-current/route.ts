import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { vehicles } from '@/db/schema'
import { eq, ne } from 'drizzle-orm'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const vehicleId = parseInt(id, 10)
  if (isNaN(vehicleId)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  }

  await db.update(vehicles).set({ isCurrent: false }).where(ne(vehicles.id, vehicleId))
  const [updated] = await db
    .update(vehicles)
    .set({ isCurrent: true })
    .where(eq(vehicles.id, vehicleId))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: 'vehicle not found' }, { status: 404 })
  }

  return NextResponse.json(updated)
}
