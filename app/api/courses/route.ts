import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { Course } from '@/types';
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
          created_at,
          updated_at,
          is_manually_completed,
          is_visible_on_dashboard
        FROM courses
        ORDER BY updated_at DESC
      `);

      if (courses.length > 0) {
        const courseIds = courses.map(c => c.course_id);

        const [lectures] = await connection.query<RowDataPacket[]>(`
          SELECT
            course_id,
            section_title,
            lecture_title,
            lecture_time,
            is_completed
          FROM lectures
          WHERE course_id IN (?)
          ORDER BY course_id, sort_order
        `, [courseIds]);

        const lecturesByCourse: Record<number, any[]> = {};
        const timeStatsByCourse: Record<number, any> = {};

        lectures.forEach((lecture: any) => {
          const courseId = lecture.course_id;

          if (!lecturesByCourse[courseId]) {
            lecturesByCourse[courseId] = [];
          }
          lecturesByCourse[courseId].push({
            section_title: lecture.section_title,
            lecture_title: lecture.lecture_title,
          });

          if (!timeStatsByCourse[courseId]) {
            timeStatsByCourse[courseId] = {
              total_lecture_time: 0,
              study_time: 0,
              completed_count: 0,
              total_count: 0,
            };
          }

          const lectureTime = parseFloat(lecture.lecture_time || 0);
          timeStatsByCourse[courseId].total_lecture_time += lectureTime;
          timeStatsByCourse[courseId].total_count += 1;

          if (lecture.is_completed) {
            timeStatsByCourse[courseId].study_time += lectureTime;
            timeStatsByCourse[courseId].completed_count += 1;
          }
        });

        const result: Course[] = courses.map((course: any) => {
          const courseId = course.course_id;
          const stats = timeStatsByCourse[courseId] || {
            total_lecture_time: 0,
            study_time: 0,
            completed_count: 0,
            total_count: 0,
          };

          const progressRate = stats.total_count > 0
            ? Math.round((stats.completed_count / stats.total_count) * 100 * 100) / 100
            : 0;

          return {
            course_id: courseId,
            course_title: course.course_title,
            url: course.url,
            created_at: course.created_at?.toISOString(),
            updated_at: course.updated_at?.toISOString(),
            is_manually_completed: Boolean(course.is_manually_completed),
            is_visible_on_dashboard: Boolean(course.is_visible_on_dashboard),
            lectures: lecturesByCourse[courseId] || [],
            total_lecture_time: stats.total_lecture_time,
            study_time: stats.study_time,
            remaining_time: stats.total_lecture_time - stats.study_time,
            progress_rate: progressRate,
          };
        });

        return NextResponse.json(result);
      }

      return NextResponse.json([]);
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
