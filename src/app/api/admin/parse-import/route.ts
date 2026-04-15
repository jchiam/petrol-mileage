import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { parseImportFile } from '@/lib/import-parser';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const isCsv = file.name.toLowerCase().endsWith('.csv');

  const outcome = await parseImportFile(arrayBuffer, isCsv);
  return NextResponse.json(outcome);
}
