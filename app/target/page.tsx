'use client';

import { useEffect, useState } from 'react';
import Loading from '@/components/Loading';
import type { TargetCourse } from '@/types';

export default function TargetPage() {
  const [targetData, setTargetData] = useState<{ has_target: boolean; target_course: TargetCourse | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
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

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}시간 ${mins}분`;
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">완강 목표</h1>

      {targetData?.has_target && targetData.target_course ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">
            <a
              href={targetData.target_course.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {targetData.target_course.course_title}
            </a>
          </h2>

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
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg">설정된 목표 강의가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
