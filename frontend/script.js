// API Base URL
const API_BASE = '';

// 페이지 로드 시 데이터 가져오기
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
    setupModal();
});

// 대시보드 데이터 로드
async function loadDashboardData() {
    try {
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
        completion.days_1h_per_day ? `${completion.days_1h_per_day}일` : '-';
    document.getElementById('days-2h').textContent =
        completion.days_2h_per_day ? `${completion.days_2h_per_day}일` : '-';
    document.getElementById('days-3h').textContent =
        completion.days_3h_per_day ? `${completion.days_3h_per_day}일` : '-';
    document.getElementById('days-5h').textContent =
        completion.days_5h_per_day ? `${completion.days_5h_per_day}일` : '-';
}

// 강의 목록 렌더링
function renderCourses(courses) {
    const container = document.getElementById('courses-container');
    container.innerHTML = '';

    if (!courses || courses.length === 0) {
        container.innerHTML = '<p class="loading">강의 데이터가 없습니다.</p>';
        return;
    }

    courses.forEach(course => {
        const courseCard = createCourseCard(course);
        container.appendChild(courseCard);
    });
}

// 강의 카드 생성
function createCourseCard(course) {
    const card = document.createElement('div');
    card.className = 'course-card';
    card.onclick = () => openCourseModal(course.course_id);

    const progressPercent = course.progress_rate || 0;
    const studyTime = formatMinutesToTime(course.study_time || 0);
    const totalTime = formatMinutesToTime(course.total_lecture_time || 0);
    const remainingTime = formatMinutesToTime(
        (course.total_lecture_time || 0) - (course.study_time || 0)
    );

    card.innerHTML = `
        <div class="course-title">${course.course_title || 'Unknown Title'}</div>
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
        const course = await fetch(`${API_BASE}/api/courses/${courseId}`).then(res => res.json());

        document.getElementById('modal-title').textContent = course.course_title;
        document.getElementById('modal-progress').textContent = course.progress_rate || 0;
        document.getElementById('modal-study-time').textContent =
            formatMinutesToTime(course.study_time || 0);
        document.getElementById('modal-total-time').textContent =
            formatMinutesToTime(course.total_lecture_time || 0);
        document.getElementById('modal-link').href = course.url;

        // 강의 목차 렌더링
        renderLectures(course.lectures || []);

        // 모달 표시
        document.getElementById('course-modal').style.display = 'block';

    } catch (error) {
        console.error('강의 상세 정보 로드 실패:', error);
        alert('강의 정보를 불러오는데 실패했습니다.');
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

    // 섹션별로 그룹화
    const sections = {};
    lectures.forEach(lecture => {
        const sectionKey = `${lecture.section_number}`;
        if (!sections[sectionKey]) {
            sections[sectionKey] = {
                title: lecture.section_title,
                lectures: []
            };
        }
        sections[sectionKey].lectures.push(lecture);
    });

    // 섹션별 렌더링
    Object.keys(sections).sort((a, b) => parseInt(a) - parseInt(b)).forEach(sectionKey => {
        const section = sections[sectionKey];

        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'section-group';

        const sectionTitle = document.createElement('div');
        sectionTitle.className = 'section-title';
        sectionTitle.textContent = section.title;
        sectionDiv.appendChild(sectionTitle);

        section.lectures.forEach(lecture => {
            const lectureDiv = document.createElement('div');
            lectureDiv.className = 'lecture-item';
            if (lecture.is_completed) {
                lectureDiv.classList.add('completed');
            }

            const lectureTitle = document.createElement('span');
            lectureTitle.className = 'lecture-title';
            lectureTitle.textContent = lecture.lecture_title;

            const lectureTime = document.createElement('span');
            lectureTime.className = 'lecture-time';
            lectureTime.textContent = formatMinutesToTime(lecture.lecture_time || 0);

            lectureDiv.appendChild(lectureTitle);
            lectureDiv.appendChild(lectureTime);

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
    const container = document.getElementById('courses-container');
    container.innerHTML = `<p class="loading" style="color: #ff6b6b;">${message}</p>`;
}

// 새로고침 버튼 (선택 사항)
function refreshDashboard() {
    loadDashboardData();
}
