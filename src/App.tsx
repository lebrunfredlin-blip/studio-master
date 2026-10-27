import React, { useState, useEffect, useRef, useMemo } from 'react';
import JSZip from 'jszip';
import {
  Film,
  Sparkles,
  Play,
  Pause,
  Download,
  RotateCcw,
  SkipBack,
  SkipForward,
  X,
  Volume2,
  VolumeX,
  Music,
  Maximize2,
  Terminal,
  Settings,
  Sliders,
  Search,
  CheckCircle2,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Moon,
  Sun,
  Laptop,
  Key,
  Trash2,
  Copy,
  Check,
  Send,
  MessageSquare,
  History,
  FileVideo,
  Layers,
  Clock,
  Video,
  Mic,
  Monitor
} from 'lucide-react';

import { ALL_MODES, ModeItem, WA_PALETTES } from './data/catalog';
import {
  GeneratedProject,
  GeneratedScene,
  parseScenarioWith5Strategies,
  generateProceduralFallback
} from './services/parser';
import { agnesPool, AgnesKeyStatus } from './services/agnesApi';
import { videoRenderer } from './services/videoRenderer';
import { audioEngine } from './services/audioEngine';

// ─── LOCAL STORAGE SÉCURISÉ (100% PRIVÉ) ───
const safeStorage = {
  get: <T,>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: (key: string, value: any): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
  remove: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
    } catch {}
  }
};

export interface LogItem {
  id: string;
  time: string;
  type: 'info' | 'warn' | 'success' | 'error' | 'api' | 'ai';
  msg: string;
}

export interface AssistantMessage {
  id: string;
  sender: 'bot' | 'user' | 'error';
  text: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface RecentProjectItem {
  id: string;
  title: string;
  subject: string;
  modeName: string;
  date: string;
  project: GeneratedProject;
}

export default function App() {
  // ─── ÉTAT DE NAVIGATION ───
  const [currentPage, setCurrentPage] = useState<'home' | 'account' | 'preferences'>('home');

  // ─── SECTION 1 : RÉCIT & SUJET ───
  const [subject, setSubject] = useState<string>(() =>
    safeStorage.get('studio_master_subject', '')
  );

  // ─── SECTION 2 : FORMAT & CADENCE (SOLIDAIRES) ───
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1' | '4:3'>(() =>
    safeStorage.get('studio_master_aspect_ratio', '9:16')
  );
  const [scenesCount, setScenesCount] = useState<number>(() =>
    safeStorage.get('studio_master_scenes_count', 3)
  );
  const [durationPerScene, setDurationPerScene] = useState<number>(() =>
    safeStorage.get('studio_master_duration_scene', 15)
  );
  const [videoQuality, setVideoQuality] = useState<string>(() =>
    safeStorage.get('studio_master_video_quality', '1080P')
  );
  const [enableVoice, setEnableVoice] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // ─── SECTION 3 : STYLE & DIRECTION ARTISTIQUE ───
  const [activeMode, setActiveMode] = useState<ModeItem>(() => {
    const saved = safeStorage.get<ModeItem | null>('studio_master_active_mode', null);
    return saved && saved.n ? saved : ALL_MODES[0];
  });
  const [modeCategoryFilter, setModeCategoryFilter] = useState<'all' | 'tiktok' | 'films' | 'series'>('all');
  const [modeSearch, setModeSearch] = useState<string>('');
  const [showAllModes, setShowAllModes] = useState<boolean>(false);
  const [selectedPalette, setSelectedPalette] = useState<string>('pink-mint');

  // ─── SECTION 4 : PROJET GÉNÉRÉ & EXPORT ───
  const [project, setProject] = useState<GeneratedProject | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [statusBar, setStatusBar] = useState<{ visible: boolean; text: string }>({
    visible: false,
    text: ''
  });
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [showScriptDetails, setShowScriptDetails] = useState<boolean>(false);

  // ─── SECTION 5 : LECTEUR OVERLAY CANVAS ───
  const [isOverlayVisible, setIsOverlayVisible] = useState<boolean>(false);
  const [currentPlaySceneIdx, setCurrentPlaySceneIdx] = useState<number>(0);
  const [isOverlayPlaying, setIsOverlayPlaying] = useState<boolean>(true);
  const [overlayProgress, setOverlayProgress] = useState<number>(0);
  const [spokenWordIndex, setSpokenWordIndex] = useState<number>(-1);

  // ─── PRÉFÉRENCES & HISTORIQUE ───
  const [theme, setTheme] = useState<'auto' | 'light' | 'dark'>(() =>
    safeStorage.get('studio_master_theme', 'auto')
  );
  const [recentProjects, setRecentProjects] = useState<RecentProjectItem[]>(() =>
    safeStorage.get('studio_master_recent_projects', [])
  );
  const [showRecentModal, setShowRecentModal] = useState<boolean>(false);

  // ─── WORKERS AGNES (OPTIONNEL) ───
  const [apiKeysInput, setApiKeysInput] = useState<string>('');
  const [keysList, setKeysList] = useState<AgnesKeyStatus[]>([]);

  // ─── LOGS & NOTIFICATIONS ───
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [toast, setToast] = useState<{ visible: boolean; type: 'info' | 'success' | 'warn' | 'error'; text: string }>({
    visible: false,
    type: 'info',
    text: ''
  });

  // ─── ASSISTANT IA ───
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: "Bonjour. Je suis l'assistant Studio Master. Vous pouvez me demander une idée de scénario ou un conseil pour votre projet.",
      action: {
        label: "💡 Suggérer une idée de sujet",
        onClick: () => {
          handleSendAssistantMessage("Propose-moi une idée de scénario originale et prenante");
        }
      }
    }
  ]);
  const [assistantInput, setAssistantInput] = useState<string>('');
  const [isAssistantTyping, setIsAssistantTyping] = useState<boolean>(false);

  // ─── REFS ───
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const consoleViewRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sceneStartMsRef = useRef<number>(Date.now());
  const pausedProgressRef = useRef<number>(0);
  const assistantMessagesEndRef = useRef<HTMLDivElement | null>(null);

  // ─── SAUVEGARDE AUTOMATIQUE EN TEMPS RÉEL DANS LOCALSTORAGE ───
  useEffect(() => {
    safeStorage.set('studio_master_subject', subject);
  }, [subject]);

  useEffect(() => {
    safeStorage.set('studio_master_active_mode', activeMode);
  }, [activeMode]);

  useEffect(() => {
    safeStorage.set('studio_master_scenes_count', scenesCount);
  }, [scenesCount]);

  useEffect(() => {
    safeStorage.set('studio_master_duration_scene', durationPerScene);
  }, [durationPerScene]);

  useEffect(() => {
    safeStorage.set('studio_master_aspect_ratio', aspectRatio);
  }, [aspectRatio]);

  useEffect(() => {
    safeStorage.set('studio_master_video_quality', videoQuality);
  }, [videoQuality]);

  useEffect(() => {
    safeStorage.set('studio_master_theme', theme);
  }, [theme]);

  useEffect(() => {
    safeStorage.set('studio_master_recent_projects', recentProjects);
  }, [recentProjects]);

  // ─── APPLICATION DU THÈME ───
  const applyThemeMode = (t: 'auto' | 'light' | 'dark') => {
    setTheme(t);
    document.documentElement.classList.remove('light', 'dark');
    if (t === 'light') {
      document.documentElement.classList.add('light');
    } else if (t === 'dark') {
      document.documentElement.classList.add('dark');
    }
  };

  const toggleTheme = () => {
    const cycle: Record<string, 'auto' | 'light' | 'dark'> = {
      auto: 'light',
      light: 'dark',
      dark: 'auto'
    };
    const next = cycle[theme] || 'auto';
    applyThemeMode(next);
    showToast(`Thème : ${next === 'auto' ? 'Automatique' : next === 'light' ? 'Clair' : 'Sombre'}`, 'info', 1500);
  };

  const addLog = (type: LogItem['type'], msg: string) => {
    const d = new Date();
    const time = d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
    setLogs((prev) => [
      ...prev.slice(-300),
      { id: Math.random().toString(36).substring(2, 9), time, type, msg }
    ]);
  };

  const showToast = (text: string, type: 'info' | 'success' | 'warn' | 'error' = 'success', duration = 3000) => {
    setToast({ visible: true, type, text });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, duration);
  };

  useEffect(() => {
    applyThemeMode(theme);
    const loadedKeys = agnesPool.loadKeys();
    setKeysList(loadedKeys);
    setApiKeysInput(loadedKeys.map((k) => k.key).join('\n'));

    const onHashChange = () => {
      const h = window.location.hash.replace('#', '');
      if (['home', 'account', 'preferences'].includes(h)) {
        setCurrentPage(h as any);
      } else {
        setCurrentPage('home');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigateTo = (page: 'home' | 'account' | 'preferences') => {
    setCurrentPage(page);
    window.location.hash = page === 'home' ? '' : page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectMode = (m: ModeItem) => {
    setActiveMode(m);
    setScenesCount(m.scenes || 3);
    setDurationPerScene(m.duration || 15);
    setAspectRatio(m.ratio || '9:16');
    if (m.palette) setSelectedPalette(m.palette);
    showToast(`Style #${m.n} ${m.name} sélectionné`, 'info', 1800);
  };

  // Inspirations professionnelles condensées
  const quickInspirations = [
    "Un atelier d'horlogerie secret dans les Alpes suisses",
    "Flash info : découverte d'une capsule temporelle intacte sous Paris",
    "Deux espions échangent un colis dans un train de nuit",
    "Un carnet de voyage contemplatif au cœur de Kyoto"
  ];

  // ─── CALCUL DE LA DURÉE TOTALE DU PROJET ───
  const totalRuntimeSeconds = scenesCount * durationPerScene;

  // ─── GÉNÉRATION DU PROJET (LIBRE & SANS AUTH) ───
  const handleLaunch = async () => {
    if (isGenerating) return;

    if (!subject.trim()) {
      showToast("Veuillez indiquer le sujet ou l'idée de votre vidéo", "warn");
      document.getElementById('subject-input')?.focus();
      return;
    }

    abortControllerRef.current = new AbortController();
    setIsGenerating(true);
    setStatusBar({ visible: true, text: `Création du projet (${activeMode.name} · ${aspectRatio})…` });
    addLog('info', `Lancement : ${activeMode.name} · ${scenesCount} scènes × ${durationPerScene}s (${aspectRatio})`);

    try {
      let projectData: GeneratedProject | null = null;

      try {
        const response = await fetch('/api/generate-scenario', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modeNumber: activeMode.n,
            modeName: activeMode.name,
            modeCategory: activeMode.category,
            subject: subject.trim(),
            scenesCount,
            durationPerScene,
            aspectRatio,
            styleName: activeMode.style,
            palette: selectedPalette
          }),
          signal: abortControllerRef.current.signal
        });

        if (response.ok) {
          const resJson = await response.json();
          projectData = parseScenarioWith5Strategies(
            resJson.raw || JSON.stringify(resJson.data),
            activeMode,
            subject.trim(),
            scenesCount,
            durationPerScene,
            aspectRatio,
            addLog
          );
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          addLog('warn', 'Génération interrompue.');
          return;
        }
      }

      if (!projectData) {
        projectData = generateProceduralFallback(
          activeMode,
          subject.trim(),
          scenesCount,
          durationPerScene,
          aspectRatio
        );
      }

      setStatusBar({ visible: true, text: 'Rendu graphique des plans…' });

      const updatedScenes: GeneratedScene[] = projectData.scenes.map((s) => {
        const thumb = videoRenderer.generateSceneThumbnail(s, aspectRatio);
        return {
          ...s,
          thumbnailUrl: thumb,
          status: 'done' as GeneratedScene['status']
        };
      });

      projectData.scenes = updatedScenes;
      setProject(projectData);

      // Sauvegarde dans l'historique
      const newRecent: RecentProjectItem = {
        id: Math.random().toString(36).substring(2, 9),
        title: projectData.title,
        subject: subject.trim(),
        modeName: activeMode.name,
        date: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        project: projectData
      };
      setRecentProjects((prev) => [newRecent, ...prev.filter((p) => p.subject !== subject.trim())].slice(0, 10));

      // Workers Agnes optionnels
      const activeWorkers = agnesPool.getKeys().filter((k) => k.state === 'active');
      if (activeWorkers.length > 0) {
        setStatusBar({ visible: true, text: 'Génération vidéo via workers Agnes…' });
        updatedScenes.forEach(async (sc) => {
          try {
            sc.status = 'generating';
            setProject({ ...projectData!, scenes: [...updatedScenes] });
            const vidUrl = await agnesPool.createVideoTask(
              sc.videoPrompt,
              aspectRatio,
              sc.duration,
              videoQuality,
              (prog) => addLog('api', `Scène #${sc.sceneNumber} : ${prog}`)
            );
            sc.videoUrl = vidUrl;
            sc.status = 'done';
            setProject({ ...projectData!, scenes: [...updatedScenes] });
            addLog('success', `Scène #${sc.sceneNumber} : Vidéo générée avec succès !`);
          } catch (err: any) {
            sc.status = 'done';
            setProject({ ...projectData!, scenes: [...updatedScenes] });
            const errorMsg = err?.message || 'Erreur lors du rendu';
            if (errorMsg.includes("La vidéo n'a pas pu être générée")) {
              showToast("La vidéo n'a pas pu être générée, réessayez avec un sujet plus visuel", 'error', 5000);
            }
            addLog('warn', `Scène #${sc.sceneNumber} : ${errorMsg} (Rendu cinématique Canvas maintenu)`);
          }
        });
      }

      showToast(`Projet prêt · ${projectData.scenes.length} séquences`, 'success', 3000);

      setTimeout(() => {
        document.getElementById('project-results')?.scrollIntoView({ behavior: 'smooth' });
      }, 250);

    } catch (err: any) {
      showToast(`Erreur : ${err.message}`, 'error');
    } finally {
      setIsGenerating(false);
      setStatusBar({ visible: false, text: '' });
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    audioEngine.stopSpeech();
    audioEngine.stopAmbientMusic();
    setIsGenerating(false);
    setStatusBar({ visible: false, text: '' });
    showToast('Génération interrompue', 'warn');
  };

  // ─── PLAYER OVERLAY ───
  const startPlayerOverlay = (sceneIdx = 0) => {
    if (!project) return;
    setCurrentPlaySceneIdx(sceneIdx);
    setIsOverlayPlaying(true);
    setIsOverlayVisible(true);
  };

  useEffect(() => {
    if (!isOverlayVisible || !project) return;

    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    if (project.aspectRatio === '9:16') {
      canvas.width = 720;
      canvas.height = 1280;
    } else if (project.aspectRatio === '16:9') {
      canvas.width = 1280;
      canvas.height = 720;
    } else {
      canvas.width = 900;
      canvas.height = 900;
    }

    const curScene = project.scenes[currentPlaySceneIdx] || project.scenes[0];
    const durMs = ((curScene?.duration || 15) * 1000) / playbackSpeed;

    sceneStartMsRef.current = Date.now();
    pausedProgressRef.current = 0;
    setOverlayProgress(0);

    audioEngine.startAmbientMusic('wes-anderson');

    if (enableVoice && curScene) {
      audioEngine.speak(curScene.voiceover, {
        rate: 1.05 * playbackSpeed,
        onWord: (charIdx) => setSpokenWordIndex(charIdx),
        onEnd: () => setSpokenWordIndex(-1)
      });
    }

    const render = () => {
      if (isOverlayPlaying) {
        const elapsed = Date.now() - sceneStartMsRef.current;
        const progress = Math.min(1.0, elapsed / durMs);
        setOverlayProgress(progress);

        if (progress >= 1.0) {
          if (currentPlaySceneIdx < project.scenes.length - 1) {
            setCurrentPlaySceneIdx((p) => p + 1);
          } else {
            setIsOverlayPlaying(false);
            audioEngine.stopSpeech();
            audioEngine.stopAmbientMusic();
          }
        }
      }

      if (curScene) {
        videoRenderer.renderSceneFrame({
          canvas,
          scene: curScene,
          progress: isOverlayPlaying ? overlayProgress : pausedProgressRef.current,
          spokenWordIndex,
          aspectRatio: project.aspectRatio,
          totalScenesCount: project.scenes.length
        });
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      audioEngine.stopSpeech();
      audioEngine.stopAmbientMusic();
    };
  }, [isOverlayVisible, currentPlaySceneIdx, isOverlayPlaying, project, enableVoice, playbackSpeed]);

  // Raccourcis clavier pour le player
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOverlayVisible) {
        setIsOverlayVisible(false);
        audioEngine.stopSpeech();
        audioEngine.stopAmbientMusic();
      } else if (e.key === ' ' && isOverlayVisible) {
        e.preventDefault();
        setIsOverlayPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOverlayVisible]);

  // ─── TÉLÉCHARGEMENT DIRECT DE SCÈNE ───
  const handleDownloadScene = async (sc: GeneratedScene) => {
    if (sc.videoUrl) {
      try {
        const res = await fetch(sc.videoUrl);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scene-${sc.sceneNumber}-${sc.title.replace(/[^a-z0-9]/gi, '_')}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`Scène #${sc.sceneNumber} téléchargée`, 'success');
        return;
      } catch {}
    }

    try {
      showToast(`Export de la scène #${sc.sceneNumber}…`, 'info');
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = aspectRatio === '16:9' ? 1280 : 720;
      tempCanvas.height = aspectRatio === '16:9' ? 720 : 1280;

      videoRenderer.renderSceneFrame({
        canvas: tempCanvas,
        scene: sc,
        progress: 0.5,
        aspectRatio
      });

      const blob = await videoRenderer.recordVideoFromCanvas(tempCanvas, 3000);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scene-${sc.sceneNumber}-${sc.title.replace(/[^a-z0-9]/gi, '_')}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Scène #${sc.sceneNumber} prête ✓`, 'success');
    } catch (err: any) {
      showToast(`Export impossible : ${err.message}`, 'error');
    }
  };

  // ─── EXPORT ZIP COMPLET ───
  const handleExportZip = async () => {
    if (!project) return;
    try {
      setIsExportingZip(true);
      showToast('Création du pack ZIP complet…', 'info');

      const zip = new JSZip();
      const folderName = `projet-${activeMode.n}-${Date.now()}`;
      const folder = zip.folder(folderName);

      folder?.file('scenario.json', JSON.stringify(project, null, 2));
      folder?.file(
        'details.txt',
        `Studio Master\nTitre : ${project.title}\nStyle : #${activeMode.n} ${activeMode.name}\nFormat : ${project.aspectRatio}\nScènes : ${project.scenes.length}\nDate : ${new Date().toISOString()}\n`
      );

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = aspectRatio === '16:9' ? 1280 : 720;
      tempCanvas.height = aspectRatio === '16:9' ? 720 : 1280;

      for (let i = 0; i < project.scenes.length; i++) {
        const sc = project.scenes[i];
        if (sc.videoUrl) {
          try {
            const vidRes = await fetch(sc.videoUrl);
            const blob = await vidRes.blob();
            folder?.file(`scene-${String(i + 1).padStart(2, '0')}.mp4`, blob);
            continue;
          } catch {}
        }

        videoRenderer.renderSceneFrame({ canvas: tempCanvas, scene: sc, progress: 0.5, aspectRatio });
        const blob = await videoRenderer.recordVideoFromCanvas(tempCanvas, 2500);
        folder?.file(`scene-${String(i + 1).padStart(2, '0')}.webm`, blob);
      }

      const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folderName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Pack ZIP téléchargé avec succès ✓', 'success');
    } catch (e: any) {
      showToast(`Erreur export ZIP : ${e.message}`, 'error');
    } finally {
      setIsExportingZip(false);
    }
  };

  // ─── ASSISTANT IA ───
  const handleSendAssistantMessage = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || isAssistantTyping) return;

    setAssistantMessages((prev) => [...prev, { id: 'msg-' + Date.now(), sender: 'user', text }]);
    setIsAssistantTyping(true);

    setTimeout(() => {
      assistantMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    const context = {
      modeNumber: activeMode.n,
      modeName: activeMode.name,
      modeCategory: activeMode.category,
      subject,
      scenesCount,
      aspectRatio
    };

    try {
      const res = await fetch('/api/assistant-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, context })
      });
      const data = await res.json();
      const reply = data.reply || "Je suis à votre disposition pour imaginer votre vidéo.";

      let action: AssistantMessage['action'] | undefined = undefined;
      if (text.toLowerCase().includes('idée') || text.toLowerCase().includes('sujet')) {
        action = {
          label: "✨ Utiliser ce sujet",
          onClick: () => {
            const clean = reply.replace(/[*#]/g, '').slice(0, 240);
            setSubject(clean);
            showToast("Sujet appliqué !", "success");
          }
        };
      }

      setAssistantMessages((prev) => [...prev, { id: 'bot-' + Date.now(), sender: 'bot', text: reply, action }]);
    } catch {
      setAssistantMessages((prev) => [
        ...prev,
        {
          id: 'bot-' + Date.now(),
          sender: 'bot',
          text: "💡 Idée : 'Une montre ancienne révèle l'histoire secrète des habitants d'une pension des années 30.'",
          action: {
            label: "✨ Appliquer ce sujet",
            onClick: () => {
              setSubject("Une montre ancienne révèle l'histoire secrète des habitants d'une pension des années 30");
              showToast("Sujet appliqué !", "success");
            }
          }
        }
      ]);
    } finally {
      setIsAssistantTyping(false);
      setTimeout(() => {
        assistantMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  // ─── FILTRES DU CATALOGUE DE STYLES ───
  const filteredModes = useMemo(() => {
    return ALL_MODES.filter((m) => {
      if (modeCategoryFilter === 'tiktok' && m.n > 990) return false;
      if (modeCategoryFilter === 'films' && (m.n < 901 || m.n > 920)) return false;
      if (modeCategoryFilter === 'series' && (m.n < 921 || m.n > 940)) return false;

      if (modeSearch.trim()) {
        const query = modeSearch.toLowerCase().trim();
        return m.name.toLowerCase().includes(query) || String(m.n).includes(query) || m.description.toLowerCase().includes(query);
      }
      return true;
    });
  }, [modeCategoryFilter, modeSearch]);

  const displayedModes = useMemo(() => {
    if (showAllModes || modeSearch.trim().length > 0) return filteredModes;
    const slice = filteredModes.slice(0, 12);
    if (!slice.some((m) => m.n === activeMode.n) && filteredModes.some((m) => m.n === activeMode.n)) {
      return [...slice, activeMode];
    }
    return slice;
  }, [filteredModes, showAllModes, modeSearch, activeMode]);

  return (
    <>
      {/* ════════════ HEADER PROFESSIONNEL & ÉPURÉ ════════════ */}
      <header className="app-header" id="app-header">
        <div className="header-left">
          <div className="flex items-center gap-2">
            <h1>Studio Master</h1>
            <span className="text-xs text-[#8a8896] hidden sm:inline">· Studio Vidéo</span>
          </div>
          <div className="text-[11px] text-[#8a8896] flex items-center gap-2 mt-0.5">
            <span>Style actif : #{activeMode.n} {activeMode.name}</span>
            <span>·</span>
            <span>Format : {aspectRatio}</span>
            <span>·</span>
            <span>{totalRuntimeSeconds}s</span>
          </div>
        </div>

        <div className="header-actions">
          {/* Raccourci Projets Récents */}
          {recentProjects.length > 0 && (
            <button
              type="button"
              className="btn-icon"
              onClick={() => setShowRecentModal(true)}
              title="Historique des projets récents"
            >
              <History className="w-4 h-4 text-[#e5c15a]" />
            </button>
          )}

          {/* Thème Clair / Sombre */}
          <button
            type="button"
            className="btn-icon"
            onClick={toggleTheme}
            title={`Thème : ${theme}`}
          >
            {theme === 'light' ? (
              <Sun className="w-4 h-4 text-[#e5c15a]" />
            ) : theme === 'dark' ? (
              <Moon className="w-4 h-4 text-[#e5c15a]" />
            ) : (
              <Laptop className="w-4 h-4 text-[#8a8896]" />
            )}
          </button>

          {/* Préférences */}
          <button
            type="button"
            className={`btn-icon ${currentPage === 'preferences' ? 'active' : ''}`}
            onClick={() => navigateTo(currentPage === 'preferences' ? 'home' : 'preferences')}
            title="Préférences & Diagnostic"
          >
            <Settings className="w-4 h-4 text-[#e5c15a]" />
          </button>
        </div>
      </header>

      {/* ════════════ PAGE PRINCIPALE : HOME ════════════ */}
      {currentPage === 'home' && (
        <main className="page active" id="page-home">

          {/* ─── 01 · RÉCIT & SUJET ─── */}
          <section className="studio-box" id="step-story">
            <div className="studio-box-header">
              <div className="studio-box-title">
                <FileVideo className="w-4 h-4 text-[#e5c15a]" />
                <span>01 · Sujet & Scénario</span>
              </div>
              <span className="studio-badge-subtle">
                {subject.trim().length} caractères
              </span>
            </div>

            <textarea
              id="subject-input"
              rows={3}
              placeholder="Décrivez l'idée, le lieu, l'action ou l'histoire de votre vidéo…"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full text-sm leading-relaxed"
            />

            {/* Suggestions rapides & professionnelles */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSubject(activeMode.defaultSubject)}
                  className="px-2.5 py-1 rounded text-xs font-semibold bg-[#1a1a28] border border-[#2a2a3a] hover:border-[#e5c15a] text-[#e5c15a] transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Exemple style #{activeMode.n}
                </button>

                {quickInspirations.slice(0, 2).map((insp, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSubject(insp)}
                    className="px-2.5 py-1 rounded text-[11px] bg-[#12121c] border border-[#2a2a3a] hover:border-[#8a8896] text-[#8a8896] hover:text-[#e8e6e0] transition-colors truncate max-w-[240px] cursor-pointer"
                  >
                    {insp}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ─── 02 · FORMAT (RATIO), CADENCE & AUDIO SOLIDAIRES ─── */}
          <section className="studio-box" id="step-format">
            <div className="studio-box-header">
              <div className="studio-box-title">
                <Monitor className="w-4 h-4 text-[#e5c15a]" />
                <span>02 · Format (Ratio), Durée & Audio</span>
              </div>
              <span className="studio-badge-subtle text-[#e5c15a]">
                {scenesCount} scènes × {durationPerScene}s = {totalRuntimeSeconds}s
              </span>
            </div>

            {/* SÉLECTEUR DE RATIO VISUEL & PROFESSIONNEL */}
            <div className="mb-4">
              <label className="field-label mb-2">Ratio d'affichage visuel</label>
              <div className="ratio-grid">
                {/* 9:16 Vertical */}
                <div
                  onClick={() => setAspectRatio('9:16')}
                  className={`ratio-card ${aspectRatio === '9:16' ? 'active' : ''}`}
                >
                  <div className="ratio-viewport-icon r-9-16"></div>
                  <span className="ratio-value">9:16</span>
                  <span className="ratio-desc">TikTok / Reels / Shorts</span>
                </div>

                {/* 16:9 Paysage */}
                <div
                  onClick={() => setAspectRatio('16:9')}
                  className={`ratio-card ${aspectRatio === '16:9' ? 'active' : ''}`}
                >
                  <div className="ratio-viewport-icon r-16-9"></div>
                  <span className="ratio-value">16:9</span>
                  <span className="ratio-desc">Cinéma / YouTube / TV</span>
                </div>

                {/* 1:1 Carré */}
                <div
                  onClick={() => setAspectRatio('1:1')}
                  className={`ratio-card ${aspectRatio === '1:1' ? 'active' : ''}`}
                >
                  <div className="ratio-viewport-icon r-1-1"></div>
                  <span className="ratio-value">1:1</span>
                  <span className="ratio-desc">Carré / Feed Instagram</span>
                </div>

                {/* 4:3 Classique */}
                <div
                  onClick={() => setAspectRatio('4:3')}
                  className={`ratio-card ${aspectRatio === '4:3' ? 'active' : ''}`}
                >
                  <div className="ratio-viewport-icon r-4-3"></div>
                  <span className="ratio-value">4:3</span>
                  <span className="ratio-desc">Classique / Rétro TV</span>
                </div>
              </div>
            </div>

            {/* PARAMÈTRES SOLIDAIRES : DÉCOUPAGE, CADENCE & QUALITÉ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#2a2a3a]">
              {/* Nombre de scènes */}
              <div>
                <label className="field-label">Nombre de séquences</label>
                <select
                  value={scenesCount}
                  onChange={(e) => setScenesCount(Number(e.target.value))}
                >
                  <option value="3">3 séquences (Format court)</option>
                  <option value="5">5 séquences (Équilibré)</option>
                  <option value="6">6 séquences (Épisodique)</option>
                  <option value="8">8 séquences (Film étendu)</option>
                  <option value="10">10 séquences (Long format)</option>
                </select>
              </div>

              {/* Durée par scène */}
              <div>
                <label className="field-label">Durée unitaire par scène</label>
                <select
                  value={durationPerScene}
                  onChange={(e) => setDurationPerScene(Number(e.target.value))}
                >
                  <option value="5">5 secondes (Très vif)</option>
                  <option value="10">10 secondes (Dynamique)</option>
                  <option value="15">15 secondes (Standard)</option>
                </select>
              </div>

              {/* Qualité */}
              <div>
                <label className="field-label">Résolution de rendu</label>
                <select
                  value={videoQuality}
                  onChange={(e) => setVideoQuality(e.target.value)}
                >
                  <option value="1080P">1080p Full HD</option>
                  <option value="720P">720p HD</option>
                </select>
              </div>
            </div>

            {/* OPTIONS AUDIO SOLIDAIRES */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 mt-3 rounded-md bg-[#12121c] border border-[#2a2a3a]">
              <label className="flex items-center gap-2.5 text-xs text-[#e8e6e0] cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableVoice}
                  onChange={(e) => setEnableVoice(e.target.checked)}
                  className="w-4 h-4 accent-[#e5c15a]"
                />
                <Mic className="w-3.5 h-3.5 text-[#e5c15a]" />
                <span>Voix off française synchronisée (TTS avec sous-titres mot par mot)</span>
              </label>

              <div className="flex items-center gap-2 text-xs text-[#8a8896]">
                <span>Cadence :</span>
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="!p-1 !mb-0 text-xs w-28"
                >
                  <option value="0.9">0.9x (Posé)</option>
                  <option value="1.0">1.0x (Standard)</option>
                  <option value="1.15">1.15x (Dynamique)</option>
                  <option value="1.25">1.25x (Vif)</option>
                </select>
              </div>
            </div>
          </section>

          {/* ─── 03 · STYLE & DIRECTION ARTISTIQUE (90 STYLES) ─── */}
          <section className="studio-box" id="step-styles">
            <div className="studio-box-header">
              <div className="studio-box-title">
                <Film className="w-4 h-4 text-[#e5c15a]" />
                <span>03 · Style visuel ({ALL_MODES.length} modes disponibles)</span>
              </div>
              <span className="studio-badge-subtle text-[#e5c15a]">
                Sélectionné : #{activeMode.n} · {activeMode.name}
              </span>
            </div>

            {/* Filtres de catégorie segmentés */}
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8896]" />
                <input
                  type="text"
                  placeholder="Filtrer parmi les 90 styles (ex: JT, Anderson, Fiction, Manga, 941…)"
                  value={modeSearch}
                  onChange={(e) => setModeSearch(e.target.value)}
                  className="!pl-9 !mb-0 text-xs"
                />
              </div>

              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setModeCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer border ${
                    modeCategoryFilter === 'all'
                      ? 'bg-[#e5c15a]/20 border-[#e5c15a] text-[#e5c15a]'
                      : 'bg-[#12121c] border-[#2a2a3a] text-[#8a8896] hover:text-[#e8e6e0]'
                  }`}
                >
                  Tous ({ALL_MODES.length})
                </button>
                <button
                  type="button"
                  onClick={() => setModeCategoryFilter('tiktok')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer border ${
                    modeCategoryFilter === 'tiktok'
                      ? 'bg-[#e5c15a]/20 border-[#e5c15a] text-[#e5c15a]'
                      : 'bg-[#12121c] border-[#2a2a3a] text-[#8a8896] hover:text-[#e8e6e0]'
                  }`}
                >
                  📱 TikTok (50)
                </button>
                <button
                  type="button"
                  onClick={() => setModeCategoryFilter('films')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer border ${
                    modeCategoryFilter === 'films'
                      ? 'bg-[#e5c15a]/20 border-[#e5c15a] text-[#e5c15a]'
                      : 'bg-[#12121c] border-[#2a2a3a] text-[#8a8896] hover:text-[#e8e6e0]'
                  }`}
                >
                  🎬 Cinéma (20)
                </button>
                <button
                  type="button"
                  onClick={() => setModeCategoryFilter('series')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer border ${
                    modeCategoryFilter === 'series'
                      ? 'bg-[#e5c15a]/20 border-[#e5c15a] text-[#e5c15a]'
                      : 'bg-[#12121c] border-[#2a2a3a] text-[#8a8896] hover:text-[#e8e6e0]'
                  }`}
                >
                  📺 Séries (20)
                </button>
              </div>
            </div>

            {/* Grille compacte des cartes de styles */}
            <div className="mode-grid">
              {displayedModes.map((m) => {
                const isSelected = activeMode.n === m.n;
                return (
                  <button
                    key={m.n}
                    type="button"
                    onClick={() => handleSelectMode(m)}
                    className={`mode-card ${isSelected ? 'active' : ''}`}
                  >
                    <span className="text-[10px] font-mono-custom text-[#8a8896]">#{m.n}</span>
                    <span className="mode-name">{m.name}</span>
                    <span className="text-[9px] font-mono-custom text-[#8a8896]">
                      {m.scenes}s × {m.duration}s
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Toggle Afficher tout */}
            {!modeSearch && (
              <div className="text-center mt-3">
                <button
                  type="button"
                  onClick={() => setShowAllModes((prev) => !prev)}
                  className="px-3.5 py-1.5 rounded-md bg-[#12121c] border border-[#2a2a3a] hover:border-[#e5c15a] text-xs text-[#e5c15a] font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  {showAllModes ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      Réduire la vue des styles
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      Afficher tous les {filteredModes.length} styles
                    </>
                  )}
                </button>
              </div>
            )}
          </section>

          {/* ─── 04 · BOUTON D'ACTION PRINCIPAL ─── */}
          <div className="my-5">
            <button
              type="button"
              className={`btn btn-primary pulse-btn w-full ${isGenerating ? 'opacity-70 pointer-events-none' : ''}`}
              onClick={handleLaunch}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <div className="spinner"></div>
                  <span>Génération en cours… ({activeMode.name})</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>Générer le projet vidéo ({activeMode.name} · {aspectRatio} · {totalRuntimeSeconds}s)</span>
                </>
              )}
            </button>

            {isGenerating && (
              <button
                type="button"
                className="btn btn-danger mt-2"
                onClick={handleStop}
              >
                Arrêter la génération
              </button>
            )}
          </div>

          {/* ─── 05 · RÉSULTATS DU PROJET & STUDIO DE VISIONNAGE ─── */}
          {project && (
            <div id="project-results" className="mt-8 space-y-6">

              {/* Fiche Scénario */}
              <div className="script-summary">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h2 className="script-summary-title">🎬 {project.title}</h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startPlayerOverlay(0)}
                      className="px-3.5 py-1.5 rounded-md bg-[#e5c15a] text-[#0a0a12] font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-[#e87b35] transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Visionner en plein écran
                    </button>
                    <button
                      type="button"
                      onClick={handleExportZip}
                      disabled={isExportingZip}
                      className="px-3 py-1.5 rounded-md bg-[#12121c] border border-[#2a2a3a] hover:border-[#4a9d6a] text-xs font-semibold text-[#4a9d6a] flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {isExportingZip ? 'Export ZIP…' : 'Pack ZIP complet'}
                    </button>
                  </div>
                </div>

                <p className="script-summary-logline">« {project.synopsis} »</p>

                <div className="script-summary-meta">
                  <span>Style : #{activeMode.n} {activeMode.name}</span>
                  <span>·</span>
                  <span>{project.scenes.length} séquences</span>
                  <span>·</span>
                  <span>Ratio : {project.aspectRatio}</span>
                </div>

                <div className="mt-3 pt-2 border-t border-[#2a2a3a]">
                  <button
                    type="button"
                    onClick={() => setShowScriptDetails((prev) => !prev)}
                    className="script-details-toggle"
                  >
                    {showScriptDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    <span>{showScriptDetails ? 'Masquer le script détaillé' : 'Voir le script détaillé'}</span>
                  </button>

                  {showScriptDetails && (
                    <div className="mt-3 space-y-2">
                      {project.scenes.map((s) => (
                        <div key={s.sceneNumber} className="p-2.5 rounded-md bg-[#12121c] border border-[#2a2a3a] text-xs space-y-1">
                          <div className="font-semibold text-[#e5c15a]">
                            Scène #{s.sceneNumber} : {s.title} ({s.duration}s)
                          </div>
                          <div className="text-[#e8e6e0] italic">
                            🗣 « {s.voiceover} »
                          </div>
                          <div className="text-[#8a8896]">
                            Plan : {s.visualDescription}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Grille des séquences générées */}
              <div className="studio-box">
                <div className="studio-box-header">
                  <div className="studio-box-title">
                    <Film className="w-4 h-4 text-[#e5c15a]" />
                    <span>Séquences vidéo prêtes ({project.scenes.length})</span>
                  </div>
                  <span className="studio-badge-subtle">
                    Format : {project.aspectRatio}
                  </span>
                </div>

                <div className="videos-grid">
                  {project.scenes.map((scene, idx) => (
                    <div
                      key={scene.sceneNumber}
                      className={`scene-card ${scene.status === 'generating' ? 'generating' : 'done'}`}
                    >
                      <div className="scene-card-header">
                        <span className="scene-card-title truncate">
                          #{scene.sceneNumber} · {scene.title}
                        </span>
                        <span className="text-[10px] font-mono-custom text-[#e5c15a] shrink-0">
                          {scene.duration}s
                        </span>
                      </div>

                      <div className="scene-card-body">
                        {scene.videoUrl ? (
                          <video
                            src={scene.videoUrl}
                            data-ratio={aspectRatio}
                            muted
                            playsInline
                            loop
                            autoPlay
                            onClick={() => startPlayerOverlay(idx)}
                            className="cursor-pointer rounded"
                          />
                        ) : scene.thumbnailUrl ? (
                          <div
                            className="relative cursor-pointer group rounded overflow-hidden"
                            onClick={() => startPlayerOverlay(idx)}
                          >
                            <img
                              src={scene.thumbnailUrl}
                              alt={scene.title}
                              className="w-full object-cover"
                              style={{
                                aspectRatio: aspectRatio === '16:9' ? '16/9' : aspectRatio === '1:1' ? '1/1' : aspectRatio === '4:3' ? '4/3' : '9/16'
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                              <Play className="w-8 h-8 text-[#e5c15a] opacity-90 group-hover:scale-110 transition-transform" />
                            </div>
                          </div>
                        ) : (
                          <div className="scene-placeholder">
                            <div className="spinner"></div>
                            <span>Rendu…</span>
                          </div>
                        )}

                        <div className="text-[11px] text-[#8a8896] line-clamp-2 italic">
                          « {scene.voiceover} »
                        </div>

                        <div className="flex gap-1.5 mt-1">
                          <button
                            type="button"
                            onClick={() => startPlayerOverlay(idx)}
                            className="btn btn-secondary !min-h-[36px] !p-1.5 text-xs flex-1"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Lire</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadScene(scene)}
                            className="btn-download !min-h-[36px] !p-1.5 text-xs flex-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Télécharger</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </main>
      )}

      {/* ════════════ PAGE PRÉFÉRENCES ════════════ */}
      {currentPage === 'preferences' && (
        <main className="page active" id="page-preferences">
          <div className="subpage-header">
            <button
              type="button"
              className="btn-back"
              onClick={() => navigateTo('home')}
            >
              ←
            </button>
            <div className="subpage-title">
              <Settings className="w-5 h-5 text-[#e5c15a]" />
              <span>Paramètres & Diagnostic</span>
            </div>
          </div>

          <div className="studio-box space-y-4">
            <div className="pref-row">
              <div className="pref-info">
                <div className="pref-title">Thème de l'interface</div>
                <div className="pref-desc">Basculer entre sombre, clair ou synchronisé avec votre système.</div>
              </div>
              <div className="pref-action">
                <select
                  value={theme}
                  onChange={(e) => applyThemeMode(e.target.value as any)}
                  className="!mb-0 text-xs w-36"
                >
                  <option value="auto">Système (Auto)</option>
                  <option value="dark">Sombre (Cinéma)</option>
                  <option value="light">Clair (Papier)</option>
                </select>
              </div>
            </div>

            <div className="pref-row">
              <div className="pref-info">
                <div className="pref-title">Confidentialité & Stockage Local</div>
                <div className="pref-desc">Données enregistrées localement dans votre navigateur (localStorage). Aucun compte requis.</div>
              </div>
              <div className="pref-action">
                <span className="text-xs text-[#4a9d6a] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  100% Local
                </span>
              </div>
            </div>

            <div className="pref-row">
              <div className="pref-info">
                <div className="pref-title">Workers Agnes AI (Optionnel)</div>
                <div className="pref-desc">Ajouter des clés API pour paralléliser la génération de vidéos.</div>
              </div>
              <div className="pref-action">
                <button
                  type="button"
                  onClick={() => navigateTo('account')}
                  className="px-3 py-1.5 rounded bg-[#1a1a28] border border-[#2a2a3a] hover:border-[#e5c15a] text-[#e5c15a] text-xs font-semibold cursor-pointer"
                >
                  Gérer les clés ({keysList.length})
                </button>
              </div>
            </div>
          </div>

          {/* Console de logs */}
          <div className="studio-box mt-4">
            <div className="studio-box-header">
              <div className="studio-box-title">
                <Terminal className="w-4 h-4 text-[#e5c15a]" />
                <span>Journal d'activité technique ({logs.length})</span>
              </div>
              <button
                type="button"
                onClick={() => setLogs([])}
                className="text-xs text-[#8a8896] hover:text-[#e8e6e0] underline cursor-pointer"
              >
                Effacer
              </button>
            </div>

            <div className="console" ref={consoleViewRef}>
              {logs.length === 0 ? (
                <div className="text-center py-4 text-[#4a4858] text-xs">
                  Aucun log pour l'instant.
                </div>
              ) : (
                logs.map((l) => (
                  <div key={l.id} className={`c-line ${l.type}`}>
                    <span className="c-time">[{l.time}]</span>
                    <span className="c-tag">[{l.type.toUpperCase()}]</span>
                    <span>{l.msg}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      )}

      {/* ════════════ PAGE GESTION DES CLÉS (OPTIONNEL) ════════════ */}
      {currentPage === 'account' && (
        <main className="page active" id="page-account">
          <div className="subpage-header">
            <button
              type="button"
              className="btn-back"
              onClick={() => navigateTo('home')}
            >
              ←
            </button>
            <div className="subpage-title">
              <Key className="w-5 h-5 text-[#e5c15a]" />
              <span>Workers Agnes AI (Optionnel)</span>
            </div>
          </div>

          <div className="studio-box space-y-4">
            <p className="text-xs text-[#8a8896] leading-relaxed">
              L'application fonctionne immédiatement <strong>sans aucune clé</strong> grâce au moteur Canvas HD et au TTS local. Pour des rendus vidéo IA avancés, vous pouvez ajouter vos clés Agnes (<code>sk-...</code>), une par ligne.
            </p>

            <textarea
              rows={4}
              placeholder="sk-agnes-xxxxxxxxxxxxxxxxxxxxxxxx"
              value={apiKeysInput}
              onChange={(e) => setApiKeysInput(e.target.value)}
              className="font-mono-custom text-xs"
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const updated = agnesPool.saveKeys(apiKeysInput);
                  setKeysList(updated);
                  showToast(`${updated.length} clé(s) sauvegardée(s)`, 'success');
                }}
                className="btn btn-primary !w-auto !min-h-[40px] !px-4 text-xs"
              >
                Sauvegarder
              </button>
              <button
                type="button"
                onClick={() => {
                  agnesPool.saveKeys('');
                  setKeysList([]);
                  setApiKeysInput('');
                  showToast('Clés supprimées', 'warn');
                }}
                className="btn btn-danger !w-auto !min-h-[40px] !px-4 text-xs"
              >
                Tout déconnecter
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ════════════ MODAL HISTORIQUE PROJETS RÉCENTS ════════════ */}
      {showRecentModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#16161f] border border-[#2a2a3a] rounded-xl max-w-lg w-full p-5 max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#2a2a3a] mb-3">
              <div className="font-semibold text-sm flex items-center gap-2 text-[#e5c15a]">
                <History className="w-4 h-4" />
                <span>Projets récents sur cet appareil ({recentProjects.length})</span>
              </div>
              <button
                type="button"
                onClick={() => setShowRecentModal(false)}
                className="text-[#8a8896] hover:text-[#e8e6e0] p-1 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {recentProjects.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#8a8896]">
                  Aucun projet sauvegardé pour le moment.
                </div>
              ) : (
                recentProjects.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-[#12121c] border border-[#2a2a3a] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-[#e8e6e0] truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-[#8a8896] truncate">
                        {item.subject}
                      </div>
                      <div className="text-[10px] text-[#4a4858] mt-0.5">
                        {item.modeName} · {item.date}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setProject(item.project);
                        setSubject(item.subject);
                        setShowRecentModal(false);
                        showToast(`Projet « ${item.title} » restauré`, 'success');
                      }}
                      className="px-3 py-1 rounded bg-[#1a1a28] border border-[#2a2a3a] hover:border-[#e5c15a] text-[#e5c15a] font-semibold text-xs shrink-0 cursor-pointer"
                    >
                      Ouvrir
                    </button>
                  </div>
                ))
              )}
            </div>

            {recentProjects.length > 0 && (
              <div className="pt-3 border-t border-[#2a2a3a] mt-3 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Effacer l’historique des projets ?')) {
                      setRecentProjects([]);
                      safeStorage.remove('studio_master_recent_projects');
                      setShowRecentModal(false);
                      showToast('Historique effacé', 'info');
                    }
                  }}
                  className="text-xs text-[#c85a4a] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Tout effacer
                </button>
                <button
                  type="button"
                  onClick={() => setShowRecentModal(false)}
                  className="px-4 py-1.5 rounded bg-[#12121c] border border-[#2a2a3a] text-xs text-[#e8e6e0]"
                >
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════ BOUTON FLOTTANT D'ACTION ════════════ */}
      {currentPage === 'home' && !isOverlayVisible && (
        <button
          type="button"
          onClick={handleLaunch}
          disabled={isGenerating}
          className={`launch-floating visible ${isGenerating ? 'opacity-50 pointer-events-none' : ''}`}
          id="launch-floating"
        >
          {isGenerating ? (
            <>
              <div className="spinner"></div>
              <span>Rendu en cours…</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>Générer ({activeMode.name} · {aspectRatio})</span>
            </>
          )}
        </button>
      )}

      {/* ════════════ STATUS BAR ════════════ */}
      <div className={`status-bar ${statusBar.visible ? 'visible' : ''}`}>
        <div className="spinner"></div>
        <span>{statusBar.text}</span>
      </div>

      {/* ════════════ TOAST ════════════ */}
      <div className={`toast ${toast.visible ? 'visible' : ''} ${toast.type}`}>
        <span>{toast.text}</span>
      </div>

      {/* ════════════ ASSISTANT IA FLOTTANT ════════════ */}
      <button
        type="button"
        id="assistant-bubble"
        className="assistant-bubble"
        onClick={() => setIsAssistantOpen((prev) => !prev)}
        title="Assistant Studio Master"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      <div className={`assistant-panel ${isAssistantOpen ? 'visible' : ''}`}>
        <div className="assistant-header">
          <div className="assistant-title">
            <Sparkles className="w-4 h-4 text-[#e5c15a]" />
            <span>Assistant Studio</span>
          </div>
          <button
            type="button"
            className="assistant-close"
            onClick={() => setIsAssistantOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className="assistant-messages">
          {assistantMessages.map((msg) => (
            <div key={msg.id} className={`assistant-msg ${msg.sender}`}>
              <div>{msg.text}</div>
              {msg.action && (
                <button
                  type="button"
                  onClick={msg.action.onClick}
                  className="assistant-action-chip"
                >
                  {msg.action.label}
                </button>
              )}
            </div>
          ))}
          {isAssistantTyping && (
            <div className="assistant-msg typing">
              <div className="dot-typing"></div>
              <div className="dot-typing"></div>
              <div className="dot-typing"></div>
            </div>
          )}
          <div ref={assistantMessagesEndRef} />
        </div>

        <div className="assistant-suggestions">
          <button
            type="button"
            className="assistant-suggestion"
            onClick={() => handleSendAssistantMessage("Donne-moi une idée de vidéo originale")}
          >
            💡 Proposer une idée
          </button>
          <button
            type="button"
            className="assistant-suggestion"
            onClick={() => handleSendAssistantMessage("Active le mode JT 60s")}
          >
            📺 Activer JT 60s
          </button>
        </div>

        <div className="assistant-input-row">
          <textarea
            className="assistant-input"
            rows={1}
            placeholder="Écrivez un message…"
            value={assistantInput}
            onChange={(e) => setAssistantInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendAssistantMessage(assistantInput);
                setAssistantInput('');
              }
            }}
          />
          <button
            type="button"
            className="assistant-send"
            disabled={!assistantInput.trim() || isAssistantTyping}
            onClick={() => {
              handleSendAssistantMessage(assistantInput);
              setAssistantInput('');
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ════════════ PLAYER OVERLAY PLEIN ÉCRAN ════════════ */}
      <div className={`player-overlay ${isOverlayVisible ? 'visible' : ''}`}>
        <button
          type="button"
          className="player-close"
          onClick={() => {
            setIsOverlayVisible(false);
            audioEngine.stopSpeech();
            audioEngine.stopAmbientMusic();
          }}
          title="Fermer le lecteur (Échap)"
        >
          ✕
        </button>

        <canvas ref={overlayCanvasRef} />

        <div className="player-hint-overlay">
          <span>Espace : {isOverlayPlaying ? 'Pause' : 'Reprendre'} · Échap : Fermer</span>
        </div>
      </div>
    </>
  );
}
