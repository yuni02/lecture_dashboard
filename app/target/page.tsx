'use client';

import { useEffect, useState } from 'react';
import Loading from '@/components/Loading';
import type { TargetCourse, Course } from '@/types';

export default function TargetPage() {
  const [targetData, setTargetData] = useState<{ has_target: boolean; target_course: TargetCourse | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
    fetchCourses();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/courses/target');
      const data = await res.json();
      setTargetData(data);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/courses');
      const data = await res.json();
      // 진도율 100% 미만인 강의만 필터링
      const incompleteCourses = data.filter((course: Course) => course.progress_rate < 100);
      setCourses(incompleteCourses);
    } catch (error) {
      console.error('강의 목록 로드 실패:', error);
    }
  };

  const formatTime = (minutes: number) => {
    const totalHours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    const totalDays = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    if (totalDays >= 365) {
      const years = Math.floor(totalDays / 365);
      const months = Math.floor((totalDays % 365) / 30);
      const days = (totalDays % 365) % 30;
      return `${years}년 ${months}개월 ${days}일`;
    }

    if (totalDays >= 30) {
      const months = Math.floor(totalDays / 30);
      const days = totalDays % 30;
      return `${months}개월 ${days}일 ${hours}시간`;
    }

    if (totalDays >= 1) {
      return `${totalDays}일 ${hours}시간 ${mins}분`;
    }

    return `${totalHours}시간 ${mins}분`;
  };

  const handleClearTarget = async () => {
    if (!targetData?.target_course) return;

    if (!confirm('목표 강의를 해제하시겠습니까?')) {
      return;
    }

    try {
      setSubmitting(true);
      const courseId = targetData.target_course.course_id;
      const res = await fetch(`/api/courses/${courseId}/clear-target`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('목표 해제 실패');
      }

      const result = await res.json();
      alert(result.message);

      // 데이터 새로고침
      await fetchData();

      // 폼 초기화
      setSelectedCourseId('');
      setStartDate('');
      setCompletionDate('');
    } catch (error) {
      console.error('목표 해제 실패:', error);
      alert('목표 해제에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetTarget = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCourseId || !startDate || !completionDate) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    // 날짜 유효성 검사
    const start = new Date(startDate);
    const end = new Date(completionDate);

    if (end <= start) {
      alert('완료 목표일은 시작일보다 이후여야 합니다.');
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch(`/api/courses/${selectedCourseId}/set-target`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_start_date: startDate,
          target_completion_date: completionDate,
        }),
      });

      if (!res.ok) {
        throw new Error('목표 설정 실패');
      }

      const result = await res.json();

      // 성공 메시지
      const studyDays = result.study_days || 0;
      const dailyMinutes = result.target_daily_minutes || 0;
      const dailyHours = Math.floor(dailyMinutes / 60);
      const dailyMins = dailyMinutes % 60;

      let timeStr = '';
      if (dailyHours > 0 && dailyMins > 0) {
        timeStr = `${dailyHours}시간 ${dailyMins}분`;
      } else if (dailyHours > 0) {
        timeStr = `${dailyHours}시간`;
      } else {
        timeStr = `${dailyMins}분`;
      }

      alert(`목표가 설정되었습니다!\n\n기간: ${studyDays}일\n일일 목표: ${timeStr}`);

      // 데이터 새로고침
      await fetchData();
    } catch (error) {
      console.error('목표 설정 실패:', error);
      alert('목표 설정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">완강 목표</h1>

      {targetData?.has_target && targetData.target_course ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-semibold">
              <a
                href={targetData.target_course.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {targetData.target_course.course_title}
              </a>
            </h2>
            <button
              onClick={handleClearTarget}
              disabled={submitting}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '처리중...' : '목표 해제'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">시작일</div>
              <div className="text-lg font-bold text-blue-600">
                {targetData.target_course.target_start_date}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">완료 목표일</div>
              <div className="text-lg font-bold text-green-600">
                {targetData.target_course.target_completion_date}
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">일일 목표 시간</div>
              <div className="text-lg font-bold text-purple-600">
                {formatTime(targetData.target_course.target_daily_minutes)}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>진도율</span>
                <span className="font-medium">{targetData.target_course.progress_rate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all"
                  style={{ width: `${targetData.target_course.progress_rate}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded">
                <span className="text-gray-600">학습 시간:</span>
                <span className="ml-2 font-medium">{formatTime(targetData.target_course.study_time)}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <span className="text-gray-600">남은 시간:</span>
                <span className="ml-2 font-medium">{formatTime(targetData.target_course.remaining_time)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">목표 강의 설정</h2>
            <p className="text-gray-600">완료하고 싶은 강의를 선택하고 목표 기간을 설정하세요</p>
          </div>

          <form onSubmit={handleSetTarget} className="max-w-2xl mx-auto space-y-6">
            <div>
              <label htmlFor="course-select" className="block text-sm font-medium text-gray-700 mb-2">
                강의 선택
              </label>
              <select
                id="course-select"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">강의를 선택하세요</option>
                {courses.map((course) => (
                  <option key={course.course_id} value={course.course_id}>
                    {course.course_title} (진도율: {course.progress_rate}%)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
                  시작일
                </label>
                <input
                  type="date"
                  id="start-date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="completion-date" className="block text-sm font-medium text-gray-700 mb-2">
                  완료 목표일
                </label>
                <input
                  type="date"
                  id="completion-date"
                  value={completionDate}
                  onChange={(e) => setCompletionDate(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '설정 중...' : '목표 설정하기'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
