'use client';

import { useEffect, useState } from 'react';
import Loading from '@/components/Loading';
import CourseDetailModal from '@/components/CourseDetailModal';
import PasswordModal from '@/components/PasswordModal';
import type { Course } from '@/types';
import { authenticatedFetch, storePassword, getUserSettings, storeUserSettings, isLoggedIn } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [updatingVisibility, setUpdatingVisibility] = useState<number | null>(null);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingVisibilityUpdate, setPendingVisibilityUpdate] = useState<{
    courseId: number;
    currentStatus: boolean;
  } | null>(null);

  useEffect(() => {
    fetchCourses();
    loadUserSettings();
  }, []);

  const loadUserSettings = () => {
    // sessionStorage에서 설정 불러오기
    const settings = getUserSettings();
    if (settings) {
      setHideCompleted(settings.hide_completed_lectures);
    }
  };

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
    // 비밀번호 모달 표시
    setPendingVisibilityUpdate({ courseId, currentStatus });
    setShowPasswordModal(true);
  };

  const handlePasswordConfirm = async (password: string) => {
    setShowPasswordModal(false);
    storePassword(password);

    if (pendingVisibilityUpdate) {
      await performVisibilityUpdate(
        pendingVisibilityUpdate.courseId,
        pendingVisibilityUpdate.currentStatus,
        password
      );
      setPendingVisibilityUpdate(null);
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordModal(false);
    setPendingVisibilityUpdate(null);
  };

  const performVisibilityUpdate = async (
    courseId: number,
    currentStatus: boolean,
    password: string
  ) => {
    setUpdatingVisibility(courseId);

    try {
      const res = await authenticatedFetch(
        `/api/courses/${courseId}/visibility`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            is_visible_on_dashboard: !currentStatus,
          }),
        },
        password
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update visibility');
      }

      await fetchCourses();
    } catch (error) {
      console.error('대시보드 표시 상태 업데이트 실패:', error);

      if (error instanceof Error) {
        if (error.message === 'UNAUTHORIZED') {
          alert('비밀번호가 올바르지 않습니다. 다시 시도해주세요.');
          setPendingVisibilityUpdate({ courseId, currentStatus });
          setShowPasswordModal(true);
          return;
        }
        if (error.message === 'PASSWORD_REQUIRED') {
          alert('비밀번호가 필요합니다.');
          setPendingVisibilityUpdate({ courseId, currentStatus });
          setShowPasswordModal(true);
          return;
        }
      }

      alert('업데이트에 실패했습니다.');
    } finally {
      setUpdatingVisibility(null);
    }
  };

  const toggleHideCompleted = async () => {
    if (!isLoggedIn()) {
      alert('로그인이 필요합니다.');
      router.push('/login');
      return;
    }

    const newValue = !hideCompleted;
    setHideCompleted(newValue);

    // DB에 저장
    try {
      const response = await authenticatedFetch('/api/auth/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hide_completed_lectures: newValue,
        }),
      });

      if (response.ok) {
        // sessionStorage에도 업데이트
        storeUserSettings({ hide_completed_lectures: newValue });
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      console.error('설정 저장 실패:', error);
      // 실패 시 원래 값으로 되돌리기
      setHideCompleted(!newValue);
      alert('설정 저장에 실패했습니다.');
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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">강의 목록</h1>

        {/* 설정 버튼 */}
        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="설정"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* 설정 드롭다운 */}
          {showSettings && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowSettings(false)}
              />
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-20 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">표시 설정</h3>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hideCompleted}
                    onChange={toggleHideCompleted}
                    className="mt-0.5 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-800">
                      완료된 강의 숨기기
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      강의 상세 모달에서 체크된 강의를 숨깁니다
                    </div>
                  </div>
                </label>
              </div>
            </>
          )}
        </div>
      </div>

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
          hideCompleted={hideCompleted}
        />
      )}

      <PasswordModal
        isOpen={showPasswordModal}
        onConfirm={handlePasswordConfirm}
        onCancel={handlePasswordCancel}
      />
    </div>
  );
}
