import React from 'react';
import { Film, Play, Download, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { GeneratedScene } from '../services/parser';

interface VideoGridProps {
  scenes: GeneratedScene[];
  aspectRatio: '9:16' | '16:9' | '1:1' | '4:3';
  onPlayScene: (index: number) => void;
  onDownloadScene: (index: number) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  scenes,
  aspectRatio,
  onPlayScene,
  onDownloadScene,
  isOpen,
  onToggle
}) => {
  return (
    <div className="bg-[#16161f] border border-[#2a2a3a] rounded-lg mb-5 overflow-hidden shadow-lg transition-all">
      {/* Header Accordion */}
      <div
        onClick={onToggle}
        className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-[#1a1a28]/60 transition-colors"
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <Film className="w-4 h-4 text-[#e5c15a]" />
          <span className="text-xs uppercase tracking-widest font-semibold text-[#e8e6e0]">
            Séquences Vidéo
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono-custom font-semibold bg-[#e5c15a]/15 text-[#e5c15a] border border-[#e5c15a]/30">
            {scenes.length} séquences
          </span>
        </div>
        <div className="text-[#8a8896]">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Body */}
      {isOpen && (
        <div className="p-4 pt-1 border-t border-[#2a2a3a]/60">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {scenes.map((scene, idx) => {
              const isGenerating = scene.status === 'generating';
              const isDone = scene.status === 'done' || !!scene.videoUrl || !!scene.thumbnailUrl;
              const isError = scene.status === 'error';

              return (
                <div
                  key={scene.sceneNumber}
                  className={`bg-[#12121c] border rounded-lg overflow-hidden flex flex-col justify-between transition-all ${
                    isGenerating
                      ? 'border-[#e5c15a] shadow-[0_0_12px_rgba(229,193,90,0.2)]'
                      : isDone
                      ? 'border-[#4a9d6a]/60'
                      : isError
                      ? 'border-[#c85a4a]'
                      : 'border-[#2a2a3a]'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-2.5 border-b border-[#2a2a3a] flex items-center justify-between text-xs font-mono-custom text-[#8a8896]">
                    <span className="truncate font-semibold text-[#e8e6e0]">
                      #{scene.sceneNumber} · {scene.title}
                    </span>
                    <span className="text-[10px] shrink-0 text-[#e5c15a]">
                      {scene.duration}s
                    </span>
                  </div>

                  {/* Preview Container */}
                  <div className="p-2.5">
                    <div
                      className={`relative w-full rounded overflow-hidden bg-[#0a0a12] flex items-center justify-center border border-[#2a2a3a]/60 group ${
                        aspectRatio === '9:16'
                          ? 'aspect-[9/16]'
                          : aspectRatio === '16:9'
                          ? 'aspect-[16/9]'
                          : aspectRatio === '1:1'
                          ? 'aspect-square'
                          : 'aspect-[4/3]'
                      }`}
                    >
                      {scene.videoUrl ? (
                        <video
                          src={scene.videoUrl}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          loop
                        />
                      ) : scene.thumbnailUrl ? (
                        <img
                          src={scene.thumbnailUrl}
                          alt={scene.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                          {isGenerating ? (
                            <>
                              <Loader2 className="w-6 h-6 text-[#e5c15a] animate-spin mb-2" />
                              <span className="text-[11px] font-mono-custom text-[#e5c15a]">
                                Rendu en cours…
                              </span>
                            </>
                          ) : (
                            <>
                              <Film className="w-6 h-6 text-[#4a4858] mb-2" />
                              <span className="text-[10px] font-mono-custom text-[#4a4858]">
                                Prêt pour diffusion
                              </span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Play overlay on hover */}
                      <button
                        type="button"
                        onClick={() => onPlayScene(idx)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                        title="Diffuser cette scène"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#e5c15a] text-[#0a0a12] flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </button>
                    </div>

                    {/* Scene subtitle preview */}
                    <p className="text-[11px] text-[#8a8896] mt-2 line-clamp-2 italic">
                      « {scene.voiceover} »
                    </p>
                  </div>

                  {/* Card Actions */}
                  <div className="p-2.5 pt-0 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onPlayScene(idx)}
                      className="flex-1 py-1.5 px-2 rounded bg-[#1a1a28] hover:bg-[#e5c15a]/20 border border-[#2a2a3a] hover:border-[#e5c15a] text-[#e8e6e0] hover:text-[#e5c15a] text-[11px] font-mono-custom font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" /> Diffuser
                    </button>

                    <button
                      type="button"
                      onClick={() => onDownloadScene(idx)}
                      className="py-1.5 px-2.5 rounded bg-[#1a1a28] hover:bg-[#e5c15a]/20 border border-[#2a2a3a] hover:border-[#e5c15a] text-[#8a8896] hover:text-[#e5c15a] transition-colors cursor-pointer"
                      title="Télécharger cette séquence"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
