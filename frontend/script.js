// API Base URL
const API_BASE = '';

// 상태 변수
let currentCourses = [];
let filteredCourses = [];
let currentPage = 1;
let itemsPerPage = 20;
let currentSort = 'updated_at_desc';
let searchQuery = '';

// 페이지 로드 시 데이터 가져오기
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
    setupModal();
});

// 대시보드 데이터 로드
async function loadDashboardData() {
    try {
        showLoading('대시보드 데이터를 불러오는 중...');

        // 병렬로 데이터 가져오기
        const [courses, summary, completion] = await Promise.all([
            fetch(`${API_BASE}/api/courses`).then(res => res.json()),
            fetch(`${API_BASE}/api/stats/summary`).then(res => res.json()),
            fetch(`${API_BASE}/api/stats/completion`).then(res => res.json())
        ]);

        // 통계 카드 업데이트
        updateStatCards(summary);

        // 완료 예상 업데이트
        updateCompletionEstimate(completion);

        // 강의 목록 렌더링
        renderCourses(courses);

        // 마지막 업데이트 시간
        updateLastUpdateTime();

    } catch (error) {
        console.error('데이터 로드 실패:', error);
        showError('데이터를 불러오는데 실패했습니다.');
    } finally {
        hideLoading();
    }
}

// 통계 카드 업데이트
function updateStatCards(summary) {
    document.getElementById('total-courses').textContent = summary.total_courses || 0;
    document.getElementById('avg-progress').textContent =
        summary.avg_progress ? `${summary.avg_progress}%` : '0%';

    document.getElementById('total-study-time').textContent =
        formatMinutesToTime(summary.total_study_time || 0);

    document.getElementById('remaining-time').textContent =
        formatMinutesToTime(summary.remaining_time || 0);
}

// 완료 예상 업데이트
function updateCompletionEstimate(completion) {
    document.getElementById('days-1h').textContent =
        completion.days_1h_per_day ? formatDaysToYearMonthDay(completion.days_1h_per_day) : '-';
    document.getElementById('days-2h').textContent =
        completion.days_2h_per_day ? formatDaysToYearMonthDay(completion.days_2h_per_day) : '-';
    document.getElementById('days-3h').textContent =
        completion.days_3h_per_day ? formatDaysToYearMonthDay(completion.days_3h_per_day) : '-';
    document.getElementById('days-5h').textContent =
        completion.days_5h_per_day ? formatDaysToYearMonthDay(completion.days_5h_per_day) : '-';
}

// 강의 목록 렌더링 (테이블 형식)
function renderCourses(courses) {
    if (!courses || courses.length === 0) {
        currentCourses = [];
        filteredCourses = [];
        renderTable();
        return;
    }

    // 현재 강의 목록 저장
    currentCourses = courses;

    // 필터 및 정렬 적용
    applyFiltersAndSort();
}

// 필터 및 정렬 적용
function applyFiltersAndSort() {
    // 검색 필터 적용
    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredCourses = currentCourses.filter(course => {
            // 강의명 검색
            if ((course.course_title || '').toLowerCase().includes(query)) {
                return true;
            }

            // 강의 목차(lectures) 검색
            if (course.lectures && Array.isArray(course.lectures)) {
                return course.lectures.some(lecture =>
                    (lecture.section_title || '').toLowerCase().includes(query) ||
                    (lecture.lecture_title || '').toLowerCase().includes(query)
                );
            }

            return false;
        });
    } else {
        filteredCourses = [...currentCourses];
    }

    // 정렬 적용
    sortCourses(currentSort);

    // 첫 페이지로 이동
    currentPage = 1;

    // 테이블 렌더링
    renderTable();
}

// 정렬
function sortCourses(sortType) {
    filteredCourses.sort((a, b) => {
        let aVal, bVal;

        // 정렬 기준 파싱
        if (sortType === 'title_asc' || sortType === 'title_desc') {
            aVal = (a.course_title || '').toLowerCase();
            bVal = (b.course_title || '').toLowerCase();
            return sortType === 'title_asc'
                ? (aVal > bVal ? 1 : aVal < bVal ? -1 : 0)
                : (aVal < bVal ? 1 : aVal > bVal ? -1 : 0);
        } else if (sortType === 'progress_rate_asc' || sortType === 'progress_rate_desc') {
            aVal = a.progress_rate || 0;
            bVal = b.progress_rate || 0;
            return sortType === 'progress_rate_asc' ? aVal - bVal : bVal - aVal;
        } else if (sortType === 'remaining_time_asc' || sortType === 'remaining_time_desc') {
            aVal = a.remaining_time || 0;
            bVal = b.remaining_time || 0;
            return sortType === 'remaining_time_asc' ? aVal - bVal : bVal - aVal;
        } else if (sortType === 'updated_at_desc') {
            aVal = new Date(a.updated_at || 0);
            bVal = new Date(b.updated_at || 0);
            return bVal - aVal;
        }

        return 0;
    });
}

// 테이블 렌더링
function renderTable() {
    const tbody = document.getElementById('courses-table-body');
    tbody.innerHTML = '';

    if (filteredCourses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">강의 데이터가 없습니다.</td></tr>';
        renderPagination();
        return;
    }

    // 페이지네이션 계산
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageCourses = filteredCourses.slice(start, end);

    // 테이블 행 생성
    pageCourses.forEach((course, index) => {
        const rowNum = start + index + 1;
        const progressPercent = course.progress_rate || 0;
        const studyTime = formatMinutesToTime(course.study_time || 0);
        const totalTime = formatMinutesToTime(course.total_lecture_time || 0);
        const remainingTime = formatMinutesToTime(course.remaining_time || 0);
        const isManuallyCompleted = course.is_manually_completed || false;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${rowNum}</td>
            <td class="checkbox-cell">
                <input
                    type="checkbox"
                    class="table-checkbox"
                    ${isManuallyCompleted ? 'checked' : ''}
                    onchange="toggleManuallyCompleted(${course.course_id}, this.checked)"
                    onclick="event.stopPropagation()"
                />
            </td>
            <td class="course-title-cell" onclick="openCourseModal(${course.course_id})">
                ${course.course_title || 'Unknown Title'}
            </td>
            <td>
                <div class="progress-cell">
                    <div class="progress-mini-bar">
                        <div class="progress-mini-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <span class="progress-percent">${progressPercent}%</span>
                </div>
            </td>
            <td class="time-value">${studyTime}</td>
            <td class="time-value">${totalTime}</td>
            <td class="time-value">${remainingTime}</td>
            <td>
                <button class="detail-btn" onclick="openCourseModal(${course.course_id})">
                    상세보기
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });

    // 페이지네이션 렌더링
    renderPagination();
}

// 페이지네이션 렌더링
function renderPagination() {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '';

    // 이전 버튼
    html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">‹</button>`;

    // 페이지 번호
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (startPage > 1) {
        html += `<button class="page-btn" onclick="changePage(1)">1</button>`;
        if (startPage > 2) {
            html += `<span class="page-info">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="page-info">...</span>`;
        }
        html += `<button class="page-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
    }

    // 다음 버튼
    html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">›</button>`;

    pagination.innerHTML = html;
}

// 페이지 변경
function changePage(page) {
    currentPage = page;
    renderTable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 검색 처리
function handleSearch() {
    searchQuery = document.getElementById('search-input').value;
    applyFiltersAndSort();
}

// 정렬 처리
function handleSort() {
    currentSort = document.getElementById('sort-select').value;
    applyFiltersAndSort();
}

// 페이지당 항목 수 변경
function handlePerPageChange() {
    itemsPerPage = parseInt(document.getElementById('per-page-select').value);
    currentPage = 1;
    renderTable();
}

// 강의 카드 생성
function createCourseCard(course) {
    const card = document.createElement('div');
    card.className = 'course-card';
    card.onclick = () => openCourseModal(course.course_id);

    const progressPercent = course.progress_rate || 0;
    const studyTime = formatMinutesToTime(course.study_time || 0);
    const totalTime = formatMinutesToTime(course.total_lecture_time || 0);
    const remainingTime = formatMinutesToTime(course.remaining_time || 0);

    const isManuallyCompleted = course.is_manually_completed || false;

    card.innerHTML = `
        <div class="course-header">
            <div class="course-title">${course.course_title || 'Unknown Title'}</div>
            <div class="manual-complete-wrapper">
                <label class="manual-complete-label" onclick="event.stopPropagation();">
                    <input
                        type="checkbox"
                        class="manual-complete-checkbox"
                        ${isManuallyCompleted ? 'checked' : ''}
                        onchange="toggleManuallyCompleted(${course.course_id}, this.checked)"
                    />
                    <span class="checkbox-text">크롤링 제외</span>
                </label>
            </div>
        </div>
        <div class="course-progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
            <div class="progress-text">${progressPercent}% 완료</div>
        </div>
        <div class="course-stats">
            <div class="course-stat-item">
                <span class="course-stat-label">수강시간</span>
                <span class="course-stat-value">${studyTime}</span>
            </div>
            <div class="course-stat-item">
                <span class="course-stat-label">전체시간</span>
                <span class="course-stat-value">${totalTime}</span>
            </div>
            <div class="course-stat-item">
                <span class="course-stat-label">남은시간</span>
                <span class="course-stat-value">${remainingTime}</span>
            </div>
        </div>
    `;

    return card;
}

// 모달 열기
async function openCourseModal(courseId) {
    try {
        showLoading('강의 상세 정보를 불러오는 중...');
        const course = await fetch(`${API_BASE}/api/courses/${courseId}`).then(res => res.json());

        // 기본 정보
        document.getElementById('modal-title').textContent = course.course_title;
        document.getElementById('modal-progress').textContent = course.progress_rate || 0;
        document.getElementById('modal-study-time').textContent =
            formatMinutesToTime(course.study_time || 0);
        document.getElementById('modal-total-time').textContent =
            formatMinutesToTime(course.total_lecture_time || 0);
        document.getElementById('modal-link').href = course.url;

        // 커리큘럼 통계 계산
        const lectures = course.lectures || [];
        const uniqueSections = new Set(lectures.map(l => l.section_number)).size;
        const totalLectures = lectures.length;
        const completedLectures = lectures.filter(l => l.is_completed).length;
        const lectureCompletionRate = totalLectures > 0
            ? ((completedLectures / totalLectures) * 100).toFixed(1)
            : 0;
        const remainingTime = course.remaining_time || 0;

        // 커리큘럼 통계 표시
        document.getElementById('modal-total-sections').textContent = uniqueSections;
        document.getElementById('modal-total-lectures').textContent = totalLectures;
        document.getElementById('modal-completed-lectures').textContent =
            `${completedLectures} / ${totalLectures}`;
        document.getElementById('modal-lecture-completion').textContent = `${lectureCompletionRate}%`;
        document.getElementById('modal-remaining-time').textContent =
            formatMinutesToTime(remainingTime);

        // 강의 목차 렌더링
        renderLectures(lectures);

        // 모달 표시
        document.getElementById('course-modal').style.display = 'block';

    } catch (error) {
        console.error('강의 상세 정보 로드 실패:', error);
        alert('강의 정보를 불러오는데 실패했습니다.');
    } finally {
        hideLoading();
    }
}

// 강의 목차 렌더링
function renderLectures(lectures) {
    const container = document.getElementById('modal-lectures');
    container.innerHTML = '';

    if (!lectures || lectures.length === 0) {
        container.innerHTML = '<p>강의 목차가 없습니다.</p>';
        return;
    }

    // 제목 추가
    const listTitle = document.createElement('h3');
    listTitle.textContent = '📋 강의 목차';
    listTitle.style.marginBottom = '15px';
    listTitle.style.color = '#333';
    container.appendChild(listTitle);

    // 섹션별로 그룹화
    const sections = {};
    lectures.forEach(lecture => {
        const sectionKey = `${lecture.section_number}`;
        if (!sections[sectionKey]) {
            sections[sectionKey] = {
                number: lecture.section_number,
                title: lecture.section_title,
                lectures: []
            };
        }
        sections[sectionKey].lectures.push(lecture);
    });

    // 섹션별 렌더링
    Object.keys(sections).sort((a, b) => parseInt(a) - parseInt(b)).forEach(sectionKey => {
        const section = sections[sectionKey];

        // 섹션 통계 계산
        const totalInSection = section.lectures.length;
        const completedInSection = section.lectures.filter(l => l.is_completed).length;
        const sectionProgress = totalInSection > 0
            ? ((completedInSection / totalInSection) * 100).toFixed(0)
            : 0;

        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'section-group';

        const sectionTitle = document.createElement('div');
        sectionTitle.className = 'section-title';

        const sectionTitleText = document.createElement('span');
        sectionTitleText.className = 'section-title-text';
        sectionTitleText.textContent = `섹션 ${section.number}. ${section.title}`;

        const sectionStats = document.createElement('span');
        sectionStats.className = 'section-stats';
        sectionStats.textContent = `${completedInSection}/${totalInSection} (${sectionProgress}%)`;

        sectionTitle.appendChild(sectionTitleText);
        sectionTitle.appendChild(sectionStats);
        sectionDiv.appendChild(sectionTitle);

        // 강의 목록
        section.lectures.forEach(lecture => {
            const lectureDiv = document.createElement('div');
            lectureDiv.className = 'lecture-item';
            if (lecture.is_completed) {
                lectureDiv.classList.add('completed');
            }

            // 강의 번호
            if (lecture.lecture_number) {
                const lectureNumber = document.createElement('span');
                lectureNumber.className = 'lecture-number';
                lectureNumber.textContent = `${lecture.lecture_number}.`;
                lectureDiv.appendChild(lectureNumber);
            }

            // 강의 제목
            const lectureTitle = document.createElement('span');
            lectureTitle.className = 'lecture-title';
            lectureTitle.textContent = lecture.lecture_title;
            lectureDiv.appendChild(lectureTitle);

            // 강의 시간
            const lectureTime = document.createElement('span');
            lectureTime.className = 'lecture-time';
            lectureTime.textContent = formatMinutesToTime(lecture.lecture_time || 0);
            lectureDiv.appendChild(lectureTime);

            // 완료 표시
            if (lecture.is_completed) {
                const completedBadge = document.createElement('span');
                completedBadge.className = 'lecture-completed';
                completedBadge.textContent = '✓';
                lectureDiv.appendChild(completedBadge);
            }

            sectionDiv.appendChild(lectureDiv);
        });

        container.appendChild(sectionDiv);
    });
}

// 모달 설정
function setupModal() {
    const modal = document.getElementById('course-modal');
    const closeBtn = document.querySelector('.modal-close');

    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };

    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// 일수를 년/개월/일수로 변환
function formatDaysToYearMonthDay(totalDays) {
    if (!totalDays || totalDays === 0) return '0일';

    if (totalDays < 365) {
        return `${totalDays}일`;
    }

    const years = Math.floor(totalDays / 365);
    const remainingDays = totalDays % 365;
    const months = Math.floor(remainingDays / 30);
    const days = remainingDays % 30;

    const parts = [];
    if (years > 0) parts.push(`${years}년`);
    if (months > 0) parts.push(`${months}개월`);
    if (days > 0) parts.push(`${days}일`);

    return parts.join(' ') || '0일';
}

// 분을 시간 형식으로 변환
function formatMinutesToTime(minutes) {
    if (!minutes || minutes === 0) return '0분';

    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = Math.floor(minutes % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}일`);
    if (hours > 0) parts.push(`${hours}시간`);
    if (mins > 0) parts.push(`${mins}분`);

    return parts.join(' ') || '0분';
}

// 마지막 업데이트 시간
function updateLastUpdateTime() {
    const now = new Date();
    const formatted = now.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById('last-update').textContent = formatted;
}

// 에러 표시
function showError(message) {
    const tbody = document.getElementById('courses-table-body');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="8" style="color: #ff6b6b; text-align: center; padding: 40px;">${message}</td></tr>`;
    }
}

// 수동 완료 상태 토글
async function toggleManuallyCompleted(courseId, isCompleted) {
    try {
        const response = await fetch(`${API_BASE}/api/courses/${courseId}/manually-completed`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                is_manually_completed: isCompleted
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update manually completed status');
        }

        const result = await response.json();

        // 성공 메시지 표시 (선택사항)
        console.log(result.message);

        // currentCourses 업데이트
        const courseIndex = currentCourses.findIndex(c => c.course_id === courseId);
        if (courseIndex !== -1) {
            currentCourses[courseIndex].is_manually_completed = isCompleted;
        }

    } catch (error) {
        console.error('수동 완료 상태 업데이트 실패:', error);
        alert('상태 업데이트에 실패했습니다.');
        // 체크박스 상태 되돌리기
        event.target.checked = !isCompleted;
    }
}

// 전체 선택/해제
async function bulkToggleManuallyCompleted(isCompleted) {
    if (!currentCourses || currentCourses.length === 0) {
        alert('강의 목록이 없습니다.');
        return;
    }

    const confirmMessage = isCompleted
        ? `전체 ${currentCourses.length}개 강의를 크롤링에서 제외하시겠습니까?`
        : `전체 ${currentCourses.length}개 강의를 크롤링에 포함하시겠습니까?`;

    if (!confirm(confirmMessage)) {
        return;
    }

    try {
        showLoading(`전체 강의 상태 업데이트 중... (0/${currentCourses.length})`);

        // 모든 강의에 대해 병렬로 업데이트
        const promises = currentCourses.map(course =>
            fetch(`${API_BASE}/api/courses/${course.course_id}/manually-completed`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    is_manually_completed: isCompleted
                })
            })
        );

        await Promise.all(promises);

        // 성공 메시지
        alert(`전체 강의가 크롤링 ${isCompleted ? '제외' : '포함'} 처리되었습니다.`);

        // 대시보드 새로고침
        loadDashboardData();

    } catch (error) {
        console.error('전체 업데이트 실패:', error);
        alert('일부 강의의 상태 업데이트에 실패했습니다.');
        hideLoading();
    }
}

// 새로고침 버튼 (선택 사항)
function refreshDashboard() {
    loadDashboardData();
}
