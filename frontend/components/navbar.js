/**
 * 공통 네비게이션 바 컴포넌트
 */

function renderNavbar(activePage = '') {
    return `
    <nav class="navbar">
        <div class="navbar-brand">
            <h1>🎓 FastCampus Dashboard</h1>
        </div>
        <ul class="navbar-menu">
            <li><a href="/" class="${activePage === 'dashboard' ? 'active' : ''}">대시보드</a></li>
            <li><a href="/courses" class="${activePage === 'courses' ? 'active' : ''}">강의 목록</a></li>
            <li><a href="/target" class="${activePage === 'target' ? 'active' : ''}">목표 강의</a></li>
            <li><a href="/progress" class="${activePage === 'progress' ? 'active' : ''}">진척률 통계</a></li>
        </ul>
    </nav>
    `;
}

// 네비게이션 바를 페이지에 삽입
function initNavbar(activePage = '') {
    const navbarContainer = document.getElementById('navbar-container');
    if (navbarContainer) {
        navbarContainer.innerHTML = renderNavbar(activePage);
    }
}

// 페이지 로드 시 자동 초기화 (data-page 속성 사용)
document.addEventListener('DOMContentLoaded', () => {
    const navbarContainer = document.getElementById('navbar-container');
    if (navbarContainer) {
        const activePage = navbarContainer.getAttribute('data-page') || '';
        initNavbar(activePage);
    }
});
