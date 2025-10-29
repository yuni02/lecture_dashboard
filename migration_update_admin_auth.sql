-- admin_auth 테이블 구조 확인 및 컬럼 추가
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'admin_auth'
  AND COLUMN_NAME = 'hide_completed_lectures';

SET @query = IF(@col_exists = 0,
  'ALTER TABLE admin_auth ADD COLUMN hide_completed_lectures BOOLEAN DEFAULT FALSE COMMENT ''완료된 강의 숨기기 설정''',
  'SELECT ''Column already exists'' AS message');

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 기존 레코드가 없으면 초기 비밀번호 삽입
INSERT INTO admin_auth (password_hash, salt, hide_completed_lectures)
SELECT
  SHA2(CONCAT('admin123', 'random_salt_12345'), 256),
  'random_salt_12345',
  FALSE
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM admin_auth LIMIT 1);
