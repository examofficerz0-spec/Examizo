import { NextResponse } from 'next/server';
import { queryD1 } from '@/lib/d1';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const DEFAULT_GALLERY = [
  {
    id: 'gal_default_1',
    title: 'National Proctored Exam Hall Alpha',
    description: 'High-capacity, CCTV-monitored examination environment designed for national competitive entrance simulations.',
    image_url: '/images/exam_hall_1.jpg',
    category: 'Exam Halls',
    display_order: 1,
    is_active: 1,
  },
  {
    id: 'gal_default_2',
    title: 'Advanced Computer Testing Center',
    description: 'High-speed isolated terminals configured for timed online mock exams and real-time rank evaluations.',
    image_url: '/images/exam_hall_2.jpg',
    category: 'Exam Halls',
    display_order: 2,
    is_active: 1,
  },
  {
    id: 'gal_default_3',
    title: 'Intensive Aspirant Study Circles',
    description: 'Focused collaborative discussion halls and silent doubt resolution pods for JEE and NEET aspirants.',
    image_url: '/images/exam_hall_3.jpg',
    category: 'Classrooms',
    display_order: 3,
    is_active: 1,
  },
  {
    id: 'gal_default_4',
    title: 'Central Examination Auditorium',
    description: 'State-of-the-art auditorium equipped with digital clocks and proctor supervision for large-scale scholarship tests.',
    image_url: '/images/exam_hall_4.jpg',
    category: 'Campus & Facilities',
    display_order: 4,
    is_active: 1,
  },
  {
    id: 'gal_default_5',
    title: 'Academic Prep & Strategic Library',
    description: 'Comprehensive repository of national test archives, reference texts, and revision problem sets.',
    image_url: '/study_hero_bg.png',
    category: 'Campus & Facilities',
    display_order: 5,
    is_active: 1,
  },
  {
    id: 'gal_default_6',
    title: 'Official Examizo Student Mascot',
    description: 'Meet our student mascot cheering every aspirant towards consistency, discipline, and top ranks.',
    image_url: '/mascot.jpg',
    category: 'General',
    display_order: 6,
    is_active: 1,
  },
];

export async function GET() {
  try {
    const gallery = await queryD1(
      'SELECT * FROM gallery WHERE is_active = 1 ORDER BY display_order ASC, created_at DESC'
    );
    if (gallery && Array.isArray(gallery) && gallery.length > 0) {
      return NextResponse.json({ success: true, gallery });
    }
    return NextResponse.json({ success: true, gallery: DEFAULT_GALLERY });
  } catch (error: any) {
    console.error('[api/gallery] Error:', error);
    return NextResponse.json({ success: true, gallery: DEFAULT_GALLERY });
  }
}
