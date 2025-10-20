# FastCampus Lecture Dashboard

강의 진도 관리 대시보드 - Next.js 풀스택 애플리케이션

## 기술 스택

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Frontend**: React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MySQL
- **ORM**: mysql2

## 주요 기능

- 📊 강의 진도 대시보드
- 📚 강의 목록 관리
- 📈 진척률 통계
- 🎯 완강 목표 설정 및 추적
- 🔍 강의/강의 내용 검색
- 👁️ 대시보드 표시/숨김 토글
- ✅ 강의별 완료 체크 (일괄 저장)

## 프로젝트 구조

```
lecture_dashboard/
├── app/
│   ├── api/              # API Routes (백엔드)
│   │   ├── courses/      # 강의 관련 API
│   │   ├── lectures/     # 강의 완료 상태 업데이트 API
│   │   ├── stats/        # 통계 API
│   │   └── health/       # 헬스체크
│   ├── courses/          # 강의 목록 페이지
│   ├── progress/         # 진척률 통계 페이지
│   ├── target/           # 완강 목표 페이지
│   ├── layout.tsx        # 공통 레이아웃
│   └── page.tsx          # 대시보드 페이지
├── components/           # React 컴포넌트
│   ├── Navbar.tsx        # 공통 네비게이션
│   ├── Loading.tsx       # 로딩 컴포넌트
│   └── CourseDetailModal.tsx  # 강의 상세 모달
├── lib/                  # 유틸리티 (DB 연결 등)
├── types/                # TypeScript 타입 정의
└── .env.local           # 환경 변수
```

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 데이터베이스 정보를 입력하세요:

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=crawler
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### 4. 프로덕션 빌드

```bash
npm run build
npm start
```

## API 엔드포인트

### Courses API

- `GET /api/courses` - 모든 강의 목록 조회
- `GET /api/courses/:id` - 특정 강의 상세 정보 조회
- `GET /api/courses/target` - 목표 강의 조회
- `PATCH /api/courses/:id/manually-completed` - 수동 완료 상태 변경
- `PATCH /api/courses/:id/visibility` - 대시보드 표시/숨김 토글
- `POST /api/courses/:id/set-target` - 목표 강의 설정
- `DELETE /api/courses/:id/clear-target` - 목표 강의 해제

### Lectures API

- `PATCH /api/lectures/:id` - 강의 완료 상태 업데이트

### Stats API

- `GET /api/stats/summary` - 전체 통계 요약
- `GET /api/stats/completion` - 완료 예상 시간
- `GET /api/stats/progress/daily` - 일별 진척률
- `GET /api/stats/progress/weekly` - 주별 진척률
- `GET /api/stats/progress/course/:id` - 강의별 진척률 이력

## 페이지

- `/` - 대시보드 (통계 요약 및 강의 목록)
- `/courses` - 강의 목록 (표시/숨김 토글 기능)
- `/progress` - 진척률 통계
- `/target` - 완강 목표 관리

## 데이터베이스 스키마

프로젝트는 다음 테이블을 사용합니다:

- `courses` - 강의 정보
  - `is_visible_on_dashboard` - 대시보드 표시 여부 (boolean)
- `lectures` - 강의 목차 및 진도 정보
  - `is_completed` - 완료 여부 (boolean)
  - `completed_at` - 완료 시간 (timestamp)

## 마이그레이션 히스토리

### v2.0.0: FastAPI + HTML/JS → Next.js 풀스택 마이그레이션
- **Backend**: FastAPI (Python) → Next.js API Routes (TypeScript)
- **Frontend**: HTML/Vanilla JS → React + TypeScript
- **스타일링**: 기존 CSS → Tailwind CSS
- **이점**: 단일 프레임워크로 통합하여 개발 및 배포 간소화

### v1.0.0: FastAPI + Vanilla JS (레거시)
- Backend: FastAPI, Python 3.8+
- Frontend: HTML5, CSS3, Vanilla JavaScript
- Database: MySQL 8.0
- Server: Uvicorn (ASGI)
- 배포: Docker / GitHub Actions

## 특징

- ✅ TypeScript로 타입 안정성 확보
- ✅ Server Components와 Client Components 분리
- ✅ API Routes를 통한 RESTful API 구현
- ✅ Tailwind CSS를 활용한 모던 UI/UX
- ✅ 반응형 레이아웃 (모바일/태블릿/데스크톱)
- ✅ MySQL 연결 풀링을 통한 효율적인 DB 관리
- ✅ 강의 상세 모달에서 일괄 완료 처리
- ✅ 디버깅을 위한 콘솔 로그 추가

## License

Private
