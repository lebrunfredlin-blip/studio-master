import React, { useState, useEffect } from 'react';
import { Key, Sparkles, Check, Trash2, Clock, AlertTriangle, ExternalLink } from 'lucide-react';
import { AgnesKeyStatus, agnesPool } from '../services/agnesApi';

interface ApiKeyPoolProps {
  onKeysChanged: (activeCount: number) => void;
  customGeminiKey: string;
  onGeminiKeyChange: (key: string) => void;
}

export const ApiKeyPool: React.FC<ApiKeyPoolProps> = ({
  onKeysChanged,
  customGeminiKey,
  onGeminiKeyChange
}) => {
  const [keysInput, setKeysInput] = useState('');
  const [keysList, setKeysList] = useState<AgnesKeyStatus[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [showAdvancedGemini, setShowAdvancedGemini] = useState(false);

  useEffect(() => {
    const loaded = agnesPool.getKeys();
    setKeysList(loaded);
    setKeysInput(loaded.map(k => k.key).join('\n'));
    onKeysChanged(agnesPool.getActiveWorkerCount());
  }, []);

  const handleSave = () => {
    const updated = agnesPool.saveKeys(keysInput);
    setKeysList(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    onKeysChanged(agnesPool.getActiveWorkerCount());
  };

  const handleRemoveKey = (keyIndex: number) => {
    const filtered = keysList.filter((_, idx) => idx !== keyIndex);
    setKeysList(filtered);
    const newText = filtered.map(k => k.key).join('\n');
    setKeysInput(newText);
    agnesPool.saveKeys(newText);
    onKeysChanged(agnesPool.getActiveWorkerCount());
  };

  const activeCount = keysList.filter(k => k.state === 'active').length;

  return (
    <div className="bg-[#16161f] border border-[#2a2a3a] rounded-lg p-4 sm:p-5 mb-5 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <label className="text-xs font-bold text-[#8a8896] uppercase tracking-wider flex items-center gap-2 font-mono-custom">
          <Key className="w-4 h-4 text-[#e5c15a]" />
          Clés API Agnes — une par ligne (N clés = N workers parallèles)
        </label>
        <div className="text-[11px] text-[#8a8896]">
          Clés gratuites sur{' '}
          <a
            href="https://platform.agnes-ai.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#e5c15a] hover:underline inline-flex items-center gap-0.5"
          >
            platform.agnes-ai.com <ExternalLink className="w-3 h-3 inline" />
          </a>
        </div>
      </div>

      <textarea
        value={keysInput}
        onChange={(e) => setKeysInput(e.target.value)}
        placeholder={'sk-xxxxxxxxxxxxxxxxxxxxxxxx\nsk-yyyyyyyyyyyyyyyyyyyyyyyy'}
        rows={2}
        spellCheck={false}
        autoComplete="off"
        className="w-full p-3 rounded-md bg-[#12121c] border border-[#2a2a3a] focus:border-[#e5c15a] text-[#e8e6e0] font-mono-custom text-xs focus:outline-none transition-colors mb-2.5 resize-y"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider bg-[#1a1a28] border border-[#2a2a3a] hover:border-[#e5c15a] text-[#e8e6e0] hover:text-[#e5c15a] transition-all flex items-center gap-2 cursor-pointer"
        >
          {isSaved ? <Check className="w-3.5 h-3.5 text-[#4a9d6a]" /> : <Key className="w-3.5 h-3.5 text-[#e5c15a]" />}
          {isSaved ? 'Clés enregistrées' : 'Enregistrer les clés'}
        </button>

        <div className="text-xs font-mono-custom flex items-center gap-2 bg-[#12121c] px-3 py-1.5 rounded border border-[#2a2a3a]">
          <span className={`w-2 h-2 rounded-full ${activeCount > 0 ? 'bg-[#4a9d6a] shadow-[0_0_6px_#4a9d6a]' : 'bg-[#4a4858]'}`} />
          <span className="text-[#8a8896]">
            {activeCount === 0
              ? 'Aucune clé Agnes enregistrée (Mode Rendu Canvas & Gemini actif)'
              : `${activeCount} clé(s) active(s) · ${activeCount} worker(s) prêts`}
          </span>
        </div>
      </div>

      {/* Keys List Badges */}
      {keysList.length > 0 && (
        <div className="mt-3.5 pt-3 border-t border-[#2a2a3a] space-y-1.5 max-h-36 overflow-y-auto">
          {keysList.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 px-3 py-1.5 bg-[#12121c] border border-[#2a2a3a] rounded text-[11px] font-mono-custom"
            >
              <span className="text-[#e5c15a] font-semibold truncate max-w-[200px] sm:max-w-xs">
                Worker #{idx + 1} : {item.key.slice(0, 10)}…{item.key.slice(-4)}
              </span>

              <div className="flex items-center gap-2">
                {item.state === 'active' && (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#4a9d6a]/15 text-[#4a9d6a] border border-[#4a9d6a]/30">
                    Actif
                  </span>
                )}
                {item.state === 'cool' && (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#d4a017]/15 text-[#d4a017] border border-[#d4a017]/30 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> Cooldown
                  </span>
                )}
                {item.state === 'dead' && (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#c85a4a]/15 text-[#c85a4a] border border-[#c85a4a]/30 flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" /> Invalide
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => handleRemoveKey(idx)}
                  className="text-[#8a8896] hover:text-[#c85a4a] transition-colors p-1"
                  title="Supprimer cette clé"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Advanced Gemini Key Toggle */}
      <div className="mt-3 pt-2 text-right">
        <button
          type="button"
          onClick={() => setShowAdvancedGemini(!showAdvancedGemini)}
          className="text-[11px] text-[#8a8896] hover:text-[#e5c15a] transition-colors underline font-mono-custom"
        >
          {showAdvancedGemini ? '— Masquer configuration Gemini personnalisée' : '+ Clé Gemini personnalisée (optionnel)'}
        </button>

        {showAdvancedGemini && (
          <div className="mt-2 text-left p-3 rounded bg-[#12121c] border border-[#2a2a3a]">
            <label className="block text-[11px] text-[#8a8896] mb-1 font-mono-custom">
              Clé Gemini API (laissez vide pour utiliser automatiquement la clé serveur intégrée) :
            </label>
            <input
              type="password"
              value={customGeminiKey}
              onChange={(e) => onGeminiKeyChange(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full p-2 rounded bg-[#1a1a28] border border-[#2a2a3a] text-xs font-mono-custom text-[#e8e6e0] focus:border-[#e5c15a] focus:outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
};
