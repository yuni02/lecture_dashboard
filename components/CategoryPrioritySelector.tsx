'use client';

import React from 'react';

interface CategoryPrioritySelectorProps {
  categoryDepth1?: string;
  categoryDepth2?: string;
  categoryDepth3?: string;
  priority?: number;
  onCategoryDepth1Change: (value: string) => void;
  onCategoryDepth2Change: (value: string) => void;
  onCategoryDepth3Change: (value: string) => void;
  onPriorityChange: (value: number) => void;
}

const CATEGORY_DEPTH1_OPTIONS = ['개발', '개발 외'];
const CATEGORY_DEPTH2_OPTIONS: Record<string, string[]> = {
  '개발': ['프론트엔드', '백엔드', 'DevOps'],
  '개발 외': [],
};

// 프론트엔드, 백엔드, DevOps별 언어 옵션
const CATEGORY_DEPTH3_OPTIONS: Record<string, string[]> = {
  '프론트엔드': ['React', 'Vue', 'Angular', 'Next.js', 'JavaScript', 'TypeScript', 'HTML/CSS'],
  '백엔드': ['Spring', 'Node.js', 'Python', 'Django', 'FastAPI', 'Java', 'Go', 'Ruby'],
  'DevOps': ['Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'CI/CD', 'Terraform'],
};

export default function CategoryPrioritySelector({
  categoryDepth1,
  categoryDepth2,
  categoryDepth3,
  priority = 0,
  onCategoryDepth1Change,
  onCategoryDepth2Change,
  onCategoryDepth3Change,
  onPriorityChange,
}: CategoryPrioritySelectorProps) {
  const handleDepth1Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    onCategoryDepth1Change(newValue);
    // depth1이 변경되면 depth2, depth3 초기화
    onCategoryDepth2Change('');
    onCategoryDepth3Change('');
  };

  const handleDepth2Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    onCategoryDepth2Change(newValue);
    // depth2가 변경되면 depth3 초기화
    onCategoryDepth3Change('');
  };

  const handleDepth3Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onCategoryDepth3Change(e.target.value);
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onPriorityChange(Number(e.target.value));
  };

  const availableDepth2Options = categoryDepth1 ? CATEGORY_DEPTH2_OPTIONS[categoryDepth1] || [] : [];
  const availableDepth3Options = categoryDepth2 ? CATEGORY_DEPTH3_OPTIONS[categoryDepth2] || [] : [];

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* 대분류 */}
      <select
        value={categoryDepth1 || ''}
        onChange={handleDepth1Change}
        className="text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">대분류 선택</option>
        {CATEGORY_DEPTH1_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      {/* 중분류 */}
      {categoryDepth1 === '개발' && (
        <select
          value={categoryDepth2 || ''}
          onChange={handleDepth2Change}
          className="text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">중분류 선택</option>
          {availableDepth2Options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}

      {/* 소분류 */}
      {categoryDepth2 && availableDepth3Options.length > 0 && (
        <select
          value={categoryDepth3 || ''}
          onChange={handleDepth3Change}
          className="text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">소분류 선택</option>
          {availableDepth3Options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}

      {/* 우선순위 */}
      <select
        value={priority}
        onChange={handlePriorityChange}
        className="text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value={0}>우선순위 없음</option>
        <option value={5}>⭐⭐⭐⭐⭐ 최우선</option>
        <option value={4}>⭐⭐⭐⭐ 높음</option>
        <option value={3}>⭐⭐⭐ 중간</option>
        <option value={2}>⭐⭐ 낮음</option>
        <option value={1}>⭐ 매우 낮음</option>
      </select>
    </div>
  );
}
