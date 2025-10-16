// API Base URL
const API_BASE = '';

// 현재 활성 탭
let currentTab = 'daily';

// 페이지 로드 시
document.addEventListener('DOMContentLoaded', () => {
    loadProgressData();
    updateLastUpdateTime();
});

// 탭 전환
function switchTab(tab) {
    currentTab = tab;

    // 탭 버튼 활성화
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // 탭 컨텐츠 전환
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tab}-tab`).classList.add('active');
}

// 진척률 데이터 로드
async function loadProgressData() {
    try {
        const [dailyData, weeklyData] = await Promise.all([
            fetch(`${API_BASE}/api/stats/progress/daily`).then(res => res.json()),
            fetch(`${API_BASE}/api/stats/progress/weekly`).then(res => res.json())
        ]);

        // 일별 데이터 렌더링
        renderDailyProgress(dailyData.daily_progress || []);

        // 주별 데이터 렌더링
        renderWeeklyProgress(weeklyData.weekly_progress || []);

    } catch (error) {
        console.error('진척률 데이터 로드 실패:', error);
        showError('데이터를 불러오는데 실패했습니다.');
    }
}

// 일별 진척 렌더링
function renderDailyProgress(data) {
    if (!data || data.length === 0) {
        document.getElementById('daily-chart').innerHTML = '<p class="no-data">학습 기록이 없습니다.</p>';
        document.getElementById('daily-table').innerHTML = '<tr><td colspan="3" class="no-data">데이터가 없습니다.</td></tr>';
        document.getElementById('daily-summary').innerHTML = '';
        return;
    }

    // 요약 통계 계산
    const totalLectures = data.reduce((sum, d) => sum + d.completed_lectures, 0);
    const totalMinutes = data.reduce((sum, d) => sum + d.study_time_minutes, 0);
    const avgLecturesPerDay = (totalLectures / data.length).toFixed(1);
    const avgMinutesPerDay = (totalMinutes / data.length).toFixed(0);

    // 요약 카드 렌더링
    const summaryHTML = `
        <div class="summary-card">
            <div class="summary-value">${data.length}일</div>
            <div class="summary-label">학습한 일수</div>
        </div>
        <div class="summary-card">
            <div class="summary-value">${totalLectures}개</div>
            <div class="summary-label">완료한 강의</div>
        </div>
        <div class="summary-card">
            <div class="summary-value">${formatMinutesToTime(totalMinutes)}</div>
            <div class="summary-label">총 학습 시간</div>
        </div>
        <div class="summary-card">
            <div class="summary-value">${avgLecturesPerDay}개</div>
            <div class="summary-label">일평균 완료 강의</div>
        </div>
    `;
    document.getElementById('daily-summary').innerHTML = summaryHTML;

    // 차트 렌더링 (최근 14일)
    const chartData = data.slice(0, 14).reverse();
    const maxMinutes = Math.max(...chartData.map(d => d.study_time_minutes));

    const chartHTML = chartData.map(d => {
        const percentage = maxMinutes > 0 ? (d.study_time_minutes / maxMinutes * 100) : 0;
        return `
            <div class="bar-item">
                <div class="bar-label">${formatDate(d.date)}</div>
                <div class="bar-visual">
                    <div class="bar-fill" style="width: ${percentage}%">
                        ${formatMinutesToTime(d.study_time_minutes)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    document.getElementById('daily-chart').innerHTML = chartHTML || '<p class="no-data">데이터가 없습니다.</p>';

    // 테이블 렌더링
    const tableHTML = data.map(d => `
        <tr>
            <td>${formatDate(d.date)}</td>
            <td>${d.completed_lectures}개</td>
            <td>${formatMinutesToTime(d.study_time_minutes)}</td>
        </tr>
    `).join('');
    document.getElementById('daily-table').innerHTML = tableHTML || '<tr><td colspan="3" class="no-data">데이터가 없습니다.</td></tr>';
}

// 주별 진척 렌더링
function renderWeeklyProgress(data) {
    if (!data || data.length === 0) {
        document.getElementById('weekly-chart').innerHTML = '<p class="no-data">학습 기록이 없습니다.</p>';
        document.getElementById('weekly-table').innerHTML = '<tr><td colspan="3" class="no-data">데이터가 없습니다.</td></tr>';
        document.getElementById('weekly-summary').innerHTML = '';
        return;
    }

    // 요약 통계 계산
    const totalLectures = data.reduce((sum, d) => sum + d.completed_lectures, 0);
    const totalMinutes = data.reduce((sum, d) => sum + d.study_time_minutes, 0);
    const avgLecturesPerWeek = (totalLectures / data.length).toFixed(1);
    const avgMinutesPerWeek = (totalMinutes / data.length).toFixed(0);

    // 요약 카드 렌더링
    const summaryHTML = `
        <div class="summary-card">
            <div class="summary-value">${data.length}주</div>
            <div class="summary-label">학습한 주차</div>
        </div>
        <div class="summary-card">
            <div class="summary-value">${totalLectures}개</div>
            <div class="summary-label">완료한 강의</div>
        </div>
        <div class="summary-card">
            <div class="summary-value">${formatMinutesToTime(totalMinutes)}</div>
            <div class="summary-label">총 학습 시간</div>
        </div>
        <div class="summary-card">
            <div class="summary-value">${avgLecturesPerWeek}개</div>
            <div class="summary-label">주평균 완료 강의</div>
        </div>
    `;
    document.getElementById('weekly-summary').innerHTML = summaryHTML;

    // 차트 렌더링
    const chartData = data.slice(0, 12).reverse();
    const maxMinutes = Math.max(...chartData.map(d => d.study_time_minutes));

    const chartHTML = chartData.map(d => {
        const percentage = maxMinutes > 0 ? (d.study_time_minutes / maxMinutes * 100) : 0;
        return `
            <div class="bar-item">
                <div class="bar-label">${formatDate(d.week_start)}</div>
                <div class="bar-visual">
                    <div class="bar-fill" style="width: ${percentage}%">
                        ${formatMinutesToTime(d.study_time_minutes)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    document.getElementById('weekly-chart').innerHTML = chartHTML || '<p class="no-data">데이터가 없습니다.</p>';

    // 테이블 렌더링
    const tableHTML = data.map(d => `
        <tr>
            <td>${formatDate(d.week_start)}</td>
            <td>${d.completed_lectures}개</td>
            <td>${formatMinutesToTime(d.study_time_minutes)}</td>
        </tr>
    `).join('');
    document.getElementById('weekly-table').innerHTML = tableHTML || '<tr><td colspan="3" class="no-data">데이터가 없습니다.</td></tr>';
}

// 날짜 포맷팅
function formatDate(dateString) {
    if (!dateString) return '-';

    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[date.getDay()];

    return `${month}/${day} (${weekday})`;
}

// 분을 시간 형식으로 변환
function formatMinutesToTime(minutes) {
    if (!minutes || minutes === 0) return '0분';

    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);

    const parts = [];
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
    document.getElementById('daily-chart').innerHTML = `<p class="no-data" style="color: #ff6b6b;">${message}</p>`;
    document.getElementById('weekly-chart').innerHTML = `<p class="no-data" style="color: #ff6b6b;">${message}</p>`;
}
