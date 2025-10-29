import { NextResponse } from 'next/server';
import { verifyAdminPassword } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface AdminAuthRow extends RowDataPacket {
  id: number;
  hide_completed_lectures: boolean;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // 비밀번호 검증
    const isValid = await verifyAdminPassword(password);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // 사용자 설정 가져오기
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query<AdminAuthRow[]>(
        'SELECT id, hide_completed_lectures FROM admin_auth ORDER BY id DESC LIMIT 1'
      );

      if (rows.length === 0) {
        return NextResponse.json(
          { error: 'No admin account found' },
          { status: 500 }
        );
      }

      const adminSettings = rows[0];

      return NextResponse.json({
        success: true,
        message: 'Login successful',
        settings: {
          hide_completed_lectures: Boolean(adminSettings.hide_completed_lectures),
        },
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
