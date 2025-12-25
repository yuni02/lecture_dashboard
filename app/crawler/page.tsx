'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Loading from '@/components/Loading';
import SortableTableHeader from '@/components/SortableTableHeader';
import type { SpiderInfo, JobListItem, JobStatusResponse, CrawlResponse, JobStatus, Course } from '@/types';

const CRAWLER_API_URL = process.env.NEXT_PUBLIC_CRAWLER_API_URL || 'http://localhost:8000';

// 스파이더별 강의 선택 모드 정의
type CourseSelectMode = 'none' | 'single' | 'multiple';

// 정렬 타입
type SortDirection = 'asc' | 'desc';
type JobSortKey = 'job_id' | 'spider' | 'status' | 'started_at' | 'finished_at';
type UpdateSortKey = 'course_title' | 'previous_progress' | 'current_progress' | 'progress_change' | 'study_time_change' | 'updated_at';

const SPIDER_COURSE_MODE: Record<string, CourseSelectMode> = {
  'fastcampus': 'none',
  'fastcampus_daily': 'multiple',
  'fastcampus_lectures': 'single',
  'fastcampus_discover': 'multiple',
  'fastcampus_recrawl': 'none',
};

// 탭 타입
type TabType = 'crawl' | 'history';

// 이력 데이터 타입
interface HistoryData {
  summary: {
    updated_courses: number;
    crawl_count: number;
    completed_today: number;
    period_hours: number;
  };
  updates: Array<{
    course_id: number;
    course_title: string;
    url: string;
    updated_at: string;
    current_progress: number;
    previous_progress: number;
    progress_change: number;
    current_study_time: number;
    previous_study_time: number;
    study_time_change: number;
    total_lecture_time: number;
    snapshot_date: string | null;
  }>;
  crawl_logs: Array<{
    log_id: number;
    course_id: number;
    course_title: string;
    status: string;
    error_message: string | null;
  }>;
  completed_today: Array<{
    lecture_id: number;
    course_id: number;
    course_title: string;
    section_title: string;
    lecture_title: string;
    lecture_time: number;
    completed_at: string;
  }>;
}

export default function CrawlerPage() {
  const [activeTab, setActiveTab] = useState<TabType>('crawl');
  const [spiders, setSpiders] = useState<SpiderInfo[]>([]);
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 이력 데이터
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyHours, setHistoryHours] = useState(24);

  // Form state
  const [selectedSpider, setSelectedSpider] = useState<string>('fastcampus_daily');
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<number>>(new Set());
  const [courseSearchTerm, setCourseSearchTerm] = useState<string>('');
  const [showCourseSelector, setShowCourseSelector] = useState(false);

  // 정렬 state
  const [jobSortKey, setJobSortKey] = useState<JobSortKey>('started_at');
  const [jobSortDirection, setJobSortDirection] = useState<SortDirection>('desc');
  const [updateSortKey, setUpdateSortKey] = useState<UpdateSortKey>('updated_at');
  const [updateSortDirection, setUpdateSortDirection] = useState<SortDirection>('desc');

  const courseSelectMode = SPIDER_COURSE_MODE[selectedSpider] || 'none';

  // 정렬 핸들러
  const handleJobSort = (key: string) => {
    const newKey = key as JobSortKey;
    if (jobSortKey === newKey) {
      setJobSortDirection(jobSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setJobSortKey(newKey);
      setJobSortDirection('asc');
    }
  };

  const handleUpdateSort = (key: string) => {
    const newKey = key as UpdateSortKey;
    if (updateSortKey === newKey) {
      setUpdateSortDirection(updateSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setUpdateSortKey(newKey);
      setUpdateSortDirection('asc');
    }
  };

  // 정렬된 jobs
  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      let comparison = 0;
      switch (jobSortKey) {
        case 'job_id':
          comparison = a.job_id.localeCompare(b.job_id);
          break;
        case 'spider':
          comparison = a.spider.localeCompare(b.spider);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'started_at':
          comparison = new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
          break;
        case 'finished_at':
          const aTime = a.finished_at ? new Date(a.finished_at).getTime() : 0;
          const bTime = b.finished_at ? new Date(b.finished_at).getTime() : 0;
          comparison = aTime - bTime;
          break;
      }
      return jobSortDirection === 'asc' ? comparison : -comparison;
    });
  }, [jobs, jobSortKey, jobSortDirection]);

  // 정렬된 updates
  const sortedUpdates = useMemo(() => {
    if (!historyData) return [];
    return [...historyData.updates].sort((a, b) => {
      let comparison = 0;
      switch (updateSortKey) {
        case 'course_title':
          comparison = a.course_title.localeCompare(b.course_title);
          break;
        case 'previous_progress':
          comparison = a.previous_progress - b.previous_progress;
          break;
        case 'current_progress':
          comparison = a.current_progress - b.current_progress;
          break;
        case 'progress_change':
          comparison = a.progress_change - b.progress_change;
          break;
        case 'study_time_change':
          comparison = a.study_time_change - b.study_time_change;
          break;
        case 'updated_at':
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
      }
      return updateSortDirection === 'asc' ? comparison : -comparison;
    });
  }, [historyData, updateSortKey, updateSortDirection]);

  const fetchSpiders = useCallback(async () => {
    try {
      const res = await fetch(`${CRAWLER_API_URL}/api/spiders`);
      if (!res.ok) throw new Error('스파이더 목록을 불러오는데 실패했습니다');
      const data = await res.json();
      setSpiders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch(`${CRAWLER_API_URL}/api/jobs`);
      if (!res.ok) throw new Error('작업 목록을 불러오는데 실패했습니다');
      const data = await res.json();
      setJobs(data.jobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    }
  }, []);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await fetch('/api/courses');
      if (!res.ok) throw new Error('강의 목록을 불러오는데 실패했습니다');
      const data = await res.json();
      setCourses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    }
  }, []);

  const fetchHistory = useCallback(async (hours: number) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/crawl/history?hours=${hours}`);
      if (!res.ok) throw new Error('이력을 불러오는데 실패했습니다');
      const data = await res.json();
      setHistoryData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchSpiders(), fetchJobs(), fetchCourses()]);
      setLoading(false);
    };
    loadData();
  }, [fetchSpiders, fetchJobs, fetchCourses]);

  // 이력 탭 선택 시 데이터 로드
  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory(historyHours);
    }
  }, [activeTab, historyHours, fetchHistory]);

  // Auto-refresh jobs every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchJobs();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const filteredCourses = useMemo(() => {
    if (!courseSearchTerm.trim()) return courses;
    const term = courseSearchTerm.toLowerCase();
    return courses.filter(
      (course) =>
        course.course_title?.toLowerCase().includes(term) ||
        course.course_id.toString().includes(term)
    );
  }, [courses, courseSearchTerm]);

  const handleToggleCourse = (courseId: number) => {
    if (courseSelectMode === 'single') {
      setSelectedCourseIds((prev) => (prev.has(courseId) ? new Set() : new Set([courseId])));
    } else {
      setSelectedCourseIds((prev) => {
        const next = new Set(prev);
        if (next.has(courseId)) {
          next.delete(courseId);
        } else {
          next.add(courseId);
        }
        return next;
      });
    }
  };

  const handleSelectAll = () => {
    if (selectedCourseIds.size === filteredCourses.length) {
      setSelectedCourseIds(new Set());
    } else {
      setSelectedCourseIds(new Set(filteredCourses.map((c) => c.course_id)));
    }
  };

  const handleClearSelection = () => setSelectedCourseIds(new Set());

  const handleSpiderChange = (spider: string) => {
    setSelectedSpider(spider);
    setSelectedCourseIds(new Set());
    setShowCourseSelector(false);
  };

  const handleStartCrawl = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const body: { spider: string; course_ids?: string[] } = { spider: selectedSpider };
      if (selectedCourseIds.size > 0) {
        body.course_ids = Array.from(selectedCourseIds).map((id) => id.toString());
      }

      const res = await fetch(`${CRAWLER_API_URL}/api/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || '크롤링 시작에 실패했습니다');
      }

      const data: CrawlResponse = await res.json();
      alert(`크롤링 시작됨: ${data.job_id}`);
      setSelectedCourseIds(new Set());
      setShowCourseSelector(false);
      await fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewJob = async (jobId: string) => {
    try {
      const res = await fetch(`${CRAWLER_API_URL}/api/crawl/${jobId}`);
      if (!res.ok) throw new Error('작업 상태를 불러오는데 실패했습니다');
      const data: JobStatusResponse = await res.json();
      setSelectedJob(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    }
  };

  const handleCancelJob = async (jobId: string) => {
    if (!confirm('정말로 이 작업을 취소하시겠습니까?')) return;

    try {
      const res = await fetch(`${CRAWLER_API_URL}/api/crawl/${jobId}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || '작업 취소에 실패했습니다');
      }
      await fetchJobs();
      if (selectedJob?.job_id === jobId) {
        setSelectedJob(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    }
  };

  const getStatusBadge = (status: JobStatus | string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      running: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      pending: '대기중',
      running: '실행중',
      completed: '완료',
      success: '성공',
      failed: '실패',
      cancelled: '취소됨',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
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

    return totalHours > 0 ? `${totalHours}시간 ${mins}분` : `${mins}분`;
  };

  const selectedCourseNames = useMemo(() => {
    return courses.filter((c) => selectedCourseIds.has(c.course_id)).map((c) => c.course_title);
  }, [courses, selectedCourseIds]);

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">크롤러 관리</h1>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => { setActiveTab('crawl'); setError(null); }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'crawl'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            크롤링 실행
          </button>
          <button
            onClick={() => { setActiveTab('history'); setError(null); }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            변경 이력
          </button>
        </nav>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
          <button className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
            <span className="text-red-500">&times;</span>
          </button>
        </div>
      )}

      {/* 크롤링 실행 탭 */}
      {activeTab === 'crawl' && (
        <>
          {/* 크롤링 시작 폼 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">크롤링 시작</h2>
            <form onSubmit={handleStartCrawl} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">스파이더 선택</label>
                <select
                  value={selectedSpider}
                  onChange={(e) => handleSpiderChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {spiders.map((spider) => (
                    <option key={spider.name} value={spider.name}>
                      {spider.name} - {spider.description}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  {courseSelectMode === 'none' && '이 스파이더는 전체 강의를 대상으로 실행됩니다.'}
                  {courseSelectMode === 'single' && '이 스파이더는 하나의 강의만 선택할 수 있습니다.'}
                  {courseSelectMode === 'multiple' && '이 스파이더는 여러 강의를 선택할 수 있습니다.'}
                </p>
              </div>

              {courseSelectMode !== 'none' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    강의 선택 {courseSelectMode === 'single' ? '(1개만 선택)' : '(복수 선택 가능)'}
                  </label>

                  {selectedCourseIds.size > 0 && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-blue-800">선택된 강의: {selectedCourseIds.size}개</span>
                        <button type="button" onClick={handleClearSelection} className="text-sm text-blue-600 hover:text-blue-800">
                          선택 해제
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedCourseNames.slice(0, 5).map((name, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {name.length > 20 ? name.substring(0, 20) + '...' : name}
                          </span>
                        ))}
                        {selectedCourseNames.length > 5 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            +{selectedCourseNames.length - 5}개 더
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowCourseSelector(!showCourseSelector)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-left hover:bg-gray-50 flex justify-between items-center"
                  >
                    <span className="text-gray-700">
                      {selectedCourseIds.size > 0
                        ? `${selectedCourseIds.size}개 강의 선택됨`
                        : courseSelectMode === 'single'
                        ? '강의를 선택하세요 (1개)'
                        : '강의를 선택하세요 (비워두면 전체 크롤링)'}
                    </span>
                    <span className="text-gray-400">{showCourseSelector ? '▲' : '▼'}</span>
                  </button>

                  {showCourseSelector && (
                    <div className="mt-2 border border-gray-300 rounded-lg overflow-hidden">
                      <div className="p-3 bg-gray-50 border-b border-gray-200 space-y-2">
                        <input
                          type="text"
                          value={courseSearchTerm}
                          onChange={(e) => setCourseSearchTerm(e.target.value)}
                          placeholder="강의명 또는 ID로 검색..."
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                        <div className="flex justify-between items-center">
                          {courseSelectMode === 'multiple' ? (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={filteredCourses.length > 0 && filteredCourses.every((c) => selectedCourseIds.has(c.course_id))}
                                onChange={handleSelectAll}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span className="text-sm text-gray-700">전체 선택</span>
                            </label>
                          ) : (
                            <span className="text-sm text-gray-500">1개만 선택 가능</span>
                          )}
                          <span className="text-sm text-gray-500">{filteredCourses.length}개 강의</span>
                        </div>
                      </div>

                      <div className="max-h-64 overflow-y-auto">
                        {filteredCourses.length === 0 ? (
                          <p className="p-4 text-center text-gray-500 text-sm">검색 결과가 없습니다.</p>
                        ) : (
                          filteredCourses.map((course) => (
                            <label
                              key={course.course_id}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <input
                                type={courseSelectMode === 'single' ? 'radio' : 'checkbox'}
                                name={courseSelectMode === 'single' ? 'course-select' : undefined}
                                checked={selectedCourseIds.has(course.course_id)}
                                onChange={() => handleToggleCourse(course.course_id)}
                                className="w-4 h-4 text-blue-600"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{course.course_title}</p>
                                <p className="text-xs text-gray-500">ID: {course.course_id} | 진도율: {course.progress_rate}%</p>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {submitting ? '시작 중...' : '크롤링 시작'}
              </button>
            </form>
          </div>

          {/* 작업 목록 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">작업 목록</h2>
              <button onClick={fetchJobs} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                새로고침
              </button>
            </div>

            {jobs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">진행 중인 작업이 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <SortableTableHeader
                        label="작업 ID"
                        sortKey="job_id"
                        currentSortKey={jobSortKey}
                        sortDirection={jobSortDirection}
                        onSort={handleJobSort}
                        className="px-4 py-3"
                      />
                      <SortableTableHeader
                        label="스파이더"
                        sortKey="spider"
                        currentSortKey={jobSortKey}
                        sortDirection={jobSortDirection}
                        onSort={handleJobSort}
                        className="px-4 py-3"
                      />
                      <SortableTableHeader
                        label="상태"
                        sortKey="status"
                        currentSortKey={jobSortKey}
                        sortDirection={jobSortDirection}
                        onSort={handleJobSort}
                        className="px-4 py-3"
                      />
                      <SortableTableHeader
                        label="시작 시간"
                        sortKey="started_at"
                        currentSortKey={jobSortKey}
                        sortDirection={jobSortDirection}
                        onSort={handleJobSort}
                        className="px-4 py-3"
                      />
                      <SortableTableHeader
                        label="완료 시간"
                        sortKey="finished_at"
                        currentSortKey={jobSortKey}
                        sortDirection={jobSortDirection}
                        onSort={handleJobSort}
                        className="px-4 py-3"
                      />
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedJobs.map((job) => (
                      <tr key={job.job_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono text-gray-800">{job.job_id}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{job.spider}</td>
                        <td className="px-4 py-3">{getStatusBadge(job.status)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDateTime(job.started_at)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{job.finished_at ? formatDateTime(job.finished_at) : '-'}</td>
                        <td className="px-4 py-3 text-sm space-x-2">
                          <button onClick={() => handleViewJob(job.job_id)} className="text-blue-600 hover:text-blue-800">
                            상세
                          </button>
                          {(job.status === 'pending' || job.status === 'running') && (
                            <button onClick={() => handleCancelJob(job.job_id)} className="text-red-600 hover:text-red-800">
                              취소
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* 변경 이력 탭 */}
      {activeTab === 'history' && (
        <>
          {/* 기간 선택 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">기간:</label>
              <select
                value={historyHours}
                onChange={(e) => setHistoryHours(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value={1}>최근 1시간</option>
                <option value={6}>최근 6시간</option>
                <option value={24}>최근 24시간</option>
                <option value={48}>최근 48시간</option>
                <option value={168}>최근 7일</option>
              </select>
              <button
                onClick={() => fetchHistory(historyHours)}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                새로고침
              </button>
            </div>
          </div>

          {historyLoading ? (
            <Loading />
          ) : historyData ? (
            <>
              {/* 요약 통계 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500">업데이트된 강의</h3>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{historyData.summary.updated_courses}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500">크롤링 횟수</h3>
                  <p className="text-3xl font-bold text-green-600 mt-2">{historyData.summary.crawl_count}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500">오늘 완료한 강의</h3>
                  <p className="text-3xl font-bold text-purple-600 mt-2">{historyData.summary.completed_today}</p>
                </div>
              </div>

              {/* 진도율 변화 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">진도율 변화</h2>
                {historyData.updates.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">해당 기간에 업데이트된 강의가 없습니다.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <SortableTableHeader
                            label="강의명"
                            sortKey="course_title"
                            currentSortKey={updateSortKey}
                            sortDirection={updateSortDirection}
                            onSort={handleUpdateSort}
                            className="px-4 py-3"
                          />
                          <SortableTableHeader
                            label="이전 진도율"
                            sortKey="previous_progress"
                            currentSortKey={updateSortKey}
                            sortDirection={updateSortDirection}
                            onSort={handleUpdateSort}
                            className="px-4 py-3"
                          />
                          <SortableTableHeader
                            label="현재 진도율"
                            sortKey="current_progress"
                            currentSortKey={updateSortKey}
                            sortDirection={updateSortDirection}
                            onSort={handleUpdateSort}
                            className="px-4 py-3"
                          />
                          <SortableTableHeader
                            label="변화"
                            sortKey="progress_change"
                            currentSortKey={updateSortKey}
                            sortDirection={updateSortDirection}
                            onSort={handleUpdateSort}
                            className="px-4 py-3"
                          />
                          <SortableTableHeader
                            label="학습 시간 변화"
                            sortKey="study_time_change"
                            currentSortKey={updateSortKey}
                            sortDirection={updateSortDirection}
                            onSort={handleUpdateSort}
                            className="px-4 py-3"
                          />
                          <SortableTableHeader
                            label="업데이트 시간"
                            sortKey="updated_at"
                            currentSortKey={updateSortKey}
                            sortDirection={updateSortDirection}
                            onSort={handleUpdateSort}
                            className="px-4 py-3"
                          />
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sortedUpdates.map((update) => (
                          <tr key={update.course_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <a
                                href={update.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-blue-600 hover:underline"
                              >
                                {update.course_title.length > 40
                                  ? update.course_title.substring(0, 40) + '...'
                                  : update.course_title}
                              </a>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {update.previous_progress !== null ? `${update.previous_progress}%` : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{update.current_progress}%</td>
                            <td className="px-4 py-3 text-sm">
                              {update.progress_change !== 0 ? (
                                <span className={update.progress_change > 0 ? 'text-green-600 font-medium' : 'text-red-600'}>
                                  {update.progress_change > 0 ? '+' : ''}
                                  {update.progress_change}%
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {update.study_time_change !== 0 ? (
                                <span className={update.study_time_change > 0 ? 'text-green-600' : 'text-red-600'}>
                                  {update.study_time_change > 0 ? '+' : ''}
                                  {formatTime(update.study_time_change)}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{formatDateTime(update.updated_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 오늘 완료한 강의 */}
              {historyData.completed_today.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">오늘 완료한 강의</h2>
                  <div className="space-y-2">
                    {historyData.completed_today.map((lecture) => (
                      <div
                        key={lecture.lecture_id}
                        className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-800">{lecture.lecture_title}</p>
                          <p className="text-xs text-gray-500">
                            {lecture.course_title} &gt; {lecture.section_title}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">{formatTime(lecture.lecture_time)}</p>
                          <p className="text-xs text-gray-500">{formatDateTime(lecture.completed_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 크롤링 로그 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">크롤링 로그</h2>
                {historyData.crawl_logs.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">크롤링 로그가 없습니다.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">로그 ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">강의</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {historyData.crawl_logs.slice(0, 20).map((log) => (
                          <tr key={log.log_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-500">#{log.log_id}</td>
                            <td className="px-4 py-3 text-sm text-gray-800">
                              {log.course_title || `Course #${log.course_id}`}
                            </td>
                            <td className="px-4 py-3">{getStatusBadge(log.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </>
      )}

      {/* 작업 상세 모달 */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">작업 상세: {selectedJob.job_id}</h3>
              <button onClick={() => setSelectedJob(null)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">
                &times;
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-100px)]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">스파이더</label>
                  <p className="font-medium">{selectedJob.spider}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">상태</label>
                  <p>{getStatusBadge(selectedJob.status)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">시작 시간</label>
                  <p className="font-medium">{formatDateTime(selectedJob.started_at)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">완료 시간</label>
                  <p className="font-medium">{selectedJob.finished_at ? formatDateTime(selectedJob.finished_at) : '-'}</p>
                </div>
                {selectedJob.output_file && (
                  <div className="col-span-2">
                    <label className="text-sm text-gray-500">출력 파일</label>
                    <p className="font-mono text-sm">{selectedJob.output_file}</p>
                  </div>
                )}
              </div>

              {selectedJob.error && (
                <div>
                  <label className="text-sm text-gray-500">오류</label>
                  <pre className="mt-1 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm overflow-x-auto">
                    {selectedJob.error}
                  </pre>
                </div>
              )}

              {selectedJob.output && (
                <div>
                  <label className="text-sm text-gray-500">출력 로그</label>
                  <pre className="mt-1 p-3 bg-gray-900 text-green-400 rounded text-xs overflow-x-auto max-h-64 overflow-y-auto font-mono">
                    {selectedJob.output}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
