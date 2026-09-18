import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEPLOYMENT_VERSION =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_DEPLOYMENT_ID ||
  process.env.NEXT_PUBLIC_BUILD_TIMESTAMP ||
  process.env.BUILD_ID ||
  'development';

export async function GET() {
  return NextResponse.json(
    {
      version: DEPLOYMENT_VERSION,
      timestamp: process.env.NEXT_PUBLIC_BUILD_TIMESTAMP || new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Surrogate-Control': 'no-store',
      },
    }
  );
}
