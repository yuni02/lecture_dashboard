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

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <input
            type="text"
            placeholder="강의명 또는 강의 내용으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

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
                      <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${course.progress_rate}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {course.progress_rate}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {formatTime(course.study_time)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {formatTime(course.remaining_time)}
                  </td>
                  <td className="px-6 py-4">
                    {course.is_manually_completed ? (
                      <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                        제외
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                        진행중
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCourses.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            검색 결과가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
