#!/bin/bash
# Docker 배포 스크립트 - 로컬에서 실행

set -e

# 서버 설정 파일 로드
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/server-config.sh" ]; then
    source "$SCRIPT_DIR/server-config.sh"
else
    echo "❌ server-config.sh 파일이 없습니다."
    echo "server-config.example.sh를 복사하여 server-config.sh를 생성하고 서버 정보를 입력하세요."
    echo ""
    echo "  cp server-config.example.sh server-config.sh"
    echo "  # server-config.sh 파일을 편집하여 실제 서버 정보 입력"
    exit 1
fi

echo "========================================="
echo "Lecture Dashboard Docker 배포 시작"
echo "========================================="

# 1. 프로젝트 파일 압축
echo "📦 프로젝트 파일 압축 중..."
tar -czf lecture_dashboard.tar.gz \
  --exclude='venv' \
  --exclude='.git' \
  --exclude='__pycache__' \
  --exclude='.idea' \
  --exclude='.claude' \
  --exclude='*.pyc' \
  --exclude='.env.local' \
  --exclude='deploy.sh' \
  backend/ frontend/ .env.example .env.dev Dockerfile docker-compose.yml .dockerignore

echo "✅ 압축 완료: lecture_dashboard.tar.gz"

# 2. 서버로 파일 전송
echo ""
echo "📤 서버로 파일 전송 중..."
scp -P $SERVER_PORT lecture_dashboard.tar.gz $SERVER_USER@$SERVER_HOST:~/

# 3. 서버에서 Docker 배포 실행
echo ""
echo "🚀 서버에서 Docker 배포 실행 중..."
ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST << 'ENDSSH'
  set -e

  # 배포 디렉토리 생성
  mkdir -p ~/lecture_dashboard
  cd ~/lecture_dashboard

  # 압축 해제
  tar -xzf ~/lecture_dashboard.tar.gz
  rm ~/lecture_dashboard.tar.gz

  # Docker 설치 확인
  if ! command -v docker &> /dev/null; then
    echo "❌ Docker가 설치되어 있지 않습니다."
    echo "Docker 설치 가이드: https://docs.docker.com/engine/install/"
    exit 1
  fi

  if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose가 설치되어 있지 않습니다."
    exit 1
  fi

  # 기존 컨테이너 중지 및 제거
  echo "🔄 기존 컨테이너 중지 중..."
  docker-compose down 2>/dev/null || docker compose down 2>/dev/null || true

  # Docker 이미지 빌드 및 컨테이너 시작
  echo "🐳 Docker 이미지 빌드 및 컨테이너 시작 중..."
  if command -v docker-compose &> /dev/null; then
    docker-compose up -d --build
  else
    docker compose up -d --build
  fi

  # 컨테이너 상태 확인
  echo ""
  echo "📊 컨테이너 상태:"
  if command -v docker-compose &> /dev/null; then
    docker-compose ps
  else
    docker compose ps
  fi

  echo ""
  echo "✅ 배포 완료!"
  echo "📝 로그 확인: docker logs -f lecture_dashboard"
  echo "🌐 접속 주소: http://codeninjax.gonetis.com:8000"
ENDSSH

# 4. 로컬 압축 파일 삭제
rm lecture_dashboard.tar.gz

echo ""
echo "========================================="
echo "✅ Docker 배포가 완료되었습니다!"
echo "========================================="
echo "🌐 접속 주소: http://codeninjax.gonetis.com:8000"
echo ""
echo "유용한 명령어:"
echo "  로그 확인: ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST 'docker logs -f lecture_dashboard'"
echo "  컨테이너 재시작: ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST 'cd ~/lecture_dashboard && docker-compose restart'"
echo "  컨테이너 중지: ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST 'cd ~/lecture_dashboard && docker-compose down'"
