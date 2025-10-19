// API Base URL
const API_BASE = '';

// 페이지 로드 시 데이터 가져오기
document.addEventListener('DOMContentLoaded', () => {
    loadTargetCourse();
    loadCourseList();
    setupFormHandler();
});

// 목표 강의 데이터 로드
async function loadTargetCourse() {
    try {
        showLoading('목표 강의 정보를 불러오는 중...');

        const targetData = await fetch(`${API_BASE}/api/courses/target`).then(res => res.json());

        if (!targetData.has_target || !targetData.target_course) {
            // 목표 강의 없음
            document.getElementById('no-target-section').style.display = 'block';
            document.getElementById('target-course-section').style.display = 'none';
        } else {
            // 목표 강의 있음
            document.getElementById('no-target-section').style.display = 'none';
            document.getElementById('target-course-section').style.display = 'block';
            renderTargetCourse(targetData.target_course);
        }

        updateLastUpdateTime();

    } catch (error) {
        console.error('데이터 로드 실패:', error);
        alert('데이터를 불러오는데 실패했습니다.');
    } finally {
        hideLoading();
    }
}

// 목표 강의 렌더링
function renderTargetCourse(course) {
    // 제목
    document.getElementById('target-course-title').textContent = course.course_title || '-';
    document.getElementById('target-course-link').href = course.url || '#';

    // 진도율
    const progressRate = course.progress_rate || 0;
    document.getElementById('target-progress-text').textContent = `${progressRate}%`;
    document.getElementById('target-progress-bar').style.width = `${progressRate}%`;

    // 날짜
    document.getElementById('target-start-date').textContent = formatDate(course.target_start_date);
    document.getElementById('target-completion-date').textContent = formatDate(course.target_completion_date);

    // 시간
    document.getElementById('target-study-time').textContent = formatMinutesToTime(course.study_time || 0);
    document.getElementById('target-remaining-time').textContent = formatMinutesToTime(course.remaining_time || 0);

    // 일일 목표
    document.getElementById('target-daily-minutes').textContent = formatMinutesToTime(course.target_daily_minutes || 0);

    // 남은 일수 계산
    if (course.target_start_date && course.target_completion_date) {
        const today = new Date();
        const completionDate = new Date(course.target_completion_date);
        const startDate = new Date(course.target_start_date);

        const totalDays = Math.ceil((completionDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        const remainingDays = Math.ceil((completionDate - today) / (1000 * 60 * 60 * 24));

        let daysInfoText = '';
        if (remainingDays > 0) {
            daysInfoText = `전체 ${totalDays}일 중 ${remainingDays}일 남음`;
        } else if (remainingDays === 0) {
            daysInfoText = '오늘이 목표 완료일입니다!';
        } else {
            daysInfoText = `목표일이 ${Math.abs(remainingDays)}일 지났습니다`;
        }

        document.getElementById('target-days-info').textContent = daysInfoText;
    }
}

// 목표 강의 해제
async function clearTargetCourse() {
    if (!confirm('목표 강의를 해제하시겠습니까?')) {
        return;
    }

    try {
        showLoading('목표 해제 중...');

        // 현재 목표 강의 ID 가져오기
        const targetData = await fetch(`${API_BASE}/api/courses/target`).then(res => res.json());

        if (!targetData.has_target) {
            alert('설정된 목표 강의가 없습니다.');
            return;
        }

        const courseId = targetData.target_course.course_id;

        const response = await fetch(`${API_BASE}/api/courses/${courseId}/clear-target`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to clear target course');
        }

        const result = await response.json();
        alert(result.message);

        // 페이지 새로고침
        loadTargetCourse();

    } catch (error) {
        console.error('목표 해제 실패:', error);
        alert('목표 해제에 실패했습니다.');
    } finally {
        hideLoading();
    }
}

// 날짜 포맷
function formatDate(dateString) {
    if (!dateString) return '-';

    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
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

// 강의 목록 로드 (드롭다운용)
async function loadCourseList() {
    try {
        const courses = await fetch(`${API_BASE}/api/courses`).then(res => res.json());

        const courseSelect = document.getElementById('course-select');
        if (!courseSelect) return;

        // 기존 옵션 제거 (첫 번째 placeholder 제외)
        courseSelect.innerHTML = '<option value="">강의를 선택하세요</option>';

        // 진도율 기준으로 정렬 (미완료 강의 우선, 진도율 높은 순)
        const sortedCourses = courses
            .filter(course => course.progress_rate < 100) // 완료되지 않은 강의만
            .sort((a, b) => b.progress_rate - a.progress_rate);

        // 옵션 추가
        sortedCourses.forEach(course => {
            const option = document.createElement('option');
            option.value = course.course_id;
            option.textContent = `${course.course_title} (진도율: ${course.progress_rate}%)`;
            courseSelect.appendChild(option);
        });

    } catch (error) {
        console.error('강의 목록 로드 실패:', error);
    }
}

// 폼 제출 핸들러 설정
function setupFormHandler() {
    const form = document.getElementById('target-setup-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const courseId = document.getElementById('course-select').value;
        const startDate = document.getElementById('start-date-input').value;
        const completionDate = document.getElementById('completion-date-input').value;

        if (!courseId || !startDate || !completionDate) {
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
            showLoading('목표 설정 중...');

            const response = await fetch(`${API_BASE}/api/courses/${courseId}/set-target`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    target_start_date: startDate,
                    target_completion_date: completionDate
                })
            });

            if (!response.ok) {
                throw new Error('목표 설정 실패');
            }

            const result = await response.json();

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

            // 페이지 새로고침
            loadTargetCourse();

        } catch (error) {
            console.error('목표 설정 실패:', error);
            alert('목표 설정에 실패했습니다.');
        } finally {
            hideLoading();
        }
    });
}
