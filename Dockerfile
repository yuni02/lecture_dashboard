# FastCampus Lecture Dashboard - Dockerfile
FROM python:3.11-slim

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 패키지 업데이트 및 필수 도구 설치
RUN apt-get update && apt-get install -y \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 파일 복사 및 설치
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY .env.example .env.dev ./

# 작업 디렉토리를 backend로 변경
WORKDIR /app/backend

# 포트 노출
EXPOSE 8000

# 환경 변수 기본값 설정
ENV ENVIRONMENT=dev

# 애플리케이션 실행
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
