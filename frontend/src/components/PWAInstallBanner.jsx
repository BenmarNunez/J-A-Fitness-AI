import React, { useState, useEffect } from 'react';

const PWAInstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    });

    window.addEventListener('appinstalled', () => {
      setIsVisible(false);
    });
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-md mx-auto bg-[#0a0a0a] border border-[#16a34a] text-white p-4 rounded-t-xl shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#16a34a] rounded-lg flex items-center justify-center font-bold">
            J&A
          </div>
          <div>
            <p className="font-medium">J&A Fitness AI</p>
            <p className="text-xs text-gray-400">Install app for faster access</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsVisible(false)}
            className="px-3 py-1 text-sm text-gray-400 hover:text-white"
          >
            Later
          </button>
          <button
            onClick={handleInstall}
            className="px-4 py-1 text-sm bg-[#16a34a] hover:bg-green-600 text-white rounded-md font-medium transition-colors"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallBanner;
