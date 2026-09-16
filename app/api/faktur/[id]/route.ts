
import { NextRequest, NextResponse } from 'next/server';
import { getInvoiceDetail } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const invId = decodeURIComponent(params.id);
    const detail = await getInvoiceDetail(invId);
    if (!detail) {
      return NextResponse.json({ error: 'Faktur tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
