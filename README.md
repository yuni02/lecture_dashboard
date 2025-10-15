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
web_dashboard/
├── backend/
│   ├── main.py              # FastAPI 서버
│   └── requirements.txt     # Python 패키지
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
- ✅ REST API 구조
- ✅ 모던 UI/UX 디자인
- ✅ 반응형 레이아웃

## 스크린샷

대시보드는 다음 정보를 보여줍니다:
- 수강중인 강의 수
- 평균 진도율
- 총 수강시간 (일/시간/분)
- 남은 학습시간
- 학습 완료 예상 일수 (다양한 시간대별)
- 강의 카드 (진도율 바, 시간 통계)
- 강의 상세 모달 (커리큘럼 전체)

## 문제 해결

### 서버가 시작되지 않음
- `pip install -r requirements.txt`로 패키지 재설치
- Python 버전 확인 (3.8 이상)

### 데이터가 표시되지 않음
- MySQL 연결 정보 확인
- 브라우저 개발자 도구(F12) > Network 탭에서 API 응답 확인

### CORS 에러
- 백엔드의 CORS 설정이 이미 `allow_origins=["*"]`로 되어 있음
- 브라우저 캐시 삭제 후 재시도

## 향후 개선 사항

- [ ] 차트 라이브러리 추가 (Chart.js)
- [ ] 다크모드 지원
- [ ] 강의 필터링/검색 기능
- [ ] 데이터 자동 새로고침
- [ ] 학습 목표 설정 기능
