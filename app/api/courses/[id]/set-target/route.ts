import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function POST(
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
    const { target_start_date, target_completion_date } = body;

    if (!target_start_date || !target_completion_date) {
      return NextResponse.json(
        { error: 'target_start_date and target_completion_date are required' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();

    try {
      const [courses] = await connection.query<RowDataPacket[]>(`
        SELECT course_id, course_title
        FROM courses
        WHERE course_id = ?
      `, [courseId]);

      if (courses.length === 0) {
        return NextResponse.json(
          { error: 'Course not found' },
          { status: 404 }
        );
      }

      const course = courses[0];

      const [lectures] = await connection.query<RowDataPacket[]>(`
        SELECT lecture_time, is_completed
        FROM lectures
        WHERE course_id = ?
      `, [courseId]);

      let totalTime = 0;
      let studiedTime = 0;

      lectures.forEach((lecture: any) => {
        const lectureTime = parseFloat(lecture.lecture_time || 0);
        totalTime += lectureTime;
        if (lecture.is_completed) {
          studiedTime += lectureTime;
        }
      });

      const remainingMinutes = totalTime - studiedTime;

      const startDate = new Date(target_start_date);
      const completionDate = new Date(target_completion_date);

      if (completionDate <= startDate) {
        return NextResponse.json(
          { error: 'Completion date must be after start date' },
          { status: 400 }
        );
      }

      if (remainingMinutes <= 0) {
        return NextResponse.json(
          { error: 'This course is already completed' },
          { status: 400 }
        );
      }

      const studyDays = Math.floor((completionDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const targetDailyMinutes = Math.ceil(remainingMinutes / studyDays);

      await connection.query<ResultSetHeader>(`
        UPDATE courses
        SET is_target_course = 0,
            target_start_date = NULL,
            target_completion_date = NULL,
            target_daily_minutes = NULL,
            target_set_at = NULL
        WHERE is_target_course = 1
      `);

      await connection.query<ResultSetHeader>(`
        UPDATE courses
        SET is_target_course = 1,
            target_start_date = ?,
            target_completion_date = ?,
            target_daily_minutes = ?,
            target_set_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE course_id = ?
      `, [target_start_date, target_completion_date, targetDailyMinutes, courseId]);

      return NextResponse.json({
        success: true,
        course_id: courseId,
        course_title: course.course_title,
        target_start_date,
        target_completion_date,
        remaining_minutes: remainingMinutes,
        study_days: studyDays,
        target_daily_minutes: targetDailyMinutes,
        message: '목표 강의가 설정되었습니다.',
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
