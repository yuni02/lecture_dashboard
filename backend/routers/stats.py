"""
Statistics API Router
통계 관련 API 엔드포인트
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from database import get_db

router = APIRouter(
    prefix="/api/stats",
    tags=["statistics"]
)


@router.get("/summary")
async def get_summary_stats(db = Depends(get_db)) -> Dict[str, Any]:
    """전체 통계 요약"""
    try:
        cursor = db.cursor()

        query = """
            SELECT
                COUNT(*) as total_courses,
                ROUND(AVG(progress_rate), 2) as avg_progress,
                SUM(study_time) as total_study_time,
                SUM(total_lecture_time) as total_lecture_time,
                SUM(total_lecture_time - study_time) as remaining_time
            FROM courses
        """

        cursor.execute(query)
        stats = cursor.fetchone()

        # Decimal 변환
        if stats.get('total_study_time'):
            stats['total_study_time'] = float(stats['total_study_time'])
        if stats.get('total_lecture_time'):
            stats['total_lecture_time'] = float(stats['total_lecture_time'])
        if stats.get('remaining_time'):
            stats['remaining_time'] = float(stats['remaining_time'])
        if stats.get('avg_progress'):
            stats['avg_progress'] = float(stats['avg_progress'])

        cursor.close()

        return stats

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/completion")
async def get_completion_estimate(db = Depends(get_db)) -> Dict[str, Any]:
    """완료 예상 시간 계산 (하루 3시간 기준)"""
    try:
        cursor = db.cursor()

        query = """
            SELECT
                SUM(total_lecture_time - study_time) as remaining_minutes,
                CEILING(SUM(total_lecture_time - study_time) / 180) as days_needed_3h
            FROM courses
        """

        cursor.execute(query)
        result = cursor.fetchone()

        if result.get('remaining_minutes'):
            result['remaining_minutes'] = float(result['remaining_minutes'])

            # 다양한 학습 속도로 계산
            remaining = result['remaining_minutes']
            result['days_1h_per_day'] = int((remaining / 60) + 0.5)
            result['days_2h_per_day'] = int((remaining / 120) + 0.5)
            result['days_3h_per_day'] = int((remaining / 180) + 0.5)
            result['days_5h_per_day'] = int((remaining / 300) + 0.5)

        cursor.close()

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/progress/daily")
async def get_daily_progress(db = Depends(get_db)):
    """일별 진척률 통계"""
    try:
        cursor = db.cursor()

        query = """
            SELECT
                DATE(completed_at) as date,
                COUNT(*) as completed_lectures,
                SUM(lecture_time) as study_time_minutes
            FROM lectures
            WHERE is_completed = 1
            AND completed_at IS NOT NULL
            AND completed_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY DATE(completed_at)
            ORDER BY date DESC
        """

        cursor.execute(query)
        results = cursor.fetchall()

        # Decimal 및 datetime 변환
        daily_data = []
        for row in results:
            daily_data.append({
                'date': row['date'].strftime('%Y-%m-%d') if row.get('date') else None,
                'completed_lectures': row.get('completed_lectures', 0),
                'study_time_minutes': float(row['study_time_minutes']) if row.get('study_time_minutes') else 0
            })

        cursor.close()
        return {'daily_progress': daily_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/progress/weekly")
async def get_weekly_progress(db = Depends(get_db)):
    """주별 진척률 통계"""
    try:
        cursor = db.cursor()

        query = """
            SELECT
                YEARWEEK(completed_at, 1) as year_week,
                DATE(DATE_SUB(completed_at, INTERVAL WEEKDAY(completed_at) DAY)) as week_start,
                COUNT(*) as completed_lectures,
                SUM(lecture_time) as study_time_minutes
            FROM lectures
            WHERE is_completed = 1
            AND completed_at IS NOT NULL
            AND completed_at >= DATE_SUB(CURDATE(), INTERVAL 12 WEEK)
            GROUP BY YEARWEEK(completed_at, 1), week_start
            ORDER BY year_week DESC
        """

        cursor.execute(query)
        results = cursor.fetchall()

        # 데이터 변환
        weekly_data = []
        for row in results:
            weekly_data.append({
                'year_week': row.get('year_week'),
                'week_start': row['week_start'].strftime('%Y-%m-%d') if row.get('week_start') else None,
                'completed_lectures': row.get('completed_lectures', 0),
                'study_time_minutes': float(row['study_time_minutes']) if row.get('study_time_minutes') else 0
            })

        cursor.close()
        return {'weekly_progress': weekly_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/progress/course/{course_id}")
async def get_course_progress_history(course_id: int, db = Depends(get_db)):
    """특정 강의의 진척률 이력"""
    try:
        cursor = db.cursor()

        # 강의별 일별 진척
        query = """
            SELECT
                DATE(completed_at) as date,
                COUNT(*) as completed_lectures,
                SUM(lecture_time) as study_time_minutes,
                (SELECT COUNT(*) FROM lectures WHERE course_id = %s AND is_completed = 1 AND DATE(completed_at) <= DATE(l.completed_at)) as cumulative_completed
            FROM lectures l
            WHERE course_id = %s
            AND is_completed = 1
            AND completed_at IS NOT NULL
            GROUP BY DATE(completed_at)
            ORDER BY date ASC
        """

        cursor.execute(query, (course_id, course_id))
        results = cursor.fetchall()

        # 데이터 변환
        progress_data = []
        for row in results:
            progress_data.append({
                'date': row['date'].strftime('%Y-%m-%d') if row.get('date') else None,
                'completed_lectures': row.get('completed_lectures', 0),
                'study_time_minutes': float(row['study_time_minutes']) if row.get('study_time_minutes') else 0,
                'cumulative_completed': row.get('cumulative_completed', 0)
            })

        cursor.close()
        return {'course_id': course_id, 'progress_history': progress_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
