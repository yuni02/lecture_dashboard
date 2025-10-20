import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { WeeklyProgress } from '@/types';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    const connection = await pool.getConnection();

    try {
      const [results] = await connection.query<RowDataPacket[]>(`
        SELECT
          YEARWEEK(completed_at, 1) as year_week,
          DATE(DATE_SUB(completed_at, INTERVAL WEEKDAY(completed_at) DAY)) as week_start,
          COUNT(*) as completed_lectures,
          SUM(lecture_time) as study_time_minutes
        FROM lectures
        WHERE is_completed = 1
        AND completed_at IS NOT NULL
        AND completed_at >= DATE_SUB(CURDATE(), INTERVAL 12 WEEK)
        GROUP BY YEARWEEK(completed_at, 1), week_start
        ORDER BY year_week DESC
      `);

      const weeklyData: WeeklyProgress[] = results.map((row: any) => ({
        year_week: row.year_week || 0,
        week_start: row.week_start ? new Date(row.week_start).toISOString().split('T')[0] : '',
        completed_lectures: row.completed_lectures || 0,
        study_time_minutes: parseFloat(row.study_time_minutes || 0),
      }));

      return NextResponse.json({ weekly_progress: weeklyData });
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
