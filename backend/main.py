"""
FastCampus Dashboard - FastAPI Backend
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import pymysql
from typing import List, Dict, Any
import os
import sys
from datetime import datetime

# credentials.py 로드
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
credentials_path = os.path.join(project_root, 'credentials.py')

MYSQL_HOST = 'localhost'
MYSQL_PORT = 3306
MYSQL_USER = 'root'
MYSQL_PASSWORD = ''
MYSQL_DATABASE = 'crawler'

if os.path.exists(credentials_path):
    with open(credentials_path, 'r', encoding='utf-8') as f:
        exec_globals = {}
        exec(f.read(), exec_globals)
        MYSQL_HOST = exec_globals.get('MYSQL_HOST', MYSQL_HOST)
        MYSQL_PORT = exec_globals.get('MYSQL_PORT', MYSQL_PORT)
        MYSQL_USER = exec_globals.get('MYSQL_USER', MYSQL_USER)
        MYSQL_PASSWORD = exec_globals.get('MYSQL_PASSWORD', MYSQL_PASSWORD)
        MYSQL_DATABASE = exec_globals.get('MYSQL_DATABASE', MYSQL_DATABASE)

app = FastAPI(title="FastCampus Dashboard API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    """MySQL 데이터베이스 연결"""
    return pymysql.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DATABASE,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

@app.get("/")
async def root():
    """루트 경로 - 프론트엔드 HTML 반환"""
    frontend_path = os.path.join(os.path.dirname(__file__), '../frontend/index.html')
    return FileResponse(frontend_path)

@app.get("/api/health")
async def health_check():
    """헬스 체크"""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.get("/api/courses")
async def get_courses() -> List[Dict[str, Any]]:
    """모든 강의 목록 조회"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

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
        conn.close()

        return courses

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/courses/{course_id}")
async def get_course(course_id: int) -> Dict[str, Any]:
    """특정 강의 상세 정보 조회"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

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
        conn.close()

        return course

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/stats/summary")
async def get_summary_stats() -> Dict[str, Any]:
    """전체 통계 요약"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

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
        conn.close()

        return stats

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/stats/completion")
async def get_completion_estimate() -> Dict[str, Any]:
    """완료 예상 시간 계산 (하루 3시간 기준)"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

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
        conn.close()

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Static files (CSS, JS)
app.mount("/static", StaticFiles(directory=os.path.join(os.path.dirname(__file__), '../frontend')), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
