'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isLoggedIn } from '@/lib/auth-client';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // 로그인 페이지는 체크하지 않음
    if (pathname === '/login') {
      return;
    }

    // 로그인 상태 확인
    if (!isLoggedIn()) {
      router.push('/login');
    }
  }, [pathname, router]);

  // 서버 렌더링 중이거나 마운트 전에는 항상 children 렌더링 (Hydration 에러 방지)
  if (!mounted || pathname === '/login') {
    return <>{children}</>;
  }

  // 클라이언트에서 로그인 상태 확인 후 렌더링
  if (isLoggedIn()) {
    return <>{children}</>;
  }

  // 로그인 안 된 상태에서는 아무것도 렌더링하지 않음 (리다이렉트 중)
  return null;
}
