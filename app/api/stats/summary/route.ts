import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { SummaryStats } from '@/types';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    const connection = await pool.getConnection();

    try {
      const [results] = await connection.query<RowDataPacket[]>(`
        SELECT
          COUNT(*) as total_courses,
          ROUND(AVG(progress_rate), 2) as avg_progress,
          SUM(study_time) as total_study_time,
          SUM(total_lecture_time) as total_lecture_time,
          SUM(total_lecture_time - study_time) as remaining_time
        FROM courses
      `);

      const stats = results[0];

      const result: SummaryStats = {
        total_courses: stats.total_courses || 0,
        avg_progress: parseFloat(stats.avg_progress || 0),
        total_study_time: parseFloat(stats.total_study_time || 0),
        total_lecture_time: parseFloat(stats.total_lecture_time || 0),
        remaining_time: parseFloat(stats.remaining_time || 0),
      };

      return NextResponse.json(result);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Database error', details: String(error) },
      { status: 500 }
    );
  }
}
