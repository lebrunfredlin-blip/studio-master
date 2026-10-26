import React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export interface ToastState {
  show: boolean;
  type: 'success' | 'error' | 'warn' | 'info';
  message: string;
}

interface ToastProps {
  toast: ToastState;
}

export const Toast: React.FC<ToastProps> = ({ toast }) => {
  if (!toast.show) return null;

  const borderColor =
    toast.type === 'success'
      ? 'border-l-[#4a9d6a]'
      : toast.type === 'error'
      ? 'border-l-[#c85a4a]'
      : toast.type === 'warn'
      ? 'border-l-[#d4a017]'
      : 'border-l-[#e5c15a]';

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a28] text-[#e8e6e0] border border-[#2a2a3a] ${borderColor} border-l-4 px-4 py-2.5 rounded-md shadow-2xl text-xs font-mono-custom flex items-center gap-2 max-w-md w-[90vw] animate-in fade-in slide-in-from-top-4 duration-300`}
    >
      {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#4a9d6a] shrink-0" />}
      {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-[#c85a4a] shrink-0" />}
      {toast.type === 'warn' && <AlertCircle className="w-4 h-4 text-[#d4a017] shrink-0" />}
      {toast.type === 'info' && <Info className="w-4 h-4 text-[#e5c15a] shrink-0" />}
      <span className="truncate">{toast.message}</span>
    </div>
  );
};
