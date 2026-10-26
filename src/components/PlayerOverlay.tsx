import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  X,
  Volume2,
  VolumeX,
  Music,
  Download,
  Crosshair,
  Maximize2,
  Sparkles,
  Loader2
} from 'lucide-react';
import { GeneratedProject, GeneratedScene } from '../services/parser';
import { videoRenderer } from '../services/videoRenderer';
import { audioEngine } from '../services/audioEngine';

interface PlayerOverlayProps {
  project: GeneratedProject;
  initialSceneIndex?: number;
  enableVoice: boolean;
  speechRate: number;
  subtitleStyle: string;
  onClose: () => void;
  onLog?: (type: 'info' | 'warn' | 'success' | 'error', msg: string) => void;
}

export const PlayerOverlay: React.FC<PlayerOverlayProps> = ({
  project,
  initialSceneIndex = 0,
  enableVoice,
  speechRate,
  subtitleStyle,
  onClose,
  onLog
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [currentSceneIdx, setCurrentSceneIdx] = useState(initialSceneIndex);
  const [isPlaying, setIsPlaying] = useState(true);
  const [sceneProgress, setSceneProgress] = useState(0); // 0 to 1
  const [spokenWordIndex, setSpokenWordIndex] = useState(-1);
  const [spokenWordLength, setSpokenWordLength] = useState(0);
  const [showCrosshairs, setShowCrosshairs] = useState(false);
  const [voiceActive, setVoiceActive] = useState(enableVoice);
  const [musicActive, setMusicActive] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const currentScene = project.scenes[currentSceneIdx] || project.scenes[0];
  const sceneDurationMs = (currentScene?.duration || 15) * 1000;

  // Scene startTime ref
  const sceneStartTimeRef = useRef<number>(Date.now());
  const pausedProgressRef = useRef<number>(0);

  // Set up canvas resolution based on aspect ratio
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (project.aspectRatio === '9:16') {
      canvas.width = 720;
      canvas.height = 1280;
    } else if (project.aspectRatio === '16:9') {
      canvas.width = 1280;
      canvas.height = 720;
    } else if (project.aspectRatio === '1:1') {
      canvas.width = 900;
      canvas.height = 900;
    } else {
      canvas.width = 960;
      canvas.height = 720;
    }
  }, [project.aspectRatio]);

  // Handle ambient music lifecycle
  useEffect(() => {
    if (musicActive && isPlaying) {
      audioEngine.startAmbientMusic('wes-anderson');
    } else {
      audioEngine.stopAmbientMusic();
    }
    return () => {
      audioEngine.stopAmbientMusic();
    };
  }, [musicActive, isPlaying]);

  // Play narration speech when scene changes or speech becomes active
  const triggerNarration = useCallback((scene: GeneratedScene) => {
    if (!voiceActive) return;
    audioEngine.speak(scene.voiceover, {
      rate: speechRate,
      onWord: (charIndex, length) => {
        setSpokenWordIndex(charIndex);
        setSpokenWordLength(length);
      },
      onEnd: () => {
        setSpokenWordIndex(-1);
      }
    });
  }, [voiceActive, speechRate]);

  // Handle scene change
  useEffect(() => {
    sceneStartTimeRef.current = Date.now();
    pausedProgressRef.current = 0;
    setSceneProgress(0);
    setSpokenWordIndex(-1);

    if (isPlaying && currentScene) {
      triggerNarration(currentScene);
    }

    return () => {
      audioEngine.stopSpeech();
    };
  }, [currentSceneIdx, isPlaying, triggerNarration]);

  // Main animation render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderLoop = () => {
      if (isPlaying) {
        const elapsed = Date.now() - sceneStartTimeRef.current;
        const progress = Math.min(1.0, elapsed / sceneDurationMs);
        setSceneProgress(progress);

        // Next scene trigger
        if (progress >= 1.0) {
          if (currentSceneIdx < project.scenes.length - 1) {
            setCurrentSceneIdx((prev) => prev + 1);
          } else {
            // End of film: pause
            setIsPlaying(false);
            audioEngine.stopAmbientMusic();
            audioEngine.stopSpeech();
          }
        }
      }

      // Render the current scene frame
      if (currentScene) {
        videoRenderer.renderSceneFrame({
          canvas,
          scene: currentScene,
          progress: isPlaying ? sceneProgress : pausedProgressRef.current,
          spokenWordIndex,
          spokenWordLength,
          showCrosshairs,
          aspectRatio: project.aspectRatio,
          subtitleStyle,
          totalScenesCount: project.scenes.length
        });
      }

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, sceneProgress, currentSceneIdx, currentScene, spokenWordIndex, showCrosshairs, project, subtitleStyle, sceneDurationMs]);

  // Keyboard navigation (Escape to close, Space to play/pause, Left/Right for scenes)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight') {
        goToNextScene();
      } else if (e.key === 'ArrowLeft') {
        goToPrevScene();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSceneIdx, isPlaying]);

  const togglePlay = () => {
    if (isPlaying) {
      pausedProgressRef.current = sceneProgress;
      setIsPlaying(false);
      audioEngine.stopSpeech();
      audioEngine.stopAmbientMusic();
    } else {
      sceneStartTimeRef.current = Date.now() - (pausedProgressRef.current * sceneDurationMs);
      setIsPlaying(true);
      if (currentScene) triggerNarration(currentScene);
    }
  };

  const goToNextScene = () => {
    if (currentSceneIdx < project.scenes.length - 1) {
      setCurrentSceneIdx((prev) => prev + 1);
    }
  };

  const goToPrevScene = () => {
    if (currentSceneIdx > 0) {
      setCurrentSceneIdx((prev) => prev - 1);
    } else {
      sceneStartTimeRef.current = Date.now();
      setSceneProgress(0);
    }
  };

  const restartFilm = () => {
    setCurrentSceneIdx(0);
    sceneStartTimeRef.current = Date.now();
    setSceneProgress(0);
    setIsPlaying(true);
  };

  // Export full movie as WebM video file
  const handleExportFullVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setIsExporting(true);
      setExportProgress(0);
      onLog?.('info', `[RECORDER] Démarrage de l’enregistrement vidéo complet (${project.totalDuration}s)…`);

      // Start recording canvas and audio destination
      const totalMs = project.totalDuration * 1000;
      restartFilm();

      const videoBlob = await videoRenderer.recordVideoFromCanvas(canvas, totalMs, (pct) => {
        setExportProgress(pct);
      });

      // Trigger download
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WG_clip_${project.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onLog?.('success', `[RECORDER] Film vidéo exporté avec succès !`);
    } catch (err: any) {
      onLog?.('error', `[RECORDER] Erreur d’export vidéo : ${err.message}`);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-3 sm:p-6 backdrop-blur-md">
      {/* Top Header Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between text-white z-10">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-0.5 rounded text-[11px] font-mono-custom font-bold bg-[#e5c15a] text-[#0a0a12]">
            WG CLIP PLAYER
          </span>
          <h2 className="text-sm sm:text-base font-bold text-[#FAF6EB] truncate max-w-xs sm:max-w-md font-title-custom">
            {project.title}
          </h2>
          <span className="text-xs font-mono-custom text-[#8a8896] hidden sm:inline">
            Scène {currentSceneIdx + 1}/{project.scenes.length}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-[#FAF6EB] transition-colors cursor-pointer"
          title="Fermer (Échap)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Canvas Player Screen */}
      <div className="relative flex-1 w-full max-w-4xl flex items-center justify-center my-2 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl border border-[#2a2a3a]"
        />

        {/* Exporting Progress Overlay */}
        {isExporting && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center text-center p-4 rounded-lg z-20">
            <Loader2 className="w-10 h-10 text-[#e5c15a] animate-spin mb-3" />
            <h4 className="text-base font-bold text-[#e5c15a] mb-1 font-mono-custom">
              Enregistrement vidéo en cours ({exportProgress}%)
            </h4>
            <p className="text-xs text-[#8a8896] max-w-sm">
              Génération du flux WebM haute définition avec synchronisation audio et narration vocale...
            </p>
            <div className="w-64 h-2 bg-[#2a2a3a] rounded-full mt-4 overflow-hidden">
              <div
                className="h-full bg-[#e5c15a] transition-all duration-150"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="w-full max-w-2xl bg-[#16161f]/90 border border-[#2a2a3a] rounded-xl p-3 sm:p-4 text-white z-10 shadow-2xl space-y-3">
        {/* Progress Bar & Scrubber */}
        <div className="space-y-1">
          <div className="w-full h-1.5 bg-[#2a2a3a] rounded-full overflow-hidden cursor-pointer">
            <div
              className="h-full bg-gradient-to-r from-[#e87b35] to-[#e5c15a] transition-all duration-100"
              style={{
                width: `${((currentSceneIdx + sceneProgress) / project.scenes.length) * 100}%`
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono-custom text-[#8a8896]">
            <span>
              {Math.round(currentSceneIdx * (currentScene?.duration || 15) + (sceneProgress * (currentScene?.duration || 15)))}s
            </span>
            <span>{project.totalDuration}s Total</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Playback Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={restartFilm}
              className="p-2 rounded-md hover:bg-white/10 text-[#8a8896] hover:text-[#e8e6e0] transition-colors cursor-pointer"
              title="Recommencer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={goToPrevScene}
              disabled={currentSceneIdx === 0}
              className="p-2 rounded-md hover:bg-white/10 text-[#8a8896] hover:text-[#e8e6e0] disabled:opacity-30 transition-colors cursor-pointer"
              title="Scène précédente"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              className="p-2.5 sm:p-3 rounded-full bg-[#e5c15a] text-[#0a0a12] hover:bg-[#FAF6EB] transition-colors shadow-lg cursor-pointer"
              title={isPlaying ? 'Pause (Espace)' : 'Lecture (Espace)'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={goToNextScene}
              disabled={currentSceneIdx === project.scenes.length - 1}
              className="p-2 rounded-md hover:bg-white/10 text-[#8a8896] hover:text-[#e8e6e0] disabled:opacity-30 transition-colors cursor-pointer"
              title="Scène suivante"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Audio & Tool Toggles */}
          <div className="flex items-center gap-2">
            {/* Wes Anderson Crosshairs Toggle */}
            <button
              type="button"
              onClick={() => setShowCrosshairs(!showCrosshairs)}
              className={`p-2 rounded-md border text-xs font-mono-custom flex items-center gap-1.5 transition-colors cursor-pointer ${
                showCrosshairs
                  ? 'bg-[#e5c15a]/20 border-[#e5c15a] text-[#e5c15a]'
                  : 'bg-[#12121c] border-[#2a2a3a] text-[#8a8896] hover:text-[#e8e6e0]'
              }`}
              title="Axe de symétrie Wes Anderson"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Symétrie</span>
            </button>

            {/* Voice Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !voiceActive;
                setVoiceActive(next);
                if (!next) audioEngine.stopSpeech();
                else if (isPlaying && currentScene) triggerNarration(currentScene);
              }}
              className={`p-2 rounded-md border text-xs font-mono-custom flex items-center gap-1.5 transition-colors cursor-pointer ${
                voiceActive
                  ? 'bg-[#e5c15a]/20 border-[#e5c15a] text-[#e5c15a]'
                  : 'bg-[#12121c] border-[#2a2a3a] text-[#8a8896] hover:text-[#e8e6e0]'
              }`}
              title="Voix off française"
            >
              {voiceActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">TTS FR</span>
            </button>

            {/* Music Toggle */}
            <button
              type="button"
              onClick={() => setMusicActive(!musicActive)}
              className={`p-2 rounded-md border text-xs font-mono-custom flex items-center gap-1.5 transition-colors cursor-pointer ${
                musicActive
                  ? 'bg-[#8b5fc4]/20 border-[#8b5fc4] text-[#8b5fc4]'
                  : 'bg-[#12121c] border-[#2a2a3a] text-[#8a8896] hover:text-[#e8e6e0]'
              }`}
              title="Musique d’ambiance"
            >
              <Music className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Musique</span>
            </button>

            {/* Full Movie Download */}
            <button
              type="button"
              onClick={handleExportFullVideo}
              disabled={isExporting}
              className="py-1.5 px-3 rounded-md bg-gradient-to-r from-[#e87b35] to-[#e5c15a] text-[#0a0a12] font-bold text-xs font-mono-custom flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              title="Télécharger le film complet au format WebM"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter WebM</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
