"""
Courses API Router
강의 관련 API 엔드포인트
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from pydantic import BaseModel
from database import get_db

router = APIRouter(
    prefix="/api/courses",
    tags=["courses"]
)


class ManuallyCompletedUpdate(BaseModel):
    """수동 완료 상태 업데이트 요청"""
    is_manually_completed: bool


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
                updated_at,
                is_manually_completed
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

        # 각 강의의 lectures 정보 추가
        lectures_query = """
            SELECT
                course_id,
                section_title,
                lecture_title
            FROM lectures
            WHERE course_id IN ({})
            ORDER BY course_id, sort_order
        """

        if courses:
            course_ids = [str(course['course_id']) for course in courses]
            cursor.execute(lectures_query.format(','.join(course_ids)))
            all_lectures = cursor.fetchall()

            # course_id별로 lectures 그룹화
            lectures_by_course = {}
            for lecture in all_lectures:
                course_id = lecture['course_id']
                if course_id not in lectures_by_course:
                    lectures_by_course[course_id] = []
                lectures_by_course[course_id].append(lecture)

            # 각 강의에 lectures 추가
            for course in courses:
                course['lectures'] = lectures_by_course.get(course['course_id'], [])

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
                updated_at,
                is_manually_completed
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


@router.patch("/{course_id}/manually-completed")
async def update_manually_completed(
    course_id: int,
    data: ManuallyCompletedUpdate,
    db = Depends(get_db)
) -> Dict[str, Any]:
    """강의의 수동 완료 상태 업데이트"""
    try:
        cursor = db.cursor()

        # 강의 존재 확인
        check_query = "SELECT course_id FROM courses WHERE course_id = %s"
        cursor.execute(check_query, (course_id,))
        if not cursor.fetchone():
            cursor.close()
            raise HTTPException(status_code=404, detail="Course not found")

        # 수동 완료 상태 업데이트
        update_query = """
            UPDATE courses
            SET is_manually_completed = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE course_id = %s
        """

        cursor.execute(update_query, (data.is_manually_completed, course_id))
        db.commit()

        cursor.close()

        return {
            "success": True,
            "course_id": course_id,
            "is_manually_completed": data.is_manually_completed,
            "message": f"강의 크롤링 {'제외' if data.is_manually_completed else '포함'} 처리되었습니다."
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
