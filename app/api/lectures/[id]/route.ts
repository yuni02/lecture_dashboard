import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { verifyAuthHeader } from '@/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 인증 확인
  const isAuthenticated = await verifyAuthHeader(request);
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid or missing password' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const lectureId = parseInt(id);

    if (isNaN(lectureId)) {
      return NextResponse.json(
        { error: 'Invalid lecture ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { is_completed } = body;

    if (typeof is_completed !== 'boolean') {
      return NextResponse.json(
        { error: 'is_completed must be a boolean' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();

    try {
      // 강의 존재 확인
      const [lectures] = await connection.query<RowDataPacket[]>(
        'SELECT lecture_id, course_id FROM lectures WHERE lecture_id = ?',
        [lectureId]
      );

      if (lectures.length === 0) {
        return NextResponse.json(
          { error: 'Lecture not found' },
          { status: 404 }
        );
      }

      const lecture = lectures[0];

      // 완료 상태 업데이트
      const completedAt = is_completed ? new Date() : null;

      await connection.query<ResultSetHeader>(`
        UPDATE lectures
        SET is_completed = ?,
            completed_at = ?
        WHERE lecture_id = ?
      `, [is_completed, completedAt, lectureId]);

      // 해당 코스의 통계 다시 계산
      const [courseStats] = await connection.query<RowDataPacket[]>(`
        SELECT
          SUM(lecture_time) as total_lecture_time,
          SUM(CASE WHEN is_completed = 1 THEN lecture_time ELSE 0 END) as study_time,
          COUNT(*) as total_count,
          SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed_count
        FROM lectures
        WHERE course_id = ?
      `, [lecture.course_id]);

      const stats = courseStats[0];
      const totalLectureTime = parseFloat(stats.total_lecture_time || 0);
      const studyTime = parseFloat(stats.study_time || 0);
      const totalCount = stats.total_count || 0;
      const completedCount = stats.completed_count || 0;
      const progressRate = totalCount > 0
        ? Math.round((completedCount / totalCount) * 100 * 100) / 100
        : 0;

      // courses 테이블 업데이트
      await connection.query<ResultSetHeader>(`
        UPDATE courses
        SET total_lecture_time = ?,
            study_time = ?,
            progress_rate = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE course_id = ?
      `, [totalLectureTime, studyTime, progressRate, lecture.course_id]);

      return NextResponse.json({
        success: true,
        lecture_id: lectureId,
        is_completed,
        message: is_completed ? '강의를 완료로 표시했습니다.' : '강의를 미완료로 표시했습니다.',
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
