import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hours = parseInt(searchParams.get('hours') || '24'); // 기본 24시간

  try {
    const connection = await pool.getConnection();

    try {
      // 1. 최근 N시간 내 업데이트된 강의 조회 (이전 스냅샷과 비교)
      const [recentUpdates] = await connection.query<RowDataPacket[]>(`
        SELECT
          c.course_id,
          c.course_title,
          c.url,
          c.updated_at,
          c.progress_rate as current_progress,
          c.study_time as current_study_time,
          c.total_lecture_time,
          ps.progress_rate as previous_progress,
          ps.study_time as previous_study_time,
          ps.snapshot_date
        FROM courses c
        LEFT JOIN (
          SELECT
            course_id,
            progress_rate,
            study_time,
            snapshot_date,
            ROW_NUMBER() OVER (PARTITION BY course_id ORDER BY snapshot_date DESC) as rn
          FROM course_progress_snapshots
          WHERE snapshot_date < DATE(NOW())
        ) ps ON c.course_id = ps.course_id AND ps.rn = 1
        WHERE c.updated_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
        ORDER BY c.updated_at DESC
      `, [hours]);

      // 2. 크롤링 로그 조회 (최근 50개) - log_id로 정렬 (created_at 컬럼 없음)
      const [crawlLogs] = await connection.query<RowDataPacket[]>(`
        SELECT
          cl.log_id,
          cl.course_id,
          c.course_title,
          cl.crawl_status,
          cl.error_message
        FROM crawl_logs cl
        LEFT JOIN courses c ON cl.course_id = c.course_id
        ORDER BY cl.log_id DESC
        LIMIT 50
      `);

      // 3. 오늘 완료된 강의 목록 조회
      const [completedToday] = await connection.query<RowDataPacket[]>(`
        SELECT
          l.lecture_id,
          l.course_id,
          c.course_title,
          l.section_title,
          l.lecture_title,
          l.lecture_time,
          l.completed_at
        FROM lectures l
        JOIN courses c ON l.course_id = c.course_id
        WHERE l.completed_at >= DATE(NOW())
          AND l.is_completed = 1
        ORDER BY l.completed_at DESC
      `);

      // 4. 요약 통계
      const [stats] = await connection.query<RowDataPacket[]>(`
        SELECT
          COUNT(DISTINCT CASE WHEN updated_at >= DATE_SUB(NOW(), INTERVAL ? HOUR) THEN course_id END) as updated_courses,
          (SELECT COUNT(*) FROM crawl_logs) as crawl_count,
          (SELECT COUNT(*) FROM lectures WHERE completed_at >= DATE(NOW()) AND is_completed = 1) as completed_today
        FROM courses
      `, [hours]);

      // 변화 계산
      const updates = recentUpdates.map((row: RowDataPacket) => {
        const currentProgress = parseFloat(row.current_progress) || 0;
        const previousProgress = parseFloat(row.previous_progress) || 0;
        const progressChange = currentProgress - previousProgress;

        const currentStudyTime = parseFloat(row.current_study_time) || 0;
        const previousStudyTime = parseFloat(row.previous_study_time) || 0;
        const studyTimeChange = currentStudyTime - previousStudyTime;

        return {
          course_id: row.course_id,
          course_title: row.course_title,
          url: row.url,
          updated_at: row.updated_at,
          current_progress: currentProgress,
          previous_progress: previousProgress,
          progress_change: Math.round(progressChange * 100) / 100,
          current_study_time: currentStudyTime,
          previous_study_time: previousStudyTime,
          study_time_change: Math.round(studyTimeChange * 100) / 100,
          total_lecture_time: parseFloat(row.total_lecture_time) || 0,
          snapshot_date: row.snapshot_date,
        };
      });

      return NextResponse.json({
        summary: {
          updated_courses: stats[0]?.updated_courses || 0,
          crawl_count: stats[0]?.crawl_count || 0,
          completed_today: stats[0]?.completed_today || 0,
          period_hours: hours,
        },
        updates,
        crawl_logs: crawlLogs.map((log: RowDataPacket) => ({
          log_id: log.log_id,
          course_id: log.course_id,
          course_title: log.course_title,
          status: log.crawl_status,
          error_message: log.error_message,
        })),
        completed_today: completedToday.map((lecture: RowDataPacket) => ({
          lecture_id: lecture.lecture_id,
          course_id: lecture.course_id,
          course_title: lecture.course_title,
          section_title: lecture.section_title,
          lecture_title: lecture.lecture_title,
          lecture_time: parseFloat(lecture.lecture_time) || 0,
          completed_at: lecture.completed_at,
        })),
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
