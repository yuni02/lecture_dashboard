import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import pool from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // DB에서 파일 정보 조회
    const [rows] = await pool.query(
      'SELECT file_name, original_name, file_type, file_path FROM resumes WHERE id = ?',
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
    const filePath = path.join(process.cwd(), 'public', resume.file_path);

    // 파일 읽기
    const fileBuffer = await readFile(filePath);

    // Content-Type 설정
    const contentType = resume.file_type === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    // 파일 반환
    return new Response(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(resume.original_name)}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('파일 조회 에러:', error);
    return NextResponse.json(
      { error: '파일을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
