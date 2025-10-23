'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Course, Lecture } from '@/types';

interface CourseDetailModalProps {
  courseId: number;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function CourseDetailModal({ courseId, onClose, onUpdate }: CourseDetailModalProps) {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changedLectures, setChangedLectures] = useState<Set<number>>(new Set());
  const [localCompletionStates, setLocalCompletionStates] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState<string>('');

  const fetchCourseDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${courseId}`);
      const data = await res.json();

      // 디버깅: API 응답 데이터 확인
      console.log('=== Course Detail Data ===');
      console.log('Course ID:', data.course_id);
      console.log('Course Title:', data.course_title);
      console.log('Total Lectures:', data.lectures?.length);
      console.log('Progress Rate:', data.progress_rate);
      console.log('Full Data:', data);

      setCourse(data);

      // 첫 번째 Part를 기본 활성 탭으로 설정
      if (data.lectures && data.lectures.length > 0) {
        const firstPart = data.lectures[0].section_title || '기타';
        setActiveTab(firstPart);
      }
    } catch (error) {
      console.error('강의 상세 정보 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourseDetail();
  }, [fetchCourseDetail]);

  const handleCheckboxChange = (lectureId: number, currentStatus: boolean) => {
    console.log('=== Checkbox Changed ===');
    console.log('Lecture ID:', lectureId);
    console.log('Current Status:', currentStatus);
    console.log('New Status:', !currentStatus);

    // 로컬 상태 업데이트
    setLocalCompletionStates(prev => ({
      ...prev,
      [lectureId]: !currentStatus
    }));

    // 변경된 강의 추적
    setChangedLectures(prev => new Set(prev).add(lectureId));
  };

  const handleSave = async () => {
    if (changedLectures.size === 0) {
      alert('변경된 강의가 없습니다.');
      return;
    }

    setSaving(true);

    try {
      console.log('=== Saving Changes ===');
      console.log('Changed Lectures:', Array.from(changedLectures));

      // 변경된 각 강의를 업데이트
      const updatePromises = Array.from(changedLectures).map(async (lectureId) => {
        const newStatus = localCompletionStates[lectureId];

        console.log(`Updating Lecture ${lectureId} to ${newStatus}`);

        const res = await fetch(`/api/lectures/${lectureId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            is_completed: newStatus,
          }),
        });

        if (!res.ok) {
          throw new Error(`Failed to update lecture ${lectureId}`);
        }

        return res.json();
      });

      const results = await Promise.all(updatePromises);
      console.log('All Updates Completed:', results);

      // 상태 초기화
      setChangedLectures(new Set());
      setLocalCompletionStates({});

      // 강의 상세 정보 다시 불러오기 (통계 업데이트 포함)
      await fetchCourseDetail();

      // 부모 컴포넌트에도 업데이트 알림
      if (onUpdate) {
        onUpdate();
      }

      alert('저장되었습니다!');
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setChangedLectures(new Set());
    setLocalCompletionStates({});
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}시간 ${mins}분`;
  };

  // 섹션별로 강의 그룹화
  const groupedLectures = course?.lectures?.reduce((acc: Record<string, Lecture[]>, lecture) => {
    const key = lecture.section_title || '기타';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(lecture);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="bg-gray-800 text-white p-6 flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">{course?.course_title}</h2>
            {course?.url && (
              <a
                href={course.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-300 hover:underline text-sm"
              >
                강의 페이지로 이동 →
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 text-2xl font-bold ml-4"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : course ? (
          <>
            {/* 통계 정보 */}
            <div className="p-6 bg-gray-50 border-b">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-600">진도율</div>
                  <div className="text-2xl font-bold text-blue-600">{course.progress_rate}%</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">학습 시간</div>
                  <div className="text-xl font-bold text-green-600">{formatTime(course.study_time)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">남은 시간</div>
                  <div className="text-xl font-bold text-orange-600">{formatTime(course.remaining_time)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">총 강의 수</div>
                  <div className="text-xl font-bold text-purple-600">{course.lectures?.length || 0}개</div>
                </div>
              </div>

              {/* 진도바 */}
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{ width: `${course.progress_rate}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Part 탭 및 강의 목록 */}
            <div className="flex flex-col h-[60vh]">
              {/* Part 탭 */}
              <div className="border-b overflow-x-auto">
                <div className="flex px-6 pt-4">
                  {groupedLectures && Object.keys(groupedLectures).map((partTitle) => (
                    <button
                      key={partTitle}
                      onClick={() => setActiveTab(partTitle)}
                      className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${
                        activeTab === partTitle
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                      }`}
                    >
                      {partTitle}
                      <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded-full">
                        {groupedLectures[partTitle].length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 활성 탭의 강의 목록 */}
              <div className="flex-1 overflow-y-auto p-6">
                {groupedLectures && groupedLectures[activeTab] && (
                  <div className="space-y-2">
                    {groupedLectures[activeTab].map((lecture, idx) => {
                      const lectureId = lecture.lecture_id!;
                      const currentStatus = localCompletionStates[lectureId] !== undefined
                        ? localCompletionStates[lectureId]
                        : lecture.is_completed;
                      const isChanged = changedLectures.has(lectureId);

                      return (
                        <div
                          key={lecture.lecture_id || idx}
                          className={`flex items-start justify-between p-3 rounded transition-colors ${
                            currentStatus ? 'bg-green-50' : 'bg-white border'
                          } ${isChanged ? 'border-2 border-yellow-400' : ''}`}
                        >
                          <div className="flex items-start flex-1">
                            <input
                              type="checkbox"
                              checked={currentStatus}
                              onChange={() => handleCheckboxChange(lectureId, currentStatus)}
                              disabled={saving || !lecture.lecture_id}
                              className="mt-1 mr-3 w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <div className="flex-1">
                              {lecture.chapter_title && (
                                <div className="text-xs text-gray-500 mb-1">
                                  {lecture.chapter_title}
                                </div>
                              )}
                              <div className={`text-sm ${
                                currentStatus ? 'text-gray-600 line-through' : 'text-gray-800'
                              }`}>
                                {lecture.lecture_title}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 ml-4 flex-shrink-0">
                            {lecture.lecture_time ? `${Math.round(lecture.lecture_time)}분` : '-'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {(!course.lectures || course.lectures.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    강의 목록이 없습니다.
                  </div>
                )}
              </div>
            </div>

            {/* 저장/취소 버튼 */}
            <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {changedLectures.size > 0 ? (
                  <span className="text-yellow-600 font-medium">
                    {changedLectures.size}개의 강의가 변경되었습니다.
                  </span>
                ) : (
                  <span>변경사항이 없습니다.</span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  disabled={saving || changedLectures.size === 0}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || changedLectures.size === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      저장 중...
                    </>
                  ) : (
                    '저장'
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-gray-500">
            강의 정보를 불러올 수 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
