'use client';

import { useEffect, useState } from 'react';
import Loading from '@/components/Loading';
import type { CompletionEstimate } from '@/types';

export default function ProgressPage() {
  const [estimate, setEstimate] = useState<CompletionEstimate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/stats/completion');
      const data = await res.json();
      setEstimate(data);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
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

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">진척률 통계</h1>

      {estimate && (
        <>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">남은 학습 시간</h2>
            <p className="text-4xl font-bold text-blue-600">
              {formatTime(estimate.remaining_minutes)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">완료 예상 일수</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {estimate.days_1h_per_day}일
                </div>
                <div className="text-sm text-gray-600 mt-2">하루 1시간</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {estimate.days_2h_per_day}일
                </div>
                <div className="text-sm text-gray-600 mt-2">하루 2시간</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {estimate.days_3h_per_day}일
                </div>
                <div className="text-sm text-gray-600 mt-2">하루 3시간</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {estimate.days_5h_per_day}일
                </div>
                <div className="text-sm text-gray-600 mt-2">하루 5시간</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
