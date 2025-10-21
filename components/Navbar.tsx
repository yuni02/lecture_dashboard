'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="bg-gray-800 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 text-xl font-bold hover:text-blue-300 transition-colors">
            <Image
              src="/icons/fastcampus_logo.svg"
              alt="FastCampus Logo"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <span>FastCampus Dashboard</span>
          </Link>
          <div className="flex space-x-4">
            <Link
              href="/"
              className={`px-3 py-2 rounded-md transition-colors ${
                isActive('/')
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-700'
              }`}
            >
              대시보드
            </Link>
            <Link
              href="/courses"
              className={`px-3 py-2 rounded-md transition-colors ${
                isActive('/courses')
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-700'
              }`}
            >
              강의 목록
            </Link>
            <Link
              href="/progress"
              className={`px-3 py-2 rounded-md transition-colors ${
                isActive('/progress')
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-700'
              }`}
            >
              진척률 통계
            </Link>
            <Link
              href="/target"
              className={`px-3 py-2 rounded-md transition-colors ${
                isActive('/target')
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-700'
              }`}
            >
              완강 목표
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
