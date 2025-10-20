/**
 * 공통 로딩바 컴포넌트
 * 페이지 로드 시 자동으로 로딩바 HTML을 body에 추가
 */

// 로딩바 HTML 생성 및 추가
function initLoadingBar() {
    const loadingHTML = `
        <div id="global-loading" class="loading-overlay" style="display: none;">
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p class="loading-text">로딩 중...</p>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', loadingHTML);
}

// 로딩바 표시
function showLoading(message = '로딩 중...') {
    const loadingOverlay = document.getElementById('global-loading');
    const loadingText = loadingOverlay.querySelector('.loading-text');

    if (loadingText) {
        loadingText.textContent = message;
    }

    loadingOverlay.style.display = 'flex';
}

// 로딩바 숨기기
function hideLoading() {
    const loadingOverlay = document.getElementById('global-loading');
    loadingOverlay.style.display = 'none';
}

// 페이지 로드 시 로딩바 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoadingBar);
} else {
    initLoadingBar();
}

// 전역 함수로 노출
window.showLoading = showLoading;
window.hideLoading = hideLoading;
