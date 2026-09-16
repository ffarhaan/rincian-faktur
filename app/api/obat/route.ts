
import { NextRequest, NextResponse } from 'next/server';
import { getProductDetail } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const name = req.nextUrl.searchParams.get('name') || '';
    if (!name) {
      return NextResponse.json({ error: 'Nama obat wajib diisi' }, { status: 400 });
    }
    const detail = await getProductDetail(name);
    if (!detail) {
      return NextResponse.json({ error: 'Obat tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
