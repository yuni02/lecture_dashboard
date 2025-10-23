'use client';

import { useEffect, useState } from 'react';
import Loading from '@/components/Loading';
import type { Course, SummaryStats } from '@/types';

export default function Home() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [coursesRes, statsRes] = await Promise.all([
        fetch('/api/courses'),
        fetch('/api/stats/summary'),
      ]);

      const coursesData = await coursesRes.json();
      const statsData = await statsRes.json();

      setCourses(coursesData);
      setStats(statsData);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter(
    (course) =>
      course.course_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.lectures?.some((lecture) =>
        lecture.lecture_title?.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}시간 ${mins}분`;
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">대시보드</h1>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">총 강의 수</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">{stats.total_courses}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">평균 진도율</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{stats.avg_progress.toFixed(1)}%</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">총 학습 시간</h3>
            <p className="text-2xl font-bold text-purple-600 mt-2">{formatTime(stats.total_study_time)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">남은 시간</h3>
            <p className="text-2xl font-bold text-orange-600 mt-2">{formatTime(stats.remaining_time)}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <input
            type="text"
            placeholder="강의명 또는 강의 내용으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 데스크톱: 테이블 뷰 */}
        <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    강의명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    진도율
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    학습 시간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    남은 시간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    상태
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCourses.map((course) => (
                  <tr key={course.course_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <a
                        href={course.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {course.course_title}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2 max-w-[100px]">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${course.progress_rate}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          {course.progress_rate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                      {formatTime(course.study_time)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                      {formatTime(course.remaining_time)}
                    </td>
                    <td className="px-6 py-4">
                      {course.is_manually_completed ? (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded whitespace-nowrap">
                          제외
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded whitespace-nowrap">
                          진행중
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 모바일/태블릿: 카드 뷰 */}
        <div className="lg:hidden space-y-4">
          {filteredCourses.map((course) => (
            <div
              key={course.course_id}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <a
                href={course.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 md:p-6"
              >
                {/* 강의명과 상태 */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h3 className="text-base md:text-lg font-semibold text-blue-600 hover:underline flex-1">
                    {course.course_title}
                  </h3>
                  {course.is_manually_completed ? (
                    <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded whitespace-nowrap flex-shrink-0">
                      제외
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded whitespace-nowrap flex-shrink-0">
                      진행중
                    </span>
                  )}
                </div>

                {/* 진도율 */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">진도율</span>
                    <span className="text-sm font-semibold text-gray-800">
                      {course.progress_rate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all"
                      style={{ width: `${course.progress_rate}%` }}
                    />
                  </div>
                </div>

                {/* 시간 정보 */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600 mb-1">학습 시간</div>
                    <div className="font-semibold text-gray-800">
                      {formatTime(course.study_time)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">남은 시간</div>
                    <div className="font-semibold text-gray-800">
                      {formatTime(course.remaining_time)}
                    </div>
                  </div>
                </div>
              </a>
            </div>
          ))}
        </div>

        {filteredCourses.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            검색 결과가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
