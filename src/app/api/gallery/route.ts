import { NextResponse } from 'next/server';
import { queryD1 } from '@/lib/d1';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const gallery = await queryD1(
      'SELECT * FROM gallery WHERE is_active = 1 ORDER BY display_order ASC, created_at DESC'
    );
    return NextResponse.json({ success: true, gallery: gallery || [] });
  } catch (error: any) {
    console.error('[api/gallery] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch gallery' }, { status: 500 });
  }
}
