import { NextRequest, NextResponse } from 'next/server';
import { getProductCustomerInvoices } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const product = req.nextUrl.searchParams.get('product') || '';
    const customer = req.nextUrl.searchParams.get('customer') || '';

    if (!product || !customer) {
      return NextResponse.json({ error: 'Parameter product dan customer wajib diisi' }, { status: 400 });
    }

    const invoices = await getProductCustomerInvoices(product, customer);
    return NextResponse.json({ invoices });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
