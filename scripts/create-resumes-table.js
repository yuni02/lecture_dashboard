const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function createResumesTable() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'crawler',
  });

  try {
    console.log('데이터베이스에 연결 중...');

    const sql = `
      CREATE TABLE IF NOT EXISTS resumes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(10) NOT NULL,
        file_size INT NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_uploaded_at (uploaded_at DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await connection.execute(sql);
    console.log('✅ resumes 테이블이 성공적으로 생성되었습니다.');
  } catch (error) {
    console.error('❌ 테이블 생성 중 오류 발생:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

createResumesTable().catch(console.error);
