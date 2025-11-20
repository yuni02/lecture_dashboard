import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const [rows] = await pool.query(
      'SELECT id, file_name, original_name, file_type, file_size, file_path, uploaded_at FROM resumes ORDER BY uploaded_at DESC'
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error('이력서 목록 조회 에러:', error);
    return NextResponse.json(
      { error: '이력서 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
