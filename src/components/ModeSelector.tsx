import React, { useState, useMemo } from 'react';
import { Target, Search, Sparkles, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { ALL_MODES, ModeItem } from '../data/catalog';

interface ModeSelectorProps {
  activeMode: ModeItem;
  onSelectMode: (mode: ModeItem) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  activeMode,
  onSelectMode,
  isOpen,
  onToggle
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: `Tous les modes (${ALL_MODES.length})` },
    { id: 'tiktok', label: 'TikTok & Monétisation (50)', match: 'TikTok & Monétisation (941-990)' },
    { id: 'films', label: 'Films & Cinéma (20)', match: 'Films & Cinéma (901-920)' },
    { id: 'series', label: 'Séries & Épisodique (20)', match: 'Séries & Épisodique (921-940)' }
  ];

  const filteredModes = useMemo(() => {
    return ALL_MODES.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.n.toString().includes(searchTerm) ||
        m.description.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedCategory === 'all') return true;
      const cat = categories.find((c) => c.id === selectedCategory);
      return cat?.match ? m.category === cat.match : true;
    });
  }, [searchTerm, selectedCategory]);

  return (
    <div className="bg-[#16161f] border border-[#2a2a3a] rounded-lg mb-5 overflow-hidden shadow-lg transition-all">
      {/* Header Accordion */}
      <div
        onClick={onToggle}
        className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-[#1a1a28]/60 transition-colors"
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <Target className="w-4 h-4 text-[#e5c15a]" />
          <span className="text-xs uppercase tracking-widest font-semibold text-[#e8e6e0]">
            Mode actif
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-mono-custom font-bold bg-[#e5c15a]/10 text-[#e5c15a] border border-[#e5c15a]/30">
            #{activeMode.n} · {activeMode.name}
          </span>
        </div>
        <div className="text-[#8a8896]">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Body */}
      {isOpen && (
        <div className="p-4 pt-1 border-t border-[#2a2a3a]/60">
          {/* Active Mode Info Callout */}
          <div className="mb-3.5 p-3 rounded-md bg-[#8b5fc4]/10 border border-[#8b5fc4]/30 text-xs text-[#e8e6e0] leading-relaxed flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <strong className="text-[#8b5fc4] font-semibold">
                #{activeMode.n} — {activeMode.name} ({activeMode.category}) :
              </strong>{' '}
              {activeMode.description}
            </div>
            <div className="text-[11px] font-mono-custom text-[#8a8896] shrink-0">
              Défaut : {activeMode.scenes} scènes · {activeMode.duration}s · {activeMode.ratio}
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8896]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher parmi les 90 modes (ex: JT, Wes Anderson, Chaton, Mariage, 941…)"
                className="w-full pl-9 pr-3 py-1.5 rounded bg-[#12121c] border border-[#2a2a3a] text-xs font-mono-custom text-[#e8e6e0] focus:border-[#e5c15a] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-1">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    selectedCategory === c.id
                      ? 'bg-[#e5c15a]/20 text-[#e5c15a] border border-[#e5c15a]'
                      : 'bg-[#12121c] text-[#8a8896] border border-[#2a2a3a] hover:text-[#e8e6e0]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of 90 Modes */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-80 overflow-y-auto p-1.5 bg-[#12121c] border border-[#2a2a3a] rounded-md">
            {filteredModes.map((mode) => {
              const isActive = activeMode.n === mode.n;
              return (
                <button
                  key={mode.n}
                  type="button"
                  onClick={() => onSelectMode(mode)}
                  className={`p-2.5 rounded text-left transition-all cursor-pointer flex flex-col justify-between border ${
                    isActive
                      ? 'bg-[#e5c15a]/15 border-[#e5c15a] text-[#e5c15a] shadow-[0_0_10px_rgba(229,193,90,0.2)]'
                      : 'bg-[#1a1a28] border-[#2a2a3a] text-[#8a8896] hover:text-[#e8e6e0] hover:border-[#8a8896]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono-custom opacity-75 mb-1">
                    <span>#{mode.n}</span>
                    <span className="text-[9px] uppercase">{mode.ratio}</span>
                  </div>
                  <span className={`text-xs font-semibold leading-tight line-clamp-2 ${isActive ? 'text-[#e5c15a]' : 'text-[#e8e6e0]'}`}>
                    {mode.name}
                  </span>
                </button>
              );
            })}
          </div>

          {filteredModes.length === 0 && (
            <div className="text-center py-6 text-xs text-[#8a8896] font-mono-custom">
              Aucun mode trouvé pour "{searchTerm}".
            </div>
          )}
        </div>
      )}
    </div>
  );
};
