import { NextRequest, NextResponse } from 'next/server';
import { getCustomerItemHistory } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const customer = req.nextUrl.searchParams.get('customer') || '';
    const search = req.nextUrl.searchParams.get('search') || '';
    const isRetur = req.nextUrl.searchParams.get('isRetur') || 'all';
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1', 10);
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10);

    if (!customer) {
      return NextResponse.json({ error: 'Parameter customer wajib diisi' }, { status: 400 });
    }

    const result = await getCustomerItemHistory({
      namaPelanggan: customer,
      search,
      isRetur,
      page,
      limit
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
