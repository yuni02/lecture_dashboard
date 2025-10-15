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
