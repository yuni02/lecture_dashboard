'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Loading from '@/components/Loading';

// ResumeViewer를 클라이언트에서만 로드 (react-pdf는 브라우저 전용)
const ResumeViewer = dynamic(() => import('@/components/ResumeViewer'), {
  ssr: false,
  loading: () => <Loading />,
});

interface Resume {
  id: number;
  file_name: string;
  original_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  uploaded_at: string;
}

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const res = await fetch('/api/resumes');
      const data = await res.json();
      setResumes(data);
    } catch (error) {
      console.error('이력서 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 타입 검증
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('PDF 또는 DOCX 파일만 업로드할 수 있습니다.');
      return;
    }

    // 파일 크기 검증 (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('파일 크기는 10MB를 초과할 수 없습니다.');
      return;
    }

    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/resumes/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '업로드 실패');
      }

      alert('파일이 성공적으로 업로드되었습니다.');
      await fetchResumes();

      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('파일 업로드 에러:', error);
      alert(error instanceof Error ? error.message : '파일 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number, originalName: string) => {
    if (!confirm(`"${originalName}" 파일을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/resumes/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('삭제 실패');
      }

      alert('파일이 삭제되었습니다.');
      await fetchResumes();
    } catch (error) {
      console.error('파일 삭제 에러:', error);
      alert('파일 삭제에 실패했습니다.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR');
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800">이력서 관리</h1>

        {/* 파일 업로드 버튼 */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer ${
              uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {uploading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                업로드 중...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                파일 업로드
              </>
            )}
          </label>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          PDF 또는 DOCX 파일을 업로드할 수 있습니다. (최대 10MB)
        </p>
      </div>

      {/* 이력서 목록 */}
      {resumes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">업로드된 이력서가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {resumes.map((resume) => (
            <div
              key={resume.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {resume.original_name}
                    </h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        resume.file_type === 'pdf'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {resume.file_type.toUpperCase()}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <p>파일 크기: {formatFileSize(resume.file_size)}</p>
                    <p>업로드 일시: {formatDate(resume.uploaded_at)}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedResume(resume)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                  >
                    보기
                  </button>
                  <a
                    href={resume.file_path}
                    download={resume.original_name}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                  >
                    다운로드
                  </a>
                  <button
                    onClick={() => handleDelete(resume.id, resume.original_name)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 파일 뷰어 모달 */}
      {selectedResume && (
        <ResumeViewer
          filePath={selectedResume.file_path}
          fileType={selectedResume.file_type}
          onClose={() => setSelectedResume(null)}
        />
      )}
    </div>
  );
}
