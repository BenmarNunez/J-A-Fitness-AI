import React from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

const PWAInstallButton = () => {
  const { canInstall, installApp } = usePWAInstall();

  if (!canInstall) return null;

  return (
    <button
      onClick={async () => {
        await installApp();
      }}
      className="flex items-center gap-2 px-3 py-1.5 bg-[#16a34a] hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
    >
      <svg
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <span>Install App</span>
    </button>
  );
};

export default PWAInstallButton;
