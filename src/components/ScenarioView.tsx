import React, { useState } from 'react';
import { Scroll, Copy, Check, ChevronDown, ChevronUp, Camera, Music, Sparkles } from 'lucide-react';
import { GeneratedProject } from '../services/parser';

interface ScenarioViewProps {
  project: GeneratedProject;
  isOpen: boolean;
  onToggle: () => void;
}

export const ScenarioView: React.FC<ScenarioViewProps> = ({ project, isOpen, onToggle }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    let scriptText = `TITRE : ${project.title}\n`;
    scriptText += `SYNOPSIS : ${project.synopsis}\n`;
    scriptText += `MODE : ${project.mode} | STYLE : ${project.style}\n\n`;

    project.scenes.forEach((s) => {
      scriptText += `--- SCÈNE ${s.sceneNumber} : ${s.title} (${s.duration}s) ---\n`;
      scriptText += `VOIX OFF : ${s.voiceover}\n`;
      scriptText += `VISUEL : ${s.visualDescription}\n`;
      scriptText += `CAMÉRA : ${s.cameraMovement}\n`;
      scriptText += `AMBIANCE SONORE : ${s.soundAmbience}\n\n`;
    });

    navigator.clipboard.writeText(scriptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#16161f] border border-[#2a2a3a] rounded-lg mb-5 overflow-hidden shadow-lg transition-all">
      {/* Header Accordion */}
      <div
        onClick={onToggle}
        className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-[#1a1a28]/60 transition-colors"
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <Scroll className="w-4 h-4 text-[#e5c15a]" />
          <span className="text-xs uppercase tracking-widest font-semibold text-[#e8e6e0]">
            Scénario Cinématographique
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono-custom font-semibold bg-[#4a9d6a]/15 text-[#4a9d6a] border border-[#4a9d6a]/30">
            {project.scenes.length} scènes générées
          </span>
          {project.usedStrategy && (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono-custom font-semibold bg-[#8b5fc4]/15 text-[#8b5fc4] border border-[#8b5fc4]/30">
              Stratégie #{project.usedStrategy}
            </span>
          )}
        </div>
        <div className="text-[#8a8896]">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Body */}
      {isOpen && (
        <div className="p-4 pt-1 border-t border-[#2a2a3a]/60 space-y-4">
          {/* Project Title & Synopsis */}
          <div className="p-3.5 rounded-md bg-[#12121c] border border-[#2a2a3a]">
            <div className="flex items-start justify-between gap-3 mb-1">
              <h3 className="text-base sm:text-lg font-bold text-[#e5c15a] font-title-custom">
                {project.title}
              </h3>
              <button
                type="button"
                onClick={handleCopy}
                className="px-2.5 py-1 rounded text-[11px] font-mono-custom bg-[#1a1a28] border border-[#2a2a3a] hover:border-[#e5c15a] text-[#8a8896] hover:text-[#e8e6e0] transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-[#4a9d6a]" /> : <Copy className="w-3 h-3 text-[#e5c15a]" />}
                {copied ? 'Copié' : 'Copier scénario'}
              </button>
            </div>
            <p className="text-xs text-[#8a8896] italic leading-relaxed">
              {project.synopsis}
            </p>
          </div>

          {/* Scenes Cards */}
          <div className="space-y-3">
            {project.scenes.map((scene) => (
              <div
                key={scene.sceneNumber}
                className="p-3.5 rounded-md bg-[#12121c] border border-[#2a2a3a] space-y-2"
              >
                <div className="flex items-center justify-between gap-2 border-b border-[#2a2a3a]/50 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#e5c15a]/20 border border-[#e5c15a]/50 text-[#e5c15a] font-bold text-xs flex items-center justify-center font-mono-custom">
                      {scene.sceneNumber}
                    </span>
                    <span className="text-xs font-bold text-[#e8e6e0]">
                      {scene.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Color swatches */}
                    <div className="flex gap-1">
                      {scene.colorHexes?.map((col, idx) => (
                        <div
                          key={idx}
                          className="w-3 h-3 rounded-full border border-black/40"
                          style={{ backgroundColor: col }}
                          title={col}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono-custom text-[#8a8896] px-1.5 py-0.5 rounded bg-[#1a1a28]">
                      {scene.duration}s
                    </span>
                  </div>
                </div>

                {/* Voiceover text */}
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-[#e5c15a] font-mono-custom mb-0.5">
                    🗣️ Voix Off Française :
                  </div>
                  <p className="text-xs text-[#e8e6e0] bg-[#16161f] p-2.5 rounded border border-[#2a2a3a]/60 leading-relaxed font-medium">
                    « {scene.voiceover} »
                  </p>
                </div>

                {/* Visual description & camera */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#8a8896]">
                  <div className="flex items-start gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#8b5fc4] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#8b5fc4]">Cadrage :</strong> {scene.cameraMovement}
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Music className="w-3.5 h-3.5 text-[#e87b35] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#e87b35]">Ambiance :</strong> {scene.soundAmbience}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
