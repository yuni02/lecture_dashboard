-- courses 테이블에 수동 크롤링 완료 컬럼 추가
ALTER TABLE courses
ADD COLUMN is_manually_completed TINYINT(1) DEFAULT 0 COMMENT '수동으로 크롤링 완료 처리 여부 (1: 완료, 크롤링 제외)';

-- 인덱스 추가 (크롤링 시 빠른 조회를 위해)
CREATE INDEX idx_manually_completed ON courses (is_manually_completed);

-- 확인
SHOW COLUMNS FROM courses LIKE 'is_manually_completed';
