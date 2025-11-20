import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { unlink } from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [rows] = await pool.query(
      'SELECT * FROM resumes WHERE id = ?',
      [id]
    );

    const resumes = rows as any[];
    if (resumes.length === 0) {
      return NextResponse.json(
        { error: '파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json(resumes[0]);
  } catch (error) {
    console.error('이력서 조회 에러:', error);
    return NextResponse.json(
      { error: '이력서를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 파일 정보 조회
    const [rows] = await pool.query(
      'SELECT * FROM resumes WHERE id = ?',
      [id]
    );

    const resumes = rows as any[];
    if (resumes.length === 0) {
      return NextResponse.json(
        { error: '파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const resume = resumes[0];

    // 파일 삭제
    try {
      const filePath = path.join(process.cwd(), 'public', resume.file_path);
      await unlink(filePath);
    } catch (fileError) {
      console.error('파일 삭제 에러:', fileError);
    }

    // DB에서 삭제
    await pool.query('DELETE FROM resumes WHERE id = ?', [id]);

    return NextResponse.json({ message: '파일이 삭제되었습니다.' });
  } catch (error) {
    console.error('이력서 삭제 에러:', error);
    return NextResponse.json(
      { error: '파일 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
