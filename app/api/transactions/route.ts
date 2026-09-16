
import { NextRequest, NextResponse } from 'next/server';
import { queryTransactions } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const tahun = searchParams.get('tahun') ? Number(searchParams.get('tahun')) : undefined;
    const bulan = searchParams.get('bulan') ? Number(searchParams.get('bulan')) : undefined;
    const category = searchParams.get('category') || undefined;
    const isRetur = searchParams.get('isRetur') || 'all';
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 50;
    const sortBy = searchParams.get('sortBy') || 'tanggal';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

    const result = await queryTransactions({
      search,
      tahun,
      bulan,
      category,
      isRetur,
      page,
      limit,
      sortBy,
      sortOrder
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
