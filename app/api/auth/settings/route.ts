import { NextResponse } from 'next/server';
import { verifyAuthHeader } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface AdminAuthRow extends RowDataPacket {
  id: number;
  hide_completed_lectures: boolean;
}

// 설정 조회
export async function GET(request: Request) {
  // 인증 확인
  const isAuthenticated = await verifyAuthHeader(request);
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid or missing password' },
      { status: 401 }
    );
  }

  try {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query<AdminAuthRow[]>(
        'SELECT id, hide_completed_lectures FROM admin_auth ORDER BY id DESC LIMIT 1'
      );

      if (rows.length === 0) {
        return NextResponse.json(
          { error: 'No admin account found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        hide_completed_lectures: Boolean(rows[0].hide_completed_lectures),
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { error: 'Database error', details: String(error) },
      { status: 500 }
    );
  }
}

// 설정 업데이트
export async function PATCH(request: Request) {
  // 인증 확인
  const isAuthenticated = await verifyAuthHeader(request);
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid or missing password' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { hide_completed_lectures } = body;

    if (typeof hide_completed_lectures !== 'boolean') {
      return NextResponse.json(
        { error: 'hide_completed_lectures must be a boolean' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    try {
      // 가장 최근 admin_auth 레코드 업데이트
      await connection.query<ResultSetHeader>(
        'UPDATE admin_auth SET hide_completed_lectures = ? ORDER BY id DESC LIMIT 1',
        [hide_completed_lectures]
      );

      return NextResponse.json({
        success: true,
        hide_completed_lectures,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: 'Database error', details: String(error) },
      { status: 500 }
    );
  }
}
