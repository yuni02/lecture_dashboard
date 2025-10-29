'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isLoggedIn } from '@/lib/auth-client';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 로그인 페이지는 체크하지 않음
    if (pathname === '/login') {
      return;
    }

    // 로그인 상태 확인
    if (!isLoggedIn()) {
      router.push('/login');
    }
  }, [pathname, router]);

  // 로그인 페이지이거나 로그인 상태면 children 렌더링
  if (pathname === '/login' || isLoggedIn()) {
    return <>{children}</>;
  }

  // 로그인 안 된 상태에서는 아무것도 렌더링하지 않음 (리다이렉트 중)
  return null;
}
