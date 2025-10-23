import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { DailyProgress } from '@/types';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    const connection = await pool.getConnection();

    try {
      const [results] = await connection.query<RowDataPacket[]>(`
        SELECT
          DATE(completed_at) as date,
          COUNT(*) as completed_lectures,
          SUM(lecture_time) as study_time_minutes
        FROM lectures
        WHERE is_completed = 1
        AND completed_at IS NOT NULL
        AND completed_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(completed_at)
        ORDER BY date DESC
      `);

      const dailyData: DailyProgress[] = results.map((row: RowDataPacket) => ({
        date: row.date ? new Date(row.date as Date).toISOString().split('T')[0] : '',
        completed_lectures: (row.completed_lectures as number) || 0,
        study_time_minutes: parseFloat((row.study_time_minutes as string) || '0'),
      }));

      return NextResponse.json({ daily_progress: dailyData });
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
