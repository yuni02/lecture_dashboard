'use client';

import React from 'react';

interface PriorityBadgeProps {
  priority?: number;
  size?: 'sm' | 'md' | 'lg';
}

const PRIORITY_CONFIG: Record<number, { label: string; color: string; stars: string }> = {
  5: { label: '최우선', color: 'bg-red-500 text-white', stars: '⭐⭐⭐⭐⭐' },
  4: { label: '높음', color: 'bg-orange-500 text-white', stars: '⭐⭐⭐⭐' },
  3: { label: '중간', color: 'bg-yellow-500 text-white', stars: '⭐⭐⭐' },
  2: { label: '낮음', color: 'bg-green-500 text-white', stars: '⭐⭐' },
  1: { label: '매우 낮음', color: 'bg-gray-400 text-white', stars: '⭐' },
  0: { label: '미설정', color: 'bg-gray-200 text-gray-600', stars: '' },
};

export default function PriorityBadge({ priority = 0, size = 'md' }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG[0];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  if (priority === 0) {
    return null; // 우선순위가 설정되지 않았으면 표시하지 않음
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${config.color} ${sizeClasses[size]}`}
      title={`우선순위: ${config.label}`}
    >
      <span>{config.stars}</span>
      <span>{config.label}</span>
    </span>
  );
}
