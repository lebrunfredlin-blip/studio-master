import React from 'react';
import { Settings, Sliders, Palette, Monitor, Clock, Volume2, ChevronDown, ChevronUp } from 'lucide-react';
import { WA_PALETTES, VISUAL_STYLES, SUBTITLE_STYLES } from '../data/catalog';

interface ParametersPanelProps {
  scenesCount: number;
  onScenesCountChange: (count: number) => void;
  durationPerScene: number;
  onDurationChange: (dur: number) => void;
  aspectRatio: '9:16' | '16:9' | '1:1' | '4:3';
  onRatioChange: (ratio: '9:16' | '16:9' | '1:1' | '4:3') => void;
  visualStyle: string;
  onStyleChange: (style: string) => void;
  selectedPalette: string;
  onPaletteChange: (pal: string) => void;
  subtitleStyle: string;
  onSubtitleStyleChange: (st: string) => void;
  enableVoice: boolean;
  onVoiceToggle: (v: boolean) => void;
  speechRate: number;
  onSpeechRateChange: (r: number) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const ParametersPanel: React.FC<ParametersPanelProps> = ({
  scenesCount,
  onScenesCountChange,
  durationPerScene,
  onDurationChange,
  aspectRatio,
  onRatioChange,
  visualStyle,
  onStyleChange,
  selectedPalette,
  onPaletteChange,
  subtitleStyle,
  onSubtitleStyleChange,
  enableVoice,
  onVoiceToggle,
  speechRate,
  onSpeechRateChange,
  isOpen,
  onToggle
}) => {
  const ratios = [
    { id: '9:16', label: '9:16 (TikTok / Reels)' },
    { id: '16:9', label: '16:9 (Cinéma / YouTube)' },
    { id: '1:1', label: '1:1 (Carré Instagram)' },
    { id: '4:3', label: '4:3 (Vintage TV)' }
  ];

  const durations = [
    { sec: 5, label: '5s / scène (Ultra rapide)' },
    { sec: 10, label: '10s / scène (Dynamique)' },
    { sec: 15, label: '15s / scène (Standard cinéma)' }
  ];

  return (
    <div className="bg-[#16161f] border border-[#2a2a3a] rounded-lg mb-5 overflow-hidden shadow-lg transition-all">
      {/* Header Accordion */}
      <div
        onClick={onToggle}
        className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-[#1a1a28]/60 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Settings className="w-4 h-4 text-[#e5c15a]" />
          <span className="text-xs uppercase tracking-widest font-semibold text-[#e8e6e0]">
            Paramètres du Studio
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono-custom font-semibold bg-[#1a1a28] text-[#8a8896] border border-[#2a2a3a]">
            {scenesCount} scènes · {scenesCount * durationPerScene}s total · {aspectRatio}
          </span>
        </div>
        <div className="text-[#8a8896]">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Body */}
      {isOpen && (
        <div className="p-4 pt-1 border-t border-[#2a2a3a]/60 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Number of Scenes */}
            <div>
              <label className="block text-[11px] font-semibold text-[#8a8896] uppercase tracking-wider mb-1.5 font-mono-custom">
                Nombre de séquences : {scenesCount}
              </label>
              <div className="grid grid-cols-6 gap-1">
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => onScenesCountChange(num)}
                    className={`py-1.5 rounded text-xs font-mono-custom font-bold border transition-colors cursor-pointer ${
                      scenesCount === num
                        ? 'bg-[#e5c15a]/20 border-[#e5c15a] text-[#e5c15a]'
                        : 'bg-[#12121c] border-[#2a2a3a] text-[#8a8896] hover:text-[#e8e6e0]'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration per Scene */}
            <div>
              <label className="block text-[11px] font-semibold text-[#8a8896] uppercase tracking-wider mb-1.5 font-mono-custom flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#e5c15a]" /> Durée par séquence
              </label>
              <div className="grid grid-cols-3 gap-1">
                {durations.map((d) => (
                  <button
                    key={d.sec}
                    type="button"
                    onClick={() => onDurationChange(d.sec)}
                    className={`py-1.5 px-2 rounded text-xs font-mono-custom font-semibold border transition-colors cursor-pointer text-center ${
                      durationPerScene === d.sec
                        ? 'bg-[#e5c15a]/20 border-[#e5c15a] text-[#e5c15a]'
                        : 'bg-[#12121c] border-[#2a2a3a] text-[#8a8896] hover:text-[#e8e6e0]'
                    }`}
                  >
                    {d.sec}s
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="block text-[11px] font-semibold text-[#8a8896] uppercase tracking-wider mb-1.5 font-mono-custom flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-[#e5c15a]" /> Format Vidéo
              </label>
              <div className="grid grid-cols-2 gap-1">
                {ratios.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onRatioChange(r.id as any)}
                    className={`py-1 px-1.5 rounded text-[11px] font-mono-custom border transition-colors cursor-pointer text-center truncate ${
                      aspectRatio === r.id
                        ? 'bg-[#e5c15a]/20 border-[#e5c15a] text-[#e5c15a]'
                        : 'bg-[#12121c] border-[#2a2a3a] text-[#8a8896] hover:text-[#e8e6e0]'
                    }`}
                  >
                    {r.id}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Visual Style Selection */}
          <div>
            <label className="block text-[11px] font-semibold text-[#8a8896] uppercase tracking-wider mb-1.5 font-mono-custom flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#e5c15a]" /> Style Visuel Réalisateur
            </label>
            <select
              value={visualStyle}
              onChange={(e) => onStyleChange(e.target.value)}
              className="w-full p-2.5 rounded bg-[#12121c] border border-[#2a2a3a] text-xs text-[#e8e6e0] focus:border-[#e5c15a] focus:outline-none"
            >
              {VISUAL_STYLES.map((st, i) => (
                <option key={i} value={st} className="bg-[#16161f]">
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Wes Anderson Color Palettes */}
          <div>
            <label className="block text-[11px] font-semibold text-[#8a8896] uppercase tracking-wider mb-2 font-mono-custom flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-[#e5c15a]" /> Palettes Chromatiques Signature
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {WA_PALETTES.map((pal) => {
                const isSelected = selectedPalette === pal.label;
                return (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => onPaletteChange(pal.label)}
                    className={`p-2 rounded border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#e5c15a]/15 border-[#e5c15a] text-[#e5c15a]'
                        : 'bg-[#12121c] border-[#2a2a3a] text-[#8a8896] hover:text-[#e8e6e0]'
                    }`}
                  >
                    <div className="flex h-4 rounded overflow-hidden mb-1.5 shadow-sm">
                      {pal.colors.map((c, idx) => (
                        <div key={idx} className="flex-1" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <span className="text-[11px] font-medium block truncate">
                      {pal.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subtitle Style & TTS Voice Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#2a2a3a]/60">
            <div>
              <label className="block text-[11px] font-semibold text-[#8a8896] uppercase tracking-wider mb-1.5 font-mono-custom">
                Style des Sous-titres
              </label>
              <select
                value={subtitleStyle}
                onChange={(e) => onSubtitleStyleChange(e.target.value)}
                className="w-full p-2.5 rounded bg-[#12121c] border border-[#2a2a3a] text-xs text-[#e8e6e0] focus:border-[#e5c15a] focus:outline-none"
              >
                {SUBTITLE_STYLES.map((st) => (
                  <option key={st.id} value={st.id} className="bg-[#16161f]">
                    {st.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8a8896] uppercase tracking-wider mb-1.5 font-mono-custom flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-[#e5c15a]" /> Voix Off Française (TTS)
                </span>
                <span className="text-[10px] text-[#e5c15a] font-mono-custom">
                  Vitesse : {speechRate}x
                </span>
              </label>

              <div className="flex items-center gap-3 bg-[#12121c] p-2 rounded border border-[#2a2a3a]">
                <label className="flex items-center gap-2 text-xs text-[#e8e6e0] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableVoice}
                    onChange={(e) => onVoiceToggle(e.target.checked)}
                    className="accent-[#e5c15a] cursor-pointer"
                  />
                  <span>Activer la narration vocale</span>
                </label>

                {enableVoice && (
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.05"
                    value={speechRate}
                    onChange={(e) => onSpeechRateChange(parseFloat(e.target.value))}
                    className="flex-1 accent-[#e5c15a] cursor-pointer"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
