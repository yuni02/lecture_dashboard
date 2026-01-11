import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    const connection = await pool.getConnection();

    try {
      // 최근 스냅샷과 현재 진도율을 비교하여 진척률이 높은 강의 조회
      const [topProgress] = await connection.query<RowDataPacket[]>(`
        SELECT
          c.course_id,
          c.course_title,
          c.url,
          c.progress_rate as current_progress,
          c.study_time as current_study_time,
          ps.progress_rate as previous_progress,
          ps.study_time as previous_study_time,
          ps.snapshot_date,
          (c.progress_rate - COALESCE(ps.progress_rate, 0)) as progress_change,
          (c.study_time - COALESCE(ps.study_time, 0)) as study_time_change
        FROM courses c
        LEFT JOIN (
          SELECT
            course_id,
            progress_rate,
            study_time,
            snapshot_date,
            ROW_NUMBER() OVER (PARTITION BY course_id ORDER BY snapshot_date DESC) as rn
          FROM course_progress_snapshots
          WHERE snapshot_date < DATE(NOW())
        ) ps ON c.course_id = ps.course_id AND ps.rn = 1
        WHERE c.progress_rate - COALESCE(ps.progress_rate, 0) > 0
        ORDER BY (c.progress_rate - COALESCE(ps.progress_rate, 0)) DESC
      `);

      const result = topProgress.map((row: RowDataPacket) => ({
        course_id: row.course_id,
        course_title: row.course_title,
        url: row.url,
        current_progress: parseFloat(row.current_progress) || 0,
        previous_progress: parseFloat(row.previous_progress) || 0,
        progress_change: parseFloat(row.progress_change) || 0,
        current_study_time: parseFloat(row.current_study_time) || 0,
        previous_study_time: parseFloat(row.previous_study_time) || 0,
        study_time_change: parseFloat(row.study_time_change) || 0,
        snapshot_date: row.snapshot_date,
      }));

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
