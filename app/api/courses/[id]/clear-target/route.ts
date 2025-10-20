import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function DELETE(
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
      const [courses] = await connection.query<RowDataPacket[]>(
        'SELECT course_id, course_title FROM courses WHERE course_id = ? AND is_target_course = 1',
        [courseId]
      );

      if (courses.length === 0) {
        return NextResponse.json(
          { error: 'This course is not set as target' },
          { status: 404 }
        );
      }

      const course = courses[0];

      await connection.query<ResultSetHeader>(`
        UPDATE courses
        SET is_target_course = 0,
            target_start_date = NULL,
            target_completion_date = NULL,
            target_daily_minutes = NULL,
            target_set_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE course_id = ?
      `, [courseId]);

      return NextResponse.json({
        success: true,
        course_id: courseId,
        course_title: course.course_title,
        message: '목표 강의가 해제되었습니다.',
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
