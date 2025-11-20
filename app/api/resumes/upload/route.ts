import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: '파일이 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    const fileType = file.type;
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        { error: 'PDF 또는 DOCX 파일만 업로드할 수 있습니다.' },
        { status: 400 }
      );
    }

    // 파일 크기 제한 (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '파일 크기는 10MB를 초과할 수 없습니다.' },
        { status: 400 }
      );
    }

    // uploads 디렉토리 생성
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'resumes');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // 파일명 생성 (타임스탬프 + 원본 파일명)
    const timestamp = Date.now();
    const originalName = file.name;
    const fileExtension = path.extname(originalName);
    const fileName = `${timestamp}_${originalName}`;
    const filePath = path.join(uploadsDir, fileName);

    // 파일 저장
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // DB에 저장
    const fileTypeExt = fileExtension.toLowerCase().replace('.', '');
    const relativePath = `/uploads/resumes/${fileName}`;

    const [result] = await pool.query(
      'INSERT INTO resumes (file_name, original_name, file_type, file_size, file_path) VALUES (?, ?, ?, ?, ?)',
      [fileName, originalName, fileTypeExt, file.size, relativePath]
    );

    return NextResponse.json({
      message: '파일이 성공적으로 업로드되었습니다.',
      file: {
        id: (result as any).insertId,
        fileName,
        originalName,
        fileType: fileTypeExt,
        fileSize: file.size,
        filePath: relativePath,
      },
    });
  } catch (error) {
    console.error('파일 업로드 에러:', error);
    return NextResponse.json(
      { error: '파일 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
