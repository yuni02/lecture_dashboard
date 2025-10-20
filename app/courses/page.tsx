'use client';

import { useEffect, useState } from 'react';
import Loading from '@/components/Loading';
import CourseDetailModal from '@/components/CourseDetailModal';
import type { Course } from '@/types';

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [updatingVisibility, setUpdatingVisibility] = useState<number | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/courses');
      const data = await res.json();
      setCourses(data);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}시간 ${mins}분`;
  };

  const toggleVisibility = async (courseId: number, currentStatus: boolean) => {
    setUpdatingVisibility(courseId);

    try {
      const res = await fetch(`/api/courses/${courseId}/visibility`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_visible_on_dashboard: !currentStatus,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update visibility');
      }

      await fetchCourses();
    } catch (error) {
      console.error('대시보드 표시 상태 업데이트 실패:', error);
      alert('업데이트에 실패했습니다.');
    } finally {
      setUpdatingVisibility(null);
    }
  };

  const visibleCourses = courses.filter(c => c.is_visible_on_dashboard);
  const hiddenCourses = courses.filter(c => !c.is_visible_on_dashboard);

  if (loading) return <Loading />;

  const renderCourseCard = (course: Course) => (
    <div
      key={course.course_id}
      className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow relative"
    >
      <div
        onClick={() => setSelectedCourseId(course.course_id)}
        className="cursor-pointer"
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          {course.course_title}
        </h3>

        <div className="space-y-3 mt-4">
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>진도율</span>
              <span className="font-medium">{course.progress_rate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${course.progress_rate}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">학습:</span>
              <span className="ml-1 font-medium">{formatTime(course.study_time)}</span>
            </div>
            <div>
              <span className="text-gray-600">남은:</span>
              <span className="ml-1 font-medium">{formatTime(course.remaining_time)}</span>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            강의 수: {course.lectures?.length || 0}개
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleVisibility(course.course_id, course.is_visible_on_dashboard || false);
          }}
          disabled={updatingVisibility === course.course_id}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
            course.is_visible_on_dashboard
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } disabled:opacity-50`}
        >
          {updatingVisibility === course.course_id ? '...' : (
            course.is_visible_on_dashboard ? '👁️ 표시중' : '🔒 숨김'
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.open(course.url, '_blank');
          }}
          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
        >
          강의 열기
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">강의 목록</h1>

      {/* 대시보드 표시 강의 */}
      <div>
        <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          <span>👁️ 대시보드 표시 강의</span>
          <span className="text-sm font-normal text-gray-500">({visibleCourses.length}개)</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleCourses.map((course) => renderCourseCard(course))}
        </div>
        {visibleCourses.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg text-gray-500">
            대시보드에 표시할 강의가 없습니다.
          </div>
        )}
      </div>

      {/* 숨김 강의 */}
      <div>
        <button
          onClick={() => setShowHidden(!showHidden)}
          className="w-full text-left"
        >
          <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2 hover:text-gray-900 transition-colors">
            <span className="transition-transform duration-200" style={{ transform: showHidden ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ▶
            </span>
            <span>🔒 숨긴 강의</span>
            <span className="text-sm font-normal text-gray-500">({hiddenCourses.length}개)</span>
          </h2>
        </button>

        {showHidden && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hiddenCourses.map((course) => renderCourseCard(course))}
          </div>
        )}
        {showHidden && hiddenCourses.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg text-gray-500">
            숨긴 강의가 없습니다.
          </div>
        )}
      </div>


      {selectedCourseId && (
        <CourseDetailModal
          courseId={selectedCourseId}
          onClose={() => setSelectedCourseId(null)}
          onUpdate={fetchCourses}
        />
      )}
    </div>
  );
}
