"""
Courses API Router
강의 관련 API 엔드포인트
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from database import get_db

router = APIRouter(
    prefix="/api/courses",
    tags=["courses"]
)


@router.get("")
async def get_courses(db = Depends(get_db)) -> List[Dict[str, Any]]:
    """모든 강의 목록 조회"""
    try:
        cursor = db.cursor()

        query = """
            SELECT
                course_id,
                course_title,
                progress_rate,
                study_time,
                total_lecture_time,
                url,
                created_at,
                updated_at
            FROM courses
            ORDER BY updated_at DESC
        """

        cursor.execute(query)
        courses = cursor.fetchall()

        # Decimal/datetime을 JSON 직렬화 가능한 형태로 변환
        for course in courses:
            if course.get('study_time'):
                course['study_time'] = float(course['study_time'])
            if course.get('total_lecture_time'):
                course['total_lecture_time'] = float(course['total_lecture_time'])
            if course.get('progress_rate'):
                course['progress_rate'] = float(course['progress_rate'])
            if course.get('created_at'):
                course['created_at'] = course['created_at'].isoformat()
            if course.get('updated_at'):
                course['updated_at'] = course['updated_at'].isoformat()

        cursor.close()

        return courses

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/{course_id}")
async def get_course(course_id: int, db = Depends(get_db)) -> Dict[str, Any]:
    """특정 강의 상세 정보 조회"""
    try:
        cursor = db.cursor()

        # 강의 기본 정보
        course_query = """
            SELECT
                course_id,
                course_title,
                progress_rate,
                study_time,
                total_lecture_time,
                url,
                created_at,
                updated_at
            FROM courses
            WHERE course_id = %s
        """

        cursor.execute(course_query, (course_id,))
        course = cursor.fetchone()

        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        # Decimal/datetime 변환
        if course.get('study_time'):
            course['study_time'] = float(course['study_time'])
        if course.get('total_lecture_time'):
            course['total_lecture_time'] = float(course['total_lecture_time'])
        if course.get('progress_rate'):
            course['progress_rate'] = float(course['progress_rate'])
        if course.get('created_at'):
            course['created_at'] = course['created_at'].isoformat()
        if course.get('updated_at'):
            course['updated_at'] = course['updated_at'].isoformat()

        # 강의 목차 정보
        lectures_query = """
            SELECT
                section_number,
                section_title,
                lecture_number,
                lecture_title,
                lecture_time,
                is_completed,
                sort_order
            FROM lectures
            WHERE course_id = %s
            ORDER BY sort_order
        """

        cursor.execute(lectures_query, (course_id,))
        lectures = cursor.fetchall()

        # Decimal 변환
        for lecture in lectures:
            if lecture.get('lecture_time'):
                lecture['lecture_time'] = float(lecture['lecture_time'])

        course['lectures'] = lectures

        cursor.close()

        return course

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
