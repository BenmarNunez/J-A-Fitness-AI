import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

const PWAInstallBanner = () => {
  const { canInstall, installApp } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (canInstall) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [canInstall]);

  if (!isVisible || !canInstall) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-md mx-auto bg-[#0a0a0a] border border-[#16a34a] text-white p-4 rounded-t-xl shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#16a34a] rounded-lg flex items-center justify-center font-bold">
            J&A
          </div>
          <div className="flex-1">
            <p className="font-medium">Install J&A Fitness AI on your device!</p>
            <p className="text-xs text-gray-400">Get faster access and offline support</p>
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={() => setIsVisible(false)}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Maybe Later
          </button>
          <button
            onClick={async () => {
              const success = await installApp();
              if (success) setIsVisible(false);
            }}
            className="px-4 py-1.5 text-sm bg-[#16a34a] hover:bg-green-600 text-white rounded-md font-medium transition-colors"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallBanner;
