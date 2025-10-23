import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { Course } from '@/types';
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
      const [courses] = await connection.query<RowDataPacket[]>(`
        SELECT
          course_id,
          course_title,
          url,
          created_at,
          updated_at,
          is_manually_completed
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
        SELECT
          lecture_id,
          course_id,
          section_number,
          section_title,
          chapter_number,
          chapter_title,
          lecture_number,
          lecture_title,
          lecture_time,
          is_completed,
          sort_order
        FROM lectures
        WHERE course_id = ?
        ORDER BY sort_order
      `, [courseId]);

      let totalLectureTime = 0;
      let studyTime = 0;
      let completedCount = 0;
      const totalCount = lectures.length;

      const lectureList = lectures.map((lecture: RowDataPacket) => {
        const lectureTime = parseFloat((lecture.lecture_time as string) || '0');
        totalLectureTime += lectureTime;

        if (lecture.is_completed) {
          studyTime += lectureTime;
          completedCount += 1;
        }

        return {
          lecture_id: lecture.lecture_id as number,
          course_id: lecture.course_id as number,
          section_number: lecture.section_number as number,
          section_title: lecture.section_title as string,
          chapter_number: lecture.chapter_number as number,
          chapter_title: lecture.chapter_title as string,
          lecture_number: lecture.lecture_number as number,
          lecture_title: lecture.lecture_title as string,
          lecture_time: lectureTime,
          is_completed: Boolean(lecture.is_completed),
          sort_order: lecture.sort_order as number,
        };
      });

      const progressRate = totalCount > 0
        ? Math.round((completedCount / totalCount) * 100 * 100) / 100
        : 0;

      const result: Course = {
        course_id: courseId,
        course_title: course.course_title,
        url: course.url,
        created_at: course.created_at?.toISOString(),
        updated_at: course.updated_at?.toISOString(),
        is_manually_completed: Boolean(course.is_manually_completed),
        lectures: lectureList,
        total_lecture_time: totalLectureTime,
        study_time: studyTime,
        remaining_time: totalLectureTime - studyTime,
        progress_rate: progressRate,
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
