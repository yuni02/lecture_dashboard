import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import crypto from 'crypto';

interface AdminAuthRow extends RowDataPacket {
  password_hash: string;
  salt: string;
}

/**
 * 비밀번호를 해시화하는 함수
 */
export function hashPassword(password: string, salt: string): string {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

/**
 * 관리자 비밀번호를 검증하는 함수
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    const connection = await pool.getConnection();

    try {
      const [rows] = await connection.query<AdminAuthRow[]>(
        'SELECT password_hash, salt FROM admin_auth ORDER BY id DESC LIMIT 1'
      );

      if (rows.length === 0) {
        console.error('No admin password configured');
        return false;
      }

      const { password_hash, salt } = rows[0];
      const inputHash = hashPassword(password, salt);

      return inputHash === password_hash;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}
/**
 * Request에서 Authorization 헤더를 확인하는 함수
 */
export async function verifyAuthHeader(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const password = authHeader.substring(7); // 'Bearer ' 제거
  return await verifyAdminPassword(password);
}

/**
 * 새로운 관리자 비밀번호를 설정하는 함수 (처음 설정 또는 변경시 사용)
 */
export async function updateAdminPassword(newPassword: string): Promise<void> {
  const connection = await pool.getConnection();

  try {
    // 랜덤 salt 생성
    const salt = crypto.randomBytes(32).toString('hex');
    const passwordHash = hashPassword(newPassword, salt);

    // 기존 비밀번호 삭제
    await connection.query('DELETE FROM admin_auth');

    // 새 비밀번호 삽입
    await connection.query(
      'INSERT INTO admin_auth (password_hash, salt) VALUES (?, ?)',
      [passwordHash, salt]
    );
  } finally {
    connection.release();
  }
}
