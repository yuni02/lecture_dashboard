import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { CompletionEstimate } from '@/types';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    const connection = await pool.getConnection();

    try {
      const [results] = await connection.query<RowDataPacket[]>(`
        SELECT
          SUM(total_lecture_time - study_time) as remaining_minutes,
          CEILING(SUM(total_lecture_time - study_time) / 180) as days_needed_3h
        FROM courses
      `);

      const row = results[0];
      const remainingMinutes = parseFloat(row.remaining_minutes || 0);

      const result: CompletionEstimate = {
        remaining_minutes: remainingMinutes,
        days_needed_3h: parseInt(row.days_needed_3h || 0),
        days_1h_per_day: Math.round(remainingMinutes / 60),
        days_2h_per_day: Math.round(remainingMinutes / 120),
        days_3h_per_day: Math.round(remainingMinutes / 180),
        days_5h_per_day: Math.round(remainingMinutes / 300),
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
