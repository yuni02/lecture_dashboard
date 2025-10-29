# 관리자 인증 설정 가이드

## 개요

강의 정보 업데이트 시 권한이 없는 사용자의 접근을 막기 위해 비밀번호 인증 시스템을 구현했습니다.

## 설치 방법

### 1. 데이터베이스 테이블 생성

MySQL 데이터베이스에 관리자 인증용 테이블을 생성합니다:

```bash
mysql -u [사용자명] -p [데이터베이스명] < migration_add_admin_auth.sql
```

또는 MySQL 클라이언트에서 직접 실행:

```sql
-- migration_add_admin_auth.sql 파일의 내용을 복사하여 실행
```

### 2. 기본 비밀번호

초기 설정된 비밀번호는 `admin123` 입니다.

**⚠️ 보안 주의사항: 반드시 프로덕션 환경에서는 비밀번호를 변경하세요!**

## 비밀번호 변경 방법

### 방법 1: SQL 직접 실행

```sql
-- 새로운 salt 생성 및 비밀번호 설정
DELETE FROM admin_auth;

INSERT INTO admin_auth (password_hash, salt)
VALUES (
  SHA2(CONCAT('새비밀번호', '랜덤솔트문자열'), 256),
  '랜덤솔트문자열'
);
```

### 방법 2: Node.js 스크립트 사용 (권장)

프로젝트에 비밀번호 변경 스크립트를 추가할 수 있습니다:

```javascript
// scripts/update-password.js
import { updateAdminPassword } from '../lib/auth';

const newPassword = process.argv[2];

if (!newPassword) {
  console.error('사용법: node scripts/update-password.js <새비밀번호>');
  process.exit(1);
}

updateAdminPassword(newPassword)
  .then(() => {
    console.log('비밀번호가 성공적으로 변경되었습니다.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('비밀번호 변경 실패:', error);
    process.exit(1);
  });
```

## API 사용 방법

### 인증이 필요한 API 엔드포인트

다음 API들은 모두 `Authorization` 헤더에 비밀번호가 필요합니다:

1. **강의 완료 상태 변경**: `PATCH /api/lectures/[id]`
2. **코스 수동 완료 설정**: `PATCH /api/courses/[id]/manually-completed`
3. **코스 대시보드 표시 여부**: `PATCH /api/courses/[id]/visibility`

### 요청 예시

#### curl 사용

```bash
curl -X PATCH http://localhost:3000/api/lectures/123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin123" \
  -d '{"is_completed": true}'
```

#### JavaScript fetch 사용

```javascript
const response = await fetch('/api/lectures/123', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer admin123'
  },
  body: JSON.stringify({ is_completed: true })
});

if (response.status === 401) {
  alert('비밀번호가 올바르지 않습니다.');
} else if (response.ok) {
  console.log('업데이트 성공!');
}
```

#### Python requests 사용

```python
import requests

response = requests.patch(
    'http://localhost:3000/api/lectures/123',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin123'
    },
    json={'is_completed': True}
)

if response.status_code == 401:
    print('비밀번호가 올바르지 않습니다.')
elif response.status_code == 200:
    print('업데이트 성공!')
```

## 인증 오류 처리

### 401 Unauthorized 응답

비밀번호가 없거나 잘못된 경우:

```json
{
  "error": "Unauthorized - Invalid or missing password"
}
```

### 해결 방법

1. `Authorization` 헤더가 포함되어 있는지 확인
2. `Bearer ` 접두사 뒤에 올바른 비밀번호가 있는지 확인
3. 데이터베이스의 `admin_auth` 테이블에 비밀번호가 설정되어 있는지 확인

## 보안 권장사항

1. **비밀번호 강도**: 최소 12자 이상, 영문 대소문자, 숫자, 특수문자 혼합
2. **HTTPS 사용**: 프로덕션 환경에서는 반드시 HTTPS를 사용하여 비밀번호 전송
3. **정기적 변경**: 비밀번호를 정기적으로 변경
4. **환경 변수**: 비밀번호를 코드에 하드코딩하지 말고 환경 변수로 관리
5. **접근 제한**: 데이터베이스 접근 권한을 최소한으로 제한

## 문제 해결

### 데이터베이스 연결 오류

```
Error verifying password: ...
```

- `.env.local` 파일의 MySQL 설정을 확인하세요
- 데이터베이스 서버가 실행 중인지 확인하세요

### 테이블이 존재하지 않음

```
Table 'crawler.admin_auth' doesn't exist
```

- `migration_add_admin_auth.sql` 파일을 실행했는지 확인하세요

### 비밀번호가 작동하지 않음

- SQL을 통해 직접 확인:
  ```sql
  SELECT * FROM admin_auth;
  ```
- 레코드가 없거나 손상된 경우 마이그레이션 파일을 다시 실행하세요
