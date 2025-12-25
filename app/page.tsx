'use client';

import { useEffect, useState, useMemo } from 'react';
import Loading from '@/components/Loading';
import SortableTableHeader from '@/components/SortableTableHeader';
import type { Course, SummaryStats } from '@/types';

type SortKey = 'title' | 'progress' | 'study_time' | 'remaining_time' | 'status';
type SortDirection = 'asc' | 'desc';

interface TopProgressCourse {
  course_id: number;
  course_title: string;
  url: string;
  current_progress: number;
  previous_progress: number;
  progress_change: number;
  current_study_time: number;
  study_time_change: number;
  snapshot_date: string | null;
}

export default function Home() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [topProgress, setTopProgress] = useState<TopProgressCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [coursesRes, statsRes, topProgressRes] = await Promise.all([
        fetch('/api/courses'),
        fetch('/api/stats/summary'),
        fetch('/api/stats/top-progress'),
      ]);

      const coursesData = await coursesRes.json();
      const statsData = await statsRes.json();
      const topProgressData = await topProgressRes.json();

      setCourses(coursesData);
      setStats(statsData);
      setTopProgress(Array.isArray(topProgressData) ? topProgressData : []);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: string) => {
    const newKey = key as SortKey;
    if (sortKey === newKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(newKey);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedCourses = useMemo(() => {
    const filtered = courses.filter(
      (course) =>
        course.course_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.lectures?.some((lecture) =>
          lecture.lecture_title?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    return [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortKey) {
        case 'title':
          comparison = a.course_title.localeCompare(b.course_title);
          break;
        case 'progress':
          comparison = a.progress_rate - b.progress_rate;
          break;
        case 'study_time':
          comparison = a.study_time - b.study_time;
          break;
        case 'remaining_time':
          comparison = a.remaining_time - b.remaining_time;
          break;
        case 'status':
          comparison = (a.is_manually_completed ? 1 : 0) - (b.is_manually_completed ? 1 : 0);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [courses, searchTerm, sortKey, sortDirection]);

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

      {/* 최근 진척률 TOP 섹션 */}
      {topProgress.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg shadow p-6 border border-green-200">
          <h2 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
            <span>🔥</span>
            <span>최근 진척률 TOP</span>
            <span className="text-sm font-normal text-green-600">(스냅샷 대비)</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {topProgress.slice(0, 5).map((course, index) => (
              <a
                key={course.course_id}
                href={course.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow border border-green-100"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className={`text-lg font-bold ${
                    index === 0 ? 'text-yellow-500' :
                    index === 1 ? 'text-gray-400' :
                    index === 2 ? 'text-amber-600' : 'text-gray-500'
                  }`}>
                    #{index + 1}
                  </span>
                  <span className="text-green-600 font-bold text-lg">
                    +{course.progress_change.toFixed(1)}%
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-2">
                  {course.course_title}
                </h3>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{course.previous_progress.toFixed(1)}%</span>
                  <span>→</span>
                  <span className="text-green-600 font-medium">{course.current_progress.toFixed(1)}%</span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${course.current_progress}%` }}
                  />
                </div>
              </a>
            ))}
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
                  <SortableTableHeader
                    label="강의명"
                    sortKey="title"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHeader
                    label="진도율"
                    sortKey="progress"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHeader
                    label="학습 시간"
                    sortKey="study_time"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHeader
                    label="남은 시간"
                    sortKey="remaining_time"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHeader
                    label="상태"
                    sortKey="status"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedCourses.map((course) => (
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
          {filteredAndSortedCourses.map((course) => (
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

        {filteredAndSortedCourses.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            검색 결과가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
