-- 관리자 인증용 테이블 생성
CREATE TABLE IF NOT EXISTS admin_auth (
  id INT PRIMARY KEY AUTO_INCREMENT,
  password_hash VARCHAR(255) NOT NULL,
  salt VARCHAR(255) NOT NULL,
  hide_completed_lectures BOOLEAN DEFAULT FALSE COMMENT '완료된 강의 숨기기 설정',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 초기 비밀번호 설정 (비밀번호: admin123, 실제 사용시 변경 필요)
-- salt: random_salt_12345
-- password_hash: SHA256(admin123 + random_salt_12345)
INSERT INTO admin_auth (password_hash, salt, hide_completed_lectures)
VALUES (
  SHA2(CONCAT('admin123', 'random_salt_12345'), 256),
  'random_salt_12345',
  FALSE
);
