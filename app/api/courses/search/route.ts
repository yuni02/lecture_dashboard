import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { Course } from '@/types';
import { RowDataPacket } from 'mysql2';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length === 0) {
      return NextResponse.json([]);
    }

    const searchTerm = `%${query.trim()}%`;
    const connection = await pool.getConnection();

    try {
      // 1. course_title로 검색
      const [courseResults] = await connection.query<RowDataPacket[]>(`
        SELECT DISTINCT
          c.course_id,
          c.course_title,
          c.url,
          c.created_at,
          c.updated_at,
          c.is_manually_completed,
          c.is_visible_on_dashboard,
          c.priority,
          c.category_depth1,
          c.category_depth2,
          c.category_depth3,
          'course' as match_type
        FROM courses c
        WHERE c.course_title LIKE ?
      `, [searchTerm]);

      // 2. lecture_title로 검색하여 해당 course 찾기
      const [lectureResults] = await connection.query<RowDataPacket[]>(`
        SELECT DISTINCT
          c.course_id,
          c.course_title,
          c.url,
          c.created_at,
          c.updated_at,
          c.is_manually_completed,
          c.is_visible_on_dashboard,
          c.priority,
          c.category_depth1,
          c.category_depth2,
          c.category_depth3,
          'lecture' as match_type,
          GROUP_CONCAT(DISTINCT l.lecture_title SEPARATOR '|||') as matched_lectures
        FROM courses c
        INNER JOIN lectures l ON c.course_id = l.course_id
        WHERE l.lecture_title LIKE ?
        GROUP BY c.course_id
      `, [searchTerm]);

      // 중복 제거를 위해 course_id 기준으로 합치기
      const courseMap = new Map<number, any>();

      // course_title 매치 결과 추가
      courseResults.forEach((course: RowDataPacket) => {
        courseMap.set(course.course_id as number, {
          ...course,
          matched_lectures: [],
        });
      });

      // lecture_title 매치 결과 추가 (course가 이미 있으면 lecture 정보만 추가)
      lectureResults.forEach((course: RowDataPacket) => {
        const courseId = course.course_id as number;
        const matchedLectures = course.matched_lectures
          ? (course.matched_lectures as string).split('|||').filter(Boolean)
          : [];

        if (courseMap.has(courseId)) {
          // 이미 course_title로 매치된 경우, lecture 정보만 추가
          const existing = courseMap.get(courseId);
          existing.matched_lectures = matchedLectures;
          existing.match_type = 'both'; // course와 lecture 모두 매치
        } else {
          // lecture로만 매치된 경우
          courseMap.set(courseId, {
            ...course,
            matched_lectures: matchedLectures,
          });
        }
      });

      // 각 강의의 lectures와 통계 정보 가져오기
      const courseIds = Array.from(courseMap.keys());

      if (courseIds.length > 0) {
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

        interface TimeStats {
          total_lecture_time: number;
          study_time: number;
          completed_count: number;
          total_count: number;
        }

        const lecturesByCourse: Record<number, any[]> = {};
        const timeStatsByCourse: Record<number, TimeStats> = {};

        lectures.forEach((lecture: RowDataPacket) => {
          const courseId = lecture.course_id as number;

          if (!lecturesByCourse[courseId]) {
            lecturesByCourse[courseId] = [];
          }
          lecturesByCourse[courseId].push({
            section_title: lecture.section_title as string,
            lecture_title: lecture.lecture_title as string,
            lecture_time: parseFloat((lecture.lecture_time as string) || '0'),
            is_completed: Boolean(lecture.is_completed),
          });

          if (!timeStatsByCourse[courseId]) {
            timeStatsByCourse[courseId] = {
              total_lecture_time: 0,
              study_time: 0,
              completed_count: 0,
              total_count: 0,
            };
          }

          const lectureTime = parseFloat((lecture.lecture_time as string) || '0');
          timeStatsByCourse[courseId].total_lecture_time += lectureTime;
          timeStatsByCourse[courseId].total_count += 1;

          if (lecture.is_completed) {
            timeStatsByCourse[courseId].study_time += lectureTime;
            timeStatsByCourse[courseId].completed_count += 1;
          }
        });

        const result: Course[] = Array.from(courseMap.values()).map((course: any) => {
          const courseId = course.course_id as number;
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
            course_title: course.course_title as string,
            url: course.url as string,
            created_at: (course.created_at as Date | undefined)?.toISOString(),
            updated_at: (course.updated_at as Date | undefined)?.toISOString(),
            is_manually_completed: Boolean(course.is_manually_completed),
            is_visible_on_dashboard: Boolean(course.is_visible_on_dashboard),
            lectures: lecturesByCourse[courseId] || [],
            total_lecture_time: stats.total_lecture_time,
            study_time: stats.study_time,
            remaining_time: stats.total_lecture_time - stats.study_time,
            progress_rate: progressRate,
            priority: course.priority as number | undefined,
            category_depth1: course.category_depth1 as string | undefined,
            category_depth2: course.category_depth2 as string | undefined,
            category_depth3: course.category_depth3 as string | undefined,
          };
        });

        return NextResponse.json(result);
      }

      return NextResponse.json([]);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search error', details: String(error) },
      { status: 500 }
    );
  }
}
