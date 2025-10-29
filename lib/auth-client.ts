/**
 * 클라이언트 사이드 인증 유틸리티
 */

/**
 * sessionStorage에서 저장된 비밀번호 가져오기
 */
export function getStoredPassword(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('admin_password');
}

/**
 * sessionStorage에 비밀번호 저장
 */
export function storePassword(password: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('admin_password', password);
}

/**
 * sessionStorage에서 비밀번호 삭제
 */
export function clearStoredPassword(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('admin_password');
  sessionStorage.removeItem('user_settings');
}

/**
 * 로그인 여부 확인
 */
export function isLoggedIn(): boolean {
  return getStoredPassword() !== null;
}

/**
 * 로그아웃
 */
export function logout(): void {
  clearStoredPassword();
}

/**
 * 사용자 설정 가져오기
 */
export function getUserSettings(): { hide_completed_lectures: boolean } | null {
  if (typeof window === 'undefined') return null;
  const settings = sessionStorage.getItem('user_settings');
  if (!settings) return null;
  try {
    return JSON.parse(settings);
  } catch {
    return null;
  }
}

/**
 * 사용자 설정 저장
 */
export function storeUserSettings(settings: { hide_completed_lectures: boolean }): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('user_settings', JSON.stringify(settings));
}

/**
 * 인증이 필요한 API 호출 래퍼
 * 401 에러 시 자동으로 비밀번호 재입력 유도
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
  password?: string
): Promise<Response> {
  const authPassword = password || getStoredPassword();

  if (!authPassword) {
    throw new Error('PASSWORD_REQUIRED');
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${authPassword}`);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // 401 에러 시 저장된 비밀번호 삭제
  if (response.status === 401) {
    clearStoredPassword();
    throw new Error('UNAUTHORIZED');
  }

  return response;
}

/**
 * API 호출 결과 타입
 */
export type AuthenticatedFetchResult<T> =
  | { success: true; data: T }
  | { success: false; error: 'PASSWORD_REQUIRED' | 'UNAUTHORIZED' | 'NETWORK_ERROR'; details?: string };

/**
 * 인증이 필요한 API 호출 (타입 안전한 버전)
 */
export async function safeAuthenticatedFetch<T>(
  url: string,
  options: RequestInit = {},
  password?: string
): Promise<AuthenticatedFetchResult<T>> {
  try {
    const response = await authenticatedFetch(url, options, password);

    if (!response.ok) {
      return {
        success: false,
        error: 'NETWORK_ERROR',
        details: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'PASSWORD_REQUIRED') {
        return { success: false, error: 'PASSWORD_REQUIRED' };
      }
      if (error.message === 'UNAUTHORIZED') {
        return { success: false, error: 'UNAUTHORIZED' };
      }
    }
    return {
      success: false,
      error: 'NETWORK_ERROR',
      details: String(error),
    };
  }
}
