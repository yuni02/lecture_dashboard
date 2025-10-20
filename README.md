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

## 프로젝트 구조

```
lecture_dashboard/
├── app/
│   ├── api/              # API Routes (백엔드)
│   │   ├── courses/      # 강의 관련 API
│   │   ├── stats/        # 통계 API
│   │   └── health/       # 헬스체크
│   ├── courses/          # 강의 목록 페이지
│   ├── progress/         # 진척률 통계 페이지
│   ├── target/           # 완강 목표 페이지
│   ├── layout.tsx        # 공통 레이아웃
│   └── page.tsx          # 대시보드 페이지
├── components/           # React 컴포넌트
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
- `POST /api/courses/:id/set-target` - 목표 강의 설정
- `DELETE /api/courses/:id/clear-target` - 목표 강의 해제

### Stats API

- `GET /api/stats/summary` - 전체 통계 요약
- `GET /api/stats/completion` - 완료 예상 시간
- `GET /api/stats/progress/daily` - 일별 진척률
- `GET /api/stats/progress/weekly` - 주별 진척률
- `GET /api/stats/progress/course/:id` - 강의별 진척률 이력

## 페이지

- `/` - 대시보드 (통계 요약 및 강의 목록)
- `/courses` - 강의 목록
- `/progress` - 진척률 통계
- `/target` - 완강 목표 관리

## 데이터베이스 스키마

프로젝트는 다음 테이블을 사용합니다:

- `courses` - 강의 정보
- `lectures` - 강의 목차 및 진도 정보

## 마이그레이션 히스토리

v2.0.0: FastAPI + HTML/JS → Next.js 풀스택으로 마이그레이션
- 백엔드: FastAPI (Python) → Next.js API Routes (TypeScript)
- 프론트엔드: HTML/Vanilla JS → React + TypeScript
- 단일 프레임워크로 통합하여 개발 및 배포 간소화

## License

Private
