import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { CourseProgressHistory } from '@/types';
import { RowDataPacket } from 'mysql2';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const courseId = parseInt(id);

    if (isNaN(courseId)) {
      return NextResponse.json(
        { error: 'Invalid course ID' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();

    try {
      const [results] = await connection.query<RowDataPacket[]>(`
        SELECT
          DATE(completed_at) as date,
          COUNT(*) as completed_lectures,
          SUM(lecture_time) as study_time_minutes,
          (SELECT COUNT(*) FROM lectures WHERE course_id = ? AND is_completed = 1 AND DATE(completed_at) <= DATE(l.completed_at)) as cumulative_completed
        FROM lectures l
        WHERE course_id = ?
        AND is_completed = 1
        AND completed_at IS NOT NULL
        GROUP BY DATE(completed_at)
        ORDER BY date ASC
      `, [courseId, courseId]);

      const progressData: CourseProgressHistory[] = results.map((row: any) => ({
        date: row.date ? new Date(row.date).toISOString().split('T')[0] : '',
        completed_lectures: row.completed_lectures || 0,
        study_time_minutes: parseFloat(row.study_time_minutes || 0),
        cumulative_completed: row.cumulative_completed || 0,
      }));

      return NextResponse.json({
        course_id: courseId,
        progress_history: progressData,
      });
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
