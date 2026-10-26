import React, { useRef, useEffect, useState } from 'react';
import { Terminal, Copy, Trash2, Check, ChevronDown, ChevronUp } from 'lucide-react';

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'warn' | 'success' | 'error' | 'api' | 'ai';
  message: string;
}

interface ConsoleLogsProps {
  logs: LogEntry[];
  onClear: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const ConsoleLogs: React.FC<ConsoleLogsProps> = ({ logs, onClear, isOpen, onToggle }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCopy = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTagColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'info':
        return 'text-[#e5c15a]';
      case 'success':
        return 'text-[#4a9d6a]';
      case 'warn':
        return 'text-[#d4a017]';
      case 'error':
        return 'text-[#c85a4a]';
      case 'api':
        return 'text-[#e87b35]';
      case 'ai':
        return 'text-[#8b5fc4]';
      default:
        return 'text-[#8a8896]';
    }
  };

  return (
    <div className="bg-[#16161f] border border-[#2a2a3a] rounded-lg mb-5 overflow-hidden shadow-lg transition-all">
      {/* Header Accordion */}
      <div
        onClick={onToggle}
        className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-[#1a1a28]/60 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Terminal className="w-4 h-4 text-[#e5c15a]" />
          <span className="text-xs uppercase tracking-widest font-semibold text-[#e8e6e0]">
            Console d'Exécution
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono-custom font-semibold bg-[#12121c] text-[#8a8896] border border-[#2a2a3a]">
            {logs.length} logs
          </span>
        </div>
        <div className="text-[#8a8896]">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Body */}
      {isOpen && (
        <div className="p-4 pt-1 border-t border-[#2a2a3a]/60">
          <div
            ref={containerRef}
            className="p-3 rounded-md bg-[#05050a] border border-[#2a2a3a] max-h-56 overflow-y-auto font-mono-custom text-xs text-[#c8c8d0] leading-relaxed space-y-1.5"
          >
            {logs.length === 0 ? (
              <div className="text-[#4a4858] italic py-2">
                En attente d'événements de génération...
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 border-b border-white/[0.03] pb-1">
                  <span className="text-[#4a4858] shrink-0 text-[10px]">{log.timestamp}</span>
                  <span className={`font-bold shrink-0 text-[11px] uppercase ${getTagColor(log.type)}`}>
                    [{log.type}]
                  </span>
                  <span className="break-all">{log.message}</span>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={onClear}
              className="px-3 py-1 rounded text-[11px] font-mono-custom bg-[#1a1a28] hover:bg-[#c85a4a]/20 border border-[#2a2a3a] hover:border-[#c85a4a] text-[#8a8896] hover:text-[#c85a4a] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" /> Effacer
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1 rounded text-[11px] font-mono-custom bg-[#1a1a28] hover:bg-[#e5c15a]/20 border border-[#2a2a3a] hover:border-[#e5c15a] text-[#8a8896] hover:text-[#e5c15a] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-[#4a9d6a]" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copié' : 'Copier logs'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
