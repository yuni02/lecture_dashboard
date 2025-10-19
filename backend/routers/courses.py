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


class TargetCourseUpdate(BaseModel):
    """목표 강의 설정 요청"""
    target_start_date: str  # YYYY-MM-DD 형식
    target_completion_date: str  # YYYY-MM-DD 형식


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


@router.get("/target")
async def get_target_course(db = Depends(get_db)) -> Dict[str, Any]:
    """현재 목표 강의 조회"""
    try:
        cursor = db.cursor()

        query = """
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
        """

        cursor.execute(query)
        target_course = cursor.fetchone()

        if not target_course:
            cursor.close()
            return {"has_target": False, "target_course": None}

        course_id = target_course['course_id']

        # lectures 테이블에서 시간 계산
        lectures_query = """
            SELECT
                lecture_time,
                is_completed
            FROM lectures
            WHERE course_id = %s
        """
        cursor.execute(lectures_query, (course_id,))
        lectures = cursor.fetchall()

        total_lecture_time = 0
        study_time = 0
        completed_count = 0
        total_count = len(lectures)

        for lecture in lectures:
            lecture_time = float(lecture.get('lecture_time') or 0)
            total_lecture_time += lecture_time
            if lecture.get('is_completed'):
                study_time += lecture_time
                completed_count += 1

        # 진도율 계산
        progress_rate = round((completed_count / total_count * 100) if total_count > 0 else 0, 1)

        # 남은 시간 계산
        remaining_time = total_lecture_time - study_time

        # 데이터 추가
        target_course['study_time'] = study_time
        target_course['total_lecture_time'] = total_lecture_time
        target_course['remaining_time'] = remaining_time
        target_course['progress_rate'] = progress_rate

        # Date 변환
        if target_course.get('target_start_date'):
            target_course['target_start_date'] = target_course['target_start_date'].isoformat()
        if target_course.get('target_completion_date'):
            target_course['target_completion_date'] = target_course['target_completion_date'].isoformat()
        if target_course.get('target_set_at'):
            target_course['target_set_at'] = target_course['target_set_at'].isoformat()

        cursor.close()

        return {"has_target": True, "target_course": target_course}

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
                chapter_number,
                chapter_title,
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


@router.post("/{course_id}/set-target")
async def set_target_course(
    course_id: int,
    data: TargetCourseUpdate,
    db = Depends(get_db)
) -> Dict[str, Any]:
    """목표 강의 설정 (기존 목표는 자동 해제)"""
    try:
        from datetime import datetime, timedelta

        cursor = db.cursor()

        # 강의 존재 확인
        check_query = """
            SELECT
                course_id,
                course_title
            FROM courses
            WHERE course_id = %s
        """
        cursor.execute(check_query, (course_id,))
        course = cursor.fetchone()

        if not course:
            cursor.close()
            raise HTTPException(status_code=404, detail="Course not found")

        # lectures 테이블에서 시간 계산
        lectures_query = """
            SELECT
                lecture_time,
                is_completed
            FROM lectures
            WHERE course_id = %s
        """
        cursor.execute(lectures_query, (course_id,))
        lectures = cursor.fetchall()

        total_time = 0
        studied_time = 0

        for lecture in lectures:
            lecture_time = float(lecture.get('lecture_time') or 0)
            total_time += lecture_time
            if lecture.get('is_completed'):
                studied_time += lecture_time

        remaining_minutes = total_time - studied_time

        # 날짜 파싱 및 유효성 검사
        try:
            start_date = datetime.strptime(data.target_start_date, '%Y-%m-%d').date()
            completion_date = datetime.strptime(data.target_completion_date, '%Y-%m-%d').date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

        if completion_date <= start_date:
            raise HTTPException(status_code=400, detail="Completion date must be after start date")

        if remaining_minutes <= 0:
            raise HTTPException(status_code=400, detail="This course is already completed")

        # 학습 기간 계산 (일 단위)
        study_days = (completion_date - start_date).days + 1

        # 일일 목표 학습 시간 계산 (분 단위, 올림)
        import math
        target_daily_minutes = math.ceil(remaining_minutes / study_days)

        # 기존 목표 강의 해제
        clear_query = """
            UPDATE courses
            SET is_target_course = 0,
                target_start_date = NULL,
                target_completion_date = NULL,
                target_daily_minutes = NULL,
                target_set_at = NULL
            WHERE is_target_course = 1
        """
        cursor.execute(clear_query)

        # 새로운 목표 강의 설정
        set_query = """
            UPDATE courses
            SET is_target_course = 1,
                target_start_date = %s,
                target_completion_date = %s,
                target_daily_minutes = %s,
                target_set_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE course_id = %s
        """
        cursor.execute(set_query, (data.target_start_date, data.target_completion_date, target_daily_minutes, course_id))
        db.commit()

        cursor.close()

        return {
            "success": True,
            "course_id": course_id,
            "course_title": course.get('course_title'),
            "target_start_date": data.target_start_date,
            "target_completion_date": data.target_completion_date,
            "remaining_minutes": remaining_minutes,
            "study_days": study_days,
            "target_daily_minutes": target_daily_minutes,
            "message": "목표 강의가 설정되었습니다."
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.delete("/{course_id}/clear-target")
async def clear_target_course(
    course_id: int,
    db = Depends(get_db)
) -> Dict[str, Any]:
    """목표 강의 해제"""
    try:
        cursor = db.cursor()

        # 강의가 목표 강의인지 확인
        check_query = "SELECT course_id, course_title FROM courses WHERE course_id = %s AND is_target_course = 1"
        cursor.execute(check_query, (course_id,))
        course = cursor.fetchone()

        if not course:
            cursor.close()
            raise HTTPException(status_code=404, detail="This course is not set as target")

        # 목표 해제
        clear_query = """
            UPDATE courses
            SET is_target_course = 0,
                target_start_date = NULL,
                target_completion_date = NULL,
                target_daily_minutes = NULL,
                target_set_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE course_id = %s
        """
        cursor.execute(clear_query, (course_id,))
        db.commit()

        cursor.close()

        return {
            "success": True,
            "course_id": course_id,
            "course_title": course.get('course_title'),
            "message": "목표 강의가 해제되었습니다."
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
