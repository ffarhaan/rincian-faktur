import { NextRequest, NextResponse } from 'next/server';
import { getReturnInvoices } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const limit = Number(req.nextUrl.searchParams.get('limit')) || 80;
    const invoices = await getReturnInvoices(limit);
    return NextResponse.json({ invoices });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
