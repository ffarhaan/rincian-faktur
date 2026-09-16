
import { NextRequest, NextResponse } from 'next/server';
import { getSODetail } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const soId = decodeURIComponent(params.id);
    const detail = await getSODetail(soId);
    if (!detail) {
      return NextResponse.json({ error: 'Sales Order tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
