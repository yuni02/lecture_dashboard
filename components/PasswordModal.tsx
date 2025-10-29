'use client';

import { useState, useEffect } from 'react';

interface PasswordModalProps {
  onConfirm: (password: string) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export default function PasswordModal({ onConfirm, onCancel, isOpen }: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [rememberPassword, setRememberPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      // 저장된 비밀번호가 있으면 자동으로 채우기
      const savedPassword = sessionStorage.getItem('admin_password');
      if (savedPassword) {
        setPassword(savedPassword);
        setRememberPassword(true);
      }
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      alert('비밀번호를 입력해주세요.');
      return;
    }

    // 비밀번호 저장 옵션 처리
    if (rememberPassword) {
      sessionStorage.setItem('admin_password', password);
    } else {
      sessionStorage.removeItem('admin_password');
    }

    onConfirm(password);
  };

  const handleCancel = () => {
    setPassword('');
    setRememberPassword(false);
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-800 mb-4">관리자 인증</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              비밀번호를 입력하세요
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="비밀번호 입력"
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberPassword}
                onChange={(e) => setRememberPassword(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">
                이 세션 동안 비밀번호 기억하기
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              (브라우저를 닫으면 자동으로 삭제됩니다)
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              확인
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
