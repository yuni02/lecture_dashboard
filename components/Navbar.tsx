'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';
import { logout, isLoggedIn } from '@/lib/auth-client';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const loggedIn = isLoggedIn();

  const isActive = (path: string) => pathname === path;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navLinks = [
    { href: '/', label: '대시보드' },
    { href: '/courses', label: '강의 목록' },
    { href: '/progress', label: '진척률 통계' },
    { href: '/target', label: '완강 목표' },
  ];

  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-gray-800 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* 로고 */}
          <Link
            href="/"
            className="flex items-center gap-2 md:gap-3 text-lg md:text-xl font-bold hover:text-blue-300 transition-colors z-20"
            onClick={handleLinkClick}
          >
            <Image
              src="/icons/fastcampus_logo.svg"
              alt="FastCampus Logo"
              width={32}
              height={32}
              className="w-7 h-7 md:w-8 md:h-8"
            />
            <span className="hidden sm:inline">FastCampus Dashboard</span>
            <span className="sm:hidden">FC Dashboard</span>
          </Link>

          {/* 데스크톱 메뉴 */}
          <div className="hidden md:flex items-center space-x-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-md transition-colors whitespace-nowrap ${
                  isActive(link.href)
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-700'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {loggedIn && (
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-md transition-colors whitespace-nowrap bg-red-600 hover:bg-red-700 text-white"
              >
                로그아웃
              </button>
            )}
          </div>

          {/* 모바일 햄버거 버튼 */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden z-20 p-2 rounded-md hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="메뉴 토글"
            aria-expanded={isMenuOpen}
          >
            <div className="w-6 h-5 flex flex-col justify-between">
              <span
                className={`block h-0.5 w-full bg-white transition-all duration-300 ${
                  isMenuOpen ? 'rotate-45 translate-y-2' : ''
                }`}
              />
              <span
                className={`block h-0.5 w-full bg-white transition-all duration-300 ${
                  isMenuOpen ? 'opacity-0' : ''
                }`}
              />
              <span
                className={`block h-0.5 w-full bg-white transition-all duration-300 ${
                  isMenuOpen ? '-rotate-45 -translate-y-2' : ''
                }`}
              />
            </div>
          </button>
        </div>

      </div>

      {/* 모바일 메뉴 오버레이 */}
      {isMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 모바일 메뉴 드롭다운 */}
      <div
        className={`md:hidden bg-gray-800 border-t border-gray-700 overflow-hidden transition-all duration-300 ease-in-out relative z-20 ${
          isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="container mx-auto px-4 py-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={handleLinkClick}
              className={`block px-4 py-3 rounded-md transition-colors ${
                isActive(link.href)
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-700'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {loggedIn && (
            <button
              onClick={() => {
                handleLogout();
                handleLinkClick();
              }}
              className="w-full text-left px-4 py-3 rounded-md transition-colors bg-red-600 hover:bg-red-700 text-white"
            >
              로그아웃
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
