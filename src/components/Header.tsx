import React from 'react';
import { Film, Sparkles, Key, CheckCircle2, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  activeWorkersCount: number;
  hasGemini: boolean;
  totalModesCount: number;
  onOpenKeys: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeWorkersCount,
  hasGemini,
  totalModesCount,
  onOpenKeys
}) => {
  return (
    <header className="relative text-center py-6 pb-8 border-b border-[#2a2a3a] mb-6">
      {/* Top Tag */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-semibold tracking-widest uppercase bg-[#e5c15a]/10 text-[#e5c15a] border border-[#e5c15a]/40 font-mono-custom">
          <Film className="w-3 h-3 text-[#e5c15a]" />
          STUDIO MASTER · {totalModesCount} MODES
        </span>
      </div>

      {/* Main App Title: WG clip */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight gold-gradient-text font-title-custom">
        WG clip
      </h1>

      <p className="text-xs sm:text-sm text-[#8a8896] italic mt-1.5 max-w-2xl mx-auto px-4 leading-relaxed">
        Studio de création vidéo IA unifié · TikTok · Films · Séries · Wes Anderson · Pool multi-clés · Parser 5-stratégies · Player Canvas · TTS FR
      </p>

      {/* System Status Badges */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-[11px] font-mono-custom">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#12121c] border border-[#2a2a3a] text-[#8a8896]">
          <span className="w-2 h-2 rounded-full bg-[#4a9d6a] shadow-[0_0_8px_#4a9d6a]"></span>
          <span>Gemini AI :</span>
          <span className="text-[#4a9d6a] font-semibold">{hasGemini ? 'Prêt' : 'Prêt (Serveur)'}</span>
        </div>

        <button
          onClick={onOpenKeys}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#12121c] border border-[#2a2a3a] hover:border-[#e5c15a] text-[#8a8896] hover:text-[#e8e6e0] transition-colors cursor-pointer"
        >
          <Key className="w-3 h-3 text-[#e5c15a]" />
          <span>Pool Agnes :</span>
          <span className={activeWorkersCount > 0 ? "text-[#e5c15a] font-semibold" : "text-[#8a8896]"}>
            {activeWorkersCount} worker{activeWorkersCount > 1 ? 's' : ''}
          </span>
        </button>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#12121c] border border-[#2a2a3a] text-[#8a8896]">
          <ShieldCheck className="w-3 h-3 text-[#8b5fc4]" />
          <span>Anti-fuite & 5 Stratégies :</span>
          <span className="text-[#8b5fc4] font-semibold">Actif</span>
        </div>
      </div>

      {/* Aesthetic bottom divider line */}
      <div className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-[#e5c15a] to-transparent opacity-60"></div>
    </header>
  );
};
