'use client';

import { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import mammoth from 'mammoth';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// PDF.js worker 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface ResumeViewerProps {
  resumeId: number;
  fileType: string;
  onClose: () => void;
}

export default function ResumeViewer({ resumeId, fileType, onClose }: ResumeViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [docxContent, setDocxContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const fileUrl = `/api/resumes/file/${resumeId}`;

  useEffect(() => {
    const loadDocx = async () => {
      try {
        setLoading(true);
        const response = await fetch(fileUrl);
        const arrayBuffer = await response.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setDocxContent(result.value);
      } catch (error) {
        console.error('DOCX 로딩 에러:', error);
        setDocxContent('<p>문서를 로드하는 중 오류가 발생했습니다.</p>');
      } finally {
        setLoading(false);
      }
    };

    if (fileType === 'docx') {
      loadDocx();
    }
  }, [fileUrl, fileType]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setLoadingProgress(100);
  };

  const onDocumentLoadProgress = ({ loaded, total }: { loaded: number; total: number }) => {
    if (total > 0) {
      setLoadingProgress(Math.round((loaded / total) * 100));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">
            {fileType === 'pdf' ? 'PDF 뷰어' : 'DOCX 뷰어'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-auto p-4">
          {loading && (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <div className="text-gray-500">
                {fileType === 'pdf' ? 'PDF' : 'DOCX'} 로딩 중... {loadingProgress}%
              </div>
            </div>
          )}

          {fileType === 'pdf' && (
            <div className="flex flex-col items-center">
              <Document
                file={fileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadProgress={onDocumentLoadProgress}
                loading={
                  <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <div className="text-gray-500">PDF 파일 준비 중...</div>
                  </div>
                }
                error={
                  <div className="flex items-center justify-center h-64">
                    <div className="text-red-600">PDF를 로드하는 중 오류가 발생했습니다.</div>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  width={Math.min(window.innerWidth * 0.8, 800)}
                  loading={
                    <div className="flex items-center justify-center h-96">
                      <div className="text-gray-500">페이지 렌더링 중...</div>
                    </div>
                  }
                />
              </Document>
            </div>
          )}

          {fileType === 'docx' && !loading && (
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: docxContent }}
            />
          )}
        </div>

        {/* 페이지 네비게이션 (PDF만) */}
        {fileType === 'pdf' && numPages > 0 && (
          <div className="flex items-center justify-center gap-4 p-4 border-t">
            <button
              onClick={() => setPageNumber(page => Math.max(1, page - 1))}
              disabled={pageNumber <= 1}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <span className="text-sm">
              {pageNumber} / {numPages}
            </span>
            <button
              onClick={() => setPageNumber(page => Math.min(numPages, page + 1))}
              disabled={pageNumber >= numPages}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        )}

        {/* 하단 버튼 */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <a
            href={fileUrl}
            download
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            다운로드
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
