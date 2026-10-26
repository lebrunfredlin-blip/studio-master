import React from 'react';
import { Loader2 } from 'lucide-react';

interface StatusBarProps {
  isVisible: boolean;
  message: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ isVisible, message }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a28] border-t border-[#2a2a3a] text-[#e8e6e0] px-4 py-2.5 text-xs font-mono-custom flex items-center gap-2.5 z-40 shadow-2xl animate-in slide-in-from-bottom duration-300">
      <Loader2 className="w-3.5 h-3.5 text-[#e5c15a] animate-spin shrink-0" />
      <span className="truncate">{message}</span>
    </div>
  );
};
