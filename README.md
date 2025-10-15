# FastCampus 수강 현황 대시보드

FastAPI + Vanilla JavaScript로 구축된 FastCampus 강의 진도 추적 웹 대시보드

## 기능

- 📊 전체 수강 통계 (강의 수, 평균 진도율, 총 수강시간, 남은 시간)
- 📅 학습 완료 예상 시간 (하루 1/2/3/5시간 기준)
- 📖 강의 목록 카드 뷰
- 🔍 강의 상세 정보 모달 (커리큘럼 포함)
- 📱 반응형 디자인

## 프로젝트 구조

```
lecture_dashboard/
├── .env.example             # 환경 변수 템플릿
├── .env.local               # 로컬 환경 설정 (gitignore)
├── .env.dev                 # 개발 환경 설정 (gitignore)
├── Dockerfile               # Docker 이미지 빌드 설정
├── docker-compose.yml       # Docker Compose 설정
├── .dockerignore            # Docker 빌드 제외 파일
├── deploy-docker.sh         # Docker 자동 배포 스크립트
├── deploy.sh                # 일반 배포 스크립트
├── server-config.example.sh # 서버 설정 템플릿
├── server-config.sh         # 실제 서버 설정 (gitignore)
├── .github/
│   └── workflows/
│       └── deploy.yml       # GitHub Actions 자동 배포 워크플로우
├── backend/
│   ├── main.py              # FastAPI 메인 애플리케이션
│   ├── config.py            # 환경 설정 로더
│   ├── database.py          # DB 연결 관리
│   ├── requirements.txt     # Python 패키지
│   └── routers/             # API 라우터 모듈
│       ├── __init__.py
│       ├── courses.py       # 강의 관련 API
│       └── stats.py         # 통계 관련 API
└── frontend/
    ├── index.html           # 메인 페이지
    ├── style.css            # 스타일
    └── script.js            # JavaScript 로직
```

## 설치 방법

### 1. 패키지 설치

```bash
cd /Users/jennie/PycharmProjects/fastcampus-scrapping/web_dashboard/backend
pip install -r requirements.txt
```

### 2. 환경 설정

- MySQL 서버가 실행 중인지 확인
- `.env.local` 또는 `.env.dev` 파일에 MySQL 연결 정보 설정
- `courses`, `lectures` 테이블에 데이터가 있는지 확인

#### 환경 설정 파일

프로젝트는 환경별 설정 파일을 사용합니다:

- `.env.example` - 설정 템플릿 (참고용)
- `.env.local` - 로컬 개발 환경 설정
- `.env.dev` - 개발 서버 환경 설정

`.env.local` 파일을 생성하고 로컬 DB 정보를 입력하세요:

```bash
# .env.local
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=crawler
ENVIRONMENT=local
```

## 실행 방법

### 서버 시작

#### 로컬 환경에서 실행 (기본값)

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

기본적으로 `.env.local` 파일을 사용합니다.

#### 개발 서버 환경에서 실행

```bash
cd backend
ENVIRONMENT=dev uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

`.env.dev` 파일을 사용합니다.

#### Python으로 직접 실행

```bash
cd backend
python main.py  # 로컬 환경
ENVIRONMENT=dev python main.py  # 개발 환경
```

### 접속

브라우저에서 다음 URL로 접속:

```
http://localhost:8000
```

## API 엔드포인트

- `GET /` - 프론트엔드 HTML
- `GET /api/health` - 헬스 체크
- `GET /api/courses` - 모든 강의 목록
- `GET /api/courses/{course_id}` - 특정 강의 상세 정보
- `GET /api/stats/summary` - 전체 통계
- `GET /api/stats/completion` - 완료 예상 시간

## 개발 환경

- **Backend**: FastAPI, Python 3.8+
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Database**: MySQL 8.0
- **Server**: Uvicorn (ASGI)

## 특징

- ✅ Python 풀스택 (백엔드 FastAPI)
- ✅ 프론트엔드 프레임워크 불필요 (Vanilla JS)
- ✅ REST API 구조 (Router 기반 모듈화)
- ✅ 환경별 설정 관리 (.env)
- ✅ 의존성 주입을 통한 DB 연결 관리
- ✅ 모던 UI/UX 디자인
- ✅ 반응형 레이아웃

## 아키텍처 설명

### Backend 모듈 구조

**main.py** - FastAPI 애플리케이션의 진입점
- CORS 미들웨어 설정
- 라우터 등록
- 정적 파일 서빙

**config.py** - 환경 설정 관리
- 환경별 .env 파일 자동 로드
- DB 연결 정보 제공

**database.py** - DB 연결 관리
- 의존성 주입을 위한 `get_db()` 제너레이터
- 자동 연결 정리 (try-finally)

**routers/** - API 엔드포인트 모듈
- `courses.py`: 강의 목록, 강의 상세 조회
- `stats.py`: 통계 요약, 완료 예상 시간

### 새로운 API 추가 방법

1. `backend/routers/` 디렉토리에 새 파일 생성 (예: `users.py`)
2. APIRouter 생성 및 엔드포인트 정의
3. `main.py`에서 라우터 등록

```python
# backend/routers/users.py
from fastapi import APIRouter, Depends
from database import get_db

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("")
async def get_users(db = Depends(get_db)):
    # 구현
    pass
```

```python
# backend/main.py
from routers import courses, stats, users

app.include_router(users.router)
```

## 스크린샷

대시보드는 다음 정보를 보여줍니다:
- 수강중인 강의 수
- 평균 진도율
- 총 수강시간 (일/시간/분)
- 남은 학습시간
- 학습 완료 예상 일수 (다양한 시간대별)
- 강의 카드 (진도율 바, 시간 통계)
- 강의 상세 모달 (커리큘럼 전체)

## 리눅스 서버 배포

### 방법 1: GitHub Actions 자동 배포 (가장 권장 ⭐⭐⭐)

main 브랜치에 push하면 자동으로 서버에 배포됩니다.

#### 초기 설정 (최초 1회)

**1. SSH 키 생성 (로컬에서)**
```bash
# SSH 키페어 생성 (비밀번호 없이)
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_key -N ""

# 공개키를 서버에 등록
ssh-copy-id -i ~/.ssh/github_actions_key.pub -p 1122 jennie@codeninjax.gonetis.com
```

**2. GitHub Secrets 설정**

GitHub 저장소 → Settings → Secrets and variables → Actions → New repository secret

다음 4개의 Secret을 추가:

| Name | Value | 설명 |
|------|-------|------|
| `SSH_PRIVATE_KEY` | (개인키 내용) | `cat ~/.ssh/github_actions_key` 내용 전체 복사 |
| `SERVER_HOST` | `codeninjax.gonetis.com` | 서버 호스트 |
| `SERVER_PORT` | `1122` | SSH 포트 |
| `SERVER_USER` | `jennie` | SSH 사용자명 |

**3. 서버에 Docker 설치 (최초 1회)**
```bash
ssh -p 1122 jennie@codeninjax.gonetis.com

# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Docker Compose 설치
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

#### 자동 배포 사용

이제 코드를 수정하고 push하면 자동으로 배포됩니다:

```bash
git add .
git commit -m "Update application"
git push origin main
```

GitHub Actions 탭에서 배포 진행 상황을 확인할 수 있습니다.

#### 수동 배포 트리거

GitHub 저장소 → Actions → Deploy to Server → Run workflow

### 방법 2: 로컬에서 수동 배포

#### 사전 준비: 서버 설정

배포 스크립트를 사용하기 전에 서버 정보를 설정해야 합니다:

```bash
# 1. 서버 설정 파일 생성
cp server-config.example.sh server-config.sh

# 2. server-config.sh 파일을 편집하여 실제 서버 정보 입력
# SERVER_HOST, SERVER_PORT, SERVER_USER 등을 수정
```

**server-config.sh 예시:**
```bash
SERVER_HOST="your-server.com"
SERVER_PORT="22"
SERVER_USER="your-username"
REMOTE_DIR="/home/your-username/lecture_dashboard"
```

⚠️ **중요**: `server-config.sh` 파일은 `.gitignore`에 포함되어 GitHub에 푸시되지 않습니다.

#### Docker 배포 (권장)

**자동 배포**
프로젝트 루트에서 Docker 배포 스크립트를 실행하세요:

```bash
./deploy-docker.sh
```

이 스크립트는:
1. 프로젝트 파일을 압축
2. 서버로 파일 전송 (scp)
3. Docker 이미지 빌드
4. 컨테이너 자동 시작

**수동 Docker 배포**

프로젝트 파일 업로드:
```bash
# 로컬에서 실행
scp -P 1122 -r backend/ frontend/ .env.dev Dockerfile docker-compose.yml .dockerignore jennie@codeninjax.gonetis.com:~/lecture_dashboard/
```

Docker 컨테이너 실행:
```bash
# 서버에서 실행
cd ~/lecture_dashboard
docker compose up -d --build
```

#### Docker 관리 명령어

```bash
# 로그 확인
docker logs -f lecture_dashboard

# 컨테이너 상태 확인
docker ps

# 컨테이너 재시작
cd ~/lecture_dashboard
docker compose restart

# 컨테이너 중지
docker compose down

# 컨테이너 재빌드 및 시작
docker compose up -d --build

# 이미지 정리 (공간 확보)
docker system prune -a
```

#### 일반 배포 (Python 가상환경)

프로젝트 루트에서 배포 스크립트를 실행하세요:

```bash
./deploy.sh
```

이 스크립트는:
1. 프로젝트 파일을 압축
2. 서버로 파일 전송 (scp)
3. 서버에서 자동으로 설치 및 실행

### 수동 배포

#### 1. 서버 접속
```bash
ssh -p 1122 jennie@codeninjax.gonetis.com
```

#### 2. 프로젝트 디렉토리 생성 및 파일 업로드
```bash
# 로컬에서 실행
scp -P 1122 -r backend/ frontend/ .env.dev jennie@codeninjax.gonetis.com:~/lecture_dashboard/
```

#### 3. 서버에서 설정
```bash
# 서버에 접속 후
cd ~/lecture_dashboard

# Python 가상환경 생성
python3 -m venv venv
source venv/bin/activate

# 패키지 설치
pip install -r backend/requirements.txt

# 애플리케이션 실행 (백그라운드)
cd backend
nohup ../venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 > ../app.log 2>&1 &
```

#### 4. 접속 확인
```
http://codeninjax.gonetis.com:8000
```

### Systemd 서비스로 등록 (선택사항)

서버 재시작 시 자동 실행을 원한다면:

```bash
# 서비스 파일 복사
sudo cp lecture_dashboard.service /etc/systemd/system/

# 서비스 활성화 및 시작
sudo systemctl daemon-reload
sudo systemctl enable lecture_dashboard
sudo systemctl start lecture_dashboard

# 상태 확인
sudo systemctl status lecture_dashboard

# 로그 확인
sudo journalctl -u lecture_dashboard -f
```

### 배포 후 관리

#### 로그 확인
```bash
tail -f ~/lecture_dashboard/app.log
```

#### 애플리케이션 재시작
```bash
# 프로세스 종료
pkill -f "uvicorn main:app"

# 재시작
cd ~/lecture_dashboard/backend
nohup ../venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 > ../app.log 2>&1 &
```

#### 서비스 사용 시
```bash
sudo systemctl restart lecture_dashboard
sudo systemctl stop lecture_dashboard
sudo systemctl status lecture_dashboard
```

## 문제 해결

### 서버가 시작되지 않음
- `pip install -r requirements.txt`로 패키지 재설치
- Python 버전 확인 (3.8 이상)
- 로그 확인: `tail -f ~/lecture_dashboard/app.log`

### 데이터가 표시되지 않음
- MySQL 연결 정보 확인 (.env.dev)
- 서버 방화벽에서 8000 포트 오픈 확인
- Docker 사용 시: 컨테이너가 DB에 접근 가능한지 확인
- 브라우저 개발자 도구(F12) > Network 탭에서 API 응답 확인

### Docker 관련 문제

**컨테이너가 시작되지 않음:**
```bash
# 로그 확인
docker logs lecture_dashboard

# 컨테이너 상세 정보
docker inspect lecture_dashboard
```

**DB 연결 실패:**
- `.env.dev`의 `MYSQL_HOST`를 확인
- Docker 네트워크 내부에서는 `localhost` 대신 호스트 IP 또는 `host.docker.internal` 사용
- 서버의 MySQL이 외부 연결을 허용하는지 확인 (`bind-address` 설정)

### CORS 에러
- 백엔드의 CORS 설정이 이미 `allow_origins=["*"]`로 되어 있음
- 브라우저 캐시 삭제 후 재시도

### 포트가 이미 사용 중
```bash
# 8000 포트를 사용하는 프로세스 찾기
lsof -i :8000
# 또는
netstat -tlnp | grep 8000

# 프로세스 종료
kill -9 <PID>
```

## 향후 개선 사항

- [ ] 차트 라이브러리 추가 (Chart.js)
- [ ] 다크모드 지원
- [ ] 강의 필터링/검색 기능
- [ ] 데이터 자동 새로고침
- [ ] 학습 목표 설정 기능
