import { and, eq, isNull } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { fillUps } from '@/db/schema';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fillId = parseInt(id, 10);
  if (isNaN(fillId)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const body = await req.json();
  const reason = body?.reason;

  if (!reason || typeof reason !== 'string' || reason.trim() === '') {
    return NextResponse.json({ error: 'reason is required' }, { status: 400 });
  }

  const [updated] = await db
    .update(fillUps)
    .set({ voidedAt: new Date(), voidReason: reason.trim() })
    .where(and(eq(fillUps.id, fillId), isNull(fillUps.voidedAt)))
    .returning();

  if (!updated) {
    // Either not found or already voided
    const [existing] = await db.select().from(fillUps).where(eq(fillUps.id, fillId)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: 'fill-up not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'fill-up is already voided' }, { status: 409 });
  }

  return NextResponse.json(updated);
}
