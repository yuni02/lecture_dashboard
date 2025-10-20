import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { TargetCourse } from '@/types';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    const connection = await pool.getConnection();

    try {
      const [courses] = await connection.query<RowDataPacket[]>(`
        SELECT
          course_id,
          course_title,
          url,
          target_start_date,
          target_completion_date,
          target_daily_minutes,
          target_set_at
        FROM courses
        WHERE is_target_course = 1
        LIMIT 1
      `);

      if (courses.length === 0) {
        return NextResponse.json({ has_target: false, target_course: null });
      }

      const targetCourse = courses[0];
      const courseId = targetCourse.course_id;

      const [lectures] = await connection.query<RowDataPacket[]>(`
        SELECT
          lecture_time,
          is_completed
        FROM lectures
        WHERE course_id = ?
      `, [courseId]);

      let totalLectureTime = 0;
      let studyTime = 0;
      let completedCount = 0;
      const totalCount = lectures.length;

      lectures.forEach((lecture: any) => {
        const lectureTime = parseFloat(lecture.lecture_time || 0);
        totalLectureTime += lectureTime;
        if (lecture.is_completed) {
          studyTime += lectureTime;
          completedCount += 1;
        }
      });

      const progressRate = totalCount > 0
        ? Math.round((completedCount / totalCount) * 100 * 10) / 10
        : 0;

      const remainingTime = totalLectureTime - studyTime;

      const result: TargetCourse = {
        course_id: courseId,
        course_title: targetCourse.course_title,
        url: targetCourse.url,
        target_start_date: targetCourse.target_start_date?.toISOString().split('T')[0] || '',
        target_completion_date: targetCourse.target_completion_date?.toISOString().split('T')[0] || '',
        target_daily_minutes: targetCourse.target_daily_minutes,
        target_set_at: targetCourse.target_set_at?.toISOString() || '',
        study_time: studyTime,
        total_lecture_time: totalLectureTime,
        remaining_time: remainingTime,
        progress_rate: progressRate,
        created_at: '',
        updated_at: '',
        is_manually_completed: false,
      };

      return NextResponse.json({ has_target: true, target_course: result });
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
