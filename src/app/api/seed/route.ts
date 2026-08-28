import { NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/seed';

export async function GET(req: Request) {
  try {
    // In production, block unrestricted public database reseeding
    if (process.env.NODE_ENV === 'production') {
      const authHeader = req.headers.get('authorization') || req.headers.get('x-seed-key');
      const expectedKey = process.env.ADMIN_SEED_SECRET;
      
      if (!expectedKey || authHeader !== `Bearer ${expectedKey}` && authHeader !== expectedKey) {
        return NextResponse.json(
          { error: 'Forbidden: Database seeding is disabled in production environments without authorization.' },
          { status: 403 }
        );
      }
    }

    await seedDatabase();
    return NextResponse.json({ success: true, message: 'Student database seeded!' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
