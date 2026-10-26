import React from 'react';
import { Lightbulb, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { ModeItem } from '../data/catalog';

interface SubjectInputProps {
  subject: string;
  onChange: (val: string) => void;
  activeMode: ModeItem;
  isOpen: boolean;
  onToggle: () => void;
}

export const SubjectInput: React.FC<SubjectInputProps> = ({
  subject,
  onChange,
  activeMode,
  isOpen,
  onToggle
}) => {
  const handleLoadExample = () => {
    onChange(activeMode.defaultSubject);
  };

  const quickInspirations = [
    'Une découverte clandestine dans un grenier ancien',
    'Un chat persan qui dirige une manufacture secrète',
    'Le café du matin filmé avec symétrie parfaite',
    'Breaking news sur un événement complètement insolite',
    'Deux espions qui échangent un gâteau à la gare'
  ];

  return (
    <div className="bg-[#16161f] border border-[#2a2a3a] rounded-lg mb-5 overflow-hidden shadow-lg transition-all">
      {/* Header Accordion */}
      <div
        onClick={onToggle}
        className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-[#1a1a28]/60 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Lightbulb className="w-4 h-4 text-[#e5c15a]" />
          <span className="text-xs uppercase tracking-widest font-semibold text-[#e8e6e0]">
            Sujet / Idée
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono-custom font-semibold bg-[#e87b35]/15 text-[#e87b35] border border-[#e87b35]/30 uppercase">
            {subject.trim().length > 0 ? 'Défini' : 'Requis'}
          </span>
        </div>
        <div className="text-[#8a8896]">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Body */}
      {isOpen && (
        <div className="p-4 pt-1 border-t border-[#2a2a3a]/60">
          <textarea
            value={subject}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Décrivez votre sujet, votre idée, votre histoire pour ce clip..."
            rows={3}
            className="w-full p-3 rounded-md bg-[#12121c] border border-[#2a2a3a] focus:border-[#e5c15a] text-[#e8e6e0] text-sm focus:outline-none transition-colors leading-relaxed resize-y"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleLoadExample}
                className="px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider bg-[#1a1a28] border border-[#2a2a3a] hover:border-[#e5c15a] text-[#e5c15a] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-[#e5c15a]" />
                Exemple pour #{activeMode.n}
              </button>

              <span className="text-[11px] text-[#8a8896] ml-2 hidden sm:inline">Idées rapides :</span>
              {quickInspirations.slice(0, 2).map((insp, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onChange(insp)}
                  className="px-2 py-0.5 rounded text-[11px] bg-[#12121c] border border-[#2a2a3a] hover:border-[#8a8896] text-[#8a8896] hover:text-[#e8e6e0] transition-colors truncate max-w-[200px]"
                >
                  {insp}
                </button>
              ))}
            </div>

            <span className="text-[11px] font-mono-custom text-[#8a8896]">
              {subject.length} caractères
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
