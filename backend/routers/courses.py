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
            if course.get('created_at'):
                course['created_at'] = course['created_at'].isoformat()
            if course.get('updated_at'):
                course['updated_at'] = course['updated_at'].isoformat()

        # 각 강의의 lectures 정보 및 시간 계산
        if courses:
            course_ids = [str(course['course_id']) for course in courses]

            # lectures 상세 정보 조회
            lectures_query = """
                SELECT
                    course_id,
                    section_title,
                    lecture_title,
                    lecture_time,
                    is_completed
                FROM lectures
                WHERE course_id IN ({})
                ORDER BY course_id, sort_order
            """.format(','.join(course_ids))

            cursor.execute(lectures_query)
            all_lectures = cursor.fetchall()

            # course_id별로 lectures 그룹화 및 시간 계산
            lectures_by_course = {}
            time_stats_by_course = {}

            for lecture in all_lectures:
                course_id = lecture['course_id']

                # lectures 리스트 그룹화
                if course_id not in lectures_by_course:
                    lectures_by_course[course_id] = []
                lectures_by_course[course_id].append({
                    'section_title': lecture['section_title'],
                    'lecture_title': lecture['lecture_title']
                })

                # 시간 통계 계산
                if course_id not in time_stats_by_course:
                    time_stats_by_course[course_id] = {
                        'total_lecture_time': 0,
                        'study_time': 0,
                        'completed_count': 0,
                        'total_count': 0
                    }

                lecture_time = float(lecture['lecture_time']) if lecture.get('lecture_time') else 0
                time_stats_by_course[course_id]['total_lecture_time'] += lecture_time
                time_stats_by_course[course_id]['total_count'] += 1

                if lecture.get('is_completed'):
                    time_stats_by_course[course_id]['study_time'] += lecture_time
                    time_stats_by_course[course_id]['completed_count'] += 1

            # 각 강의에 lectures 및 계산된 시간 정보 추가
            for course in courses:
                course_id = course['course_id']
                course['lectures'] = lectures_by_course.get(course_id, [])

                stats = time_stats_by_course.get(course_id, {
                    'total_lecture_time': 0,
                    'study_time': 0,
                    'completed_count': 0,
                    'total_count': 0
                })

                course['total_lecture_time'] = stats['total_lecture_time']
                course['study_time'] = stats['study_time']
                course['remaining_time'] = stats['total_lecture_time'] - stats['study_time']

                # 진척률 계산
                if stats['total_count'] > 0:
                    course['progress_rate'] = round((stats['completed_count'] / stats['total_count']) * 100, 2)
                else:
                    course['progress_rate'] = 0

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

        # 시간 통계 계산
        total_lecture_time = 0
        study_time = 0
        completed_count = 0
        total_count = len(lectures)

        # Decimal 변환 및 시간 계산
        for lecture in lectures:
            if lecture.get('lecture_time'):
                lecture_time = float(lecture['lecture_time'])
                lecture['lecture_time'] = lecture_time
                total_lecture_time += lecture_time

                if lecture.get('is_completed'):
                    study_time += lecture_time
                    completed_count += 1

        course['lectures'] = lectures
        course['total_lecture_time'] = total_lecture_time
        course['study_time'] = study_time
        course['remaining_time'] = total_lecture_time - study_time

        # 진척률 계산
        if total_count > 0:
            course['progress_rate'] = round((completed_count / total_count) * 100, 2)
        else:
            course['progress_rate'] = 0

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
