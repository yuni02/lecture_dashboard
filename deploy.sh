#!/bin/bash
# 배포 스크립트 - 로컬에서 실행

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
echo "Lecture Dashboard 배포 시작"
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
  backend/ frontend/ .env.example .env.dev README.md

echo "✅ 압축 완료: lecture_dashboard.tar.gz"

# 2. 서버로 파일 전송
echo ""
echo "📤 서버로 파일 전송 중..."
scp -P $SERVER_PORT lecture_dashboard.tar.gz $SERVER_USER@$SERVER_HOST:~/

# 3. 서버에서 배포 명령 실행
echo ""
echo "🚀 서버에서 배포 실행 중..."
ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST << 'ENDSSH'
  set -e

  # 배포 디렉토리 생성
  mkdir -p ~/lecture_dashboard
  cd ~/lecture_dashboard

  # 압축 해제
  tar -xzf ~/lecture_dashboard.tar.gz
  rm ~/lecture_dashboard.tar.gz

  # Python 가상환경 생성
  if [ ! -d "venv" ]; then
    echo "🐍 Python 가상환경 생성 중..."
    python3 -m venv venv
  fi

  # 가상환경 활성화 및 패키지 설치
  source venv/bin/activate
  echo "📦 Python 패키지 설치 중..."
  pip install --upgrade pip
  pip install -r backend/requirements.txt

  # 기존 프로세스 종료
  echo "🔄 기존 프로세스 확인 중..."
  pkill -f "uvicorn main:app" || true

  # 애플리케이션 시작
  echo "🚀 애플리케이션 시작 중..."
  cd ~/lecture_dashboard/backend
  nohup ../venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 > ../app.log 2>&1 &

  echo "✅ 배포 완료!"
  echo "📝 로그 확인: tail -f ~/lecture_dashboard/app.log"
  echo "🌐 접속 주소: http://codeninjax.gonetis.com:8000"
ENDSSH

# 4. 로컬 압축 파일 삭제
rm lecture_dashboard.tar.gz

echo ""
echo "========================================="
echo "✅ 배포가 완료되었습니다!"
echo "========================================="
echo "🌐 접속 주소: http://codeninjax.gonetis.com:8000"
echo "📝 로그 확인: ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST 'tail -f ~/lecture_dashboard/app.log'"
