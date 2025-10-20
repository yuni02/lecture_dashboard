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
    const { is_visible_on_dashboard } = body;

    if (typeof is_visible_on_dashboard !== 'boolean') {
      return NextResponse.json(
        { error: 'is_visible_on_dashboard must be a boolean' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();

    try {
      // 강의 존재 확인
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

      // 대시보드 표시 상태 업데이트
      await connection.query<ResultSetHeader>(`
        UPDATE courses
        SET is_visible_on_dashboard = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE course_id = ?
      `, [is_visible_on_dashboard, courseId]);

      return NextResponse.json({
        success: true,
        course_id: courseId,
        is_visible_on_dashboard,
        message: is_visible_on_dashboard ? '대시보드에 표시됩니다.' : '대시보드에서 숨겨집니다.',
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
