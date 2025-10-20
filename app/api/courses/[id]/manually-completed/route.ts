import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function PATCH(
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

    const body = await request.json();
    const { is_manually_completed } = body;

    if (typeof is_manually_completed !== 'boolean') {
      return NextResponse.json(
        { error: 'is_manually_completed must be a boolean' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();

    try {
      const [courses] = await connection.query<RowDataPacket[]>(
        'SELECT course_id FROM courses WHERE course_id = ?',
        [courseId]
      );

      if (courses.length === 0) {
        return NextResponse.json(
          { error: 'Course not found' },
          { status: 404 }
        );
      }

      await connection.query<ResultSetHeader>(`
        UPDATE courses
        SET is_manually_completed = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE course_id = ?
      `, [is_manually_completed, courseId]);

      return NextResponse.json({
        success: true,
        course_id: courseId,
        is_manually_completed,
        message: `강의 크롤링 ${is_manually_completed ? '제외' : '포함'} 처리되었습니다.`,
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
