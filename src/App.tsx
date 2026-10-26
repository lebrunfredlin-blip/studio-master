import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import {
  ALL_MODES,
  ModeItem,
  WA_PALETTES
} from './data/catalog';
import {
  GeneratedProject,
  GeneratedScene,
  parseScenarioWith5Strategies,
  generateProceduralFallback
} from './services/parser';
import { agnesPool, AgnesKeyStatus } from './services/agnesApi';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User
} from './services/firebase';

function translateFirebaseError(error: any): string {
  const code = error?.code || '';
  if (code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized domain') || error?.message?.includes('Domaine non autorisé')) {
    const domain = typeof window !== 'undefined' ? window.location.hostname : '';
    console.error(`[Firebase Auth Error] Domaine non autorisé : "${domain}". Veuillez ajouter "${domain}" dans la Console Firebase -> Authentication -> Settings -> Authorized domains.`);
    return `auth/unauthorized-domain: Domaine non autorisé ("${domain}"). Veuillez ajouter ce domaine dans la Console Firebase (Authentication > Domaines autorisés).`;
  }
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email ou mot de passe incorrect.';
    case 'auth/email-already-in-use':
      return 'Cet email est déjà utilisé par un autre compte.';
    case 'auth/weak-password':
      return 'Le mot de passe doit contenir au moins 6 caractères.';
    case 'auth/invalid-email':
      return 'Format d\'adresse email invalide.';
    case 'auth/popup-closed-by-user':
      return 'Connexion annulée (fenêtre fermée).';
    case 'auth/popup-blocked':
      return 'Fenêtre surgissante bloquée par le navigateur.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Veuillez réessayer plus tard.';
    case 'auth/network-request-failed':
      return 'Erreur de réseau. Vérifiez votre connexion internet.';
    default:
      return error?.message || 'Une erreur de connexion est survenue.';
  }
}
import { videoRenderer } from './services/videoRenderer';
import { audioEngine } from './services/audioEngine';

interface LogItem {
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

const TUTORIAL_STORAGE = 'studio_master_tour_v52';

const TOUR_STEPS = [
  {
    icon: '✏️',
    title: 'Écris ton idée',
    text: "Commence par décrire <strong>ce que tu veux raconter</strong>. Un personnage, un lieu, une action. Sois précis, l'IA fera le reste.",
    targetId: 'subject-input'
  },
  {
    icon: '🎨',
    title: 'Choisis un style',
    text: "Tu as <strong>90 styles</strong> disponibles. TikTok pour du court, Films pour du long. Clique sur celui qui te plaît.",
    targetId: 'mode-categories'
  },
  {
    icon: '▶️',
    title: 'Lance la génération',
    text: "Appuie sur <strong>le bouton flottant en bas</strong>. L'IA écrit le scénario, dessine les images et crée les vidéos en 3 à 10 minutes.",
    targetId: 'launch-floating'
  },
  {
    icon: '🤖',
    title: "Besoin d'aide ?",
    text: "Clique sur <strong>la bulle Assistant</strong> en bas à droite. Il répond à toutes tes questions sur l'app.",
    targetId: 'assistant-bubble'
  }
];

const HELP_CONTENT: Record<string, { icon: string; title: string; body: string; example?: string }> = {
  subject: {
    icon: '✏️',
    title: 'Le sujet',
    body: "C'est <strong>l'idée de ton histoire</strong>. Décris un personnage, un lieu, une action. Plus c'est précis, meilleur sera le résultat. <br><br>❌ À éviter : \"une vidéo sympa\"<br>✅ À faire : \"Un chaton astronaute découvre une planète pastel\"",
    example: 'Ex : "La campagne municipale de La France insoumise à Roubaix" ou "Un chaton détective enquête dans un Paris rétrofuturiste".'
  },
  style: {
    icon: '🎨',
    title: 'Les styles',
    body: "Il y a <strong>90 styles</strong> au total :<br>• <strong>📱 TikTok</strong> = 3 scènes × 15s (format court)<br>• <strong>🎬 Films & Séries</strong> = 6 à 10 scènes × 8s (format long)<br><br>Chaque style a son ambiance visuelle unique (Wes Anderson, Cyberpunk, Film Noir…).",
    example: 'Pour un test rapide → TikTok. Pour une vraie histoire → Films & Séries.'
  },
  script: {
    icon: '📜',
    title: 'Le scénario',
    body: "Une fois la génération lancée, l'IA écrit d'abord <strong>l'histoire complète</strong> : un titre, une accroche, des personnages et des scènes. Tu peux voir le détail en cliquant sur \"Voir le détail des scènes\".",
    example: 'Chaque scène contient : décor, personnage, dialogue FR, mouvement de caméra.'
  },
  videos: {
    icon: '🎞️',
    title: 'Les vidéos',
    body: "Une fois les scènes générées, tu vois chaque vidéo apparaître avec un <strong>bouton vert \"Télécharger\"</strong>. Tu peux aussi tout télécharger en une fois avec le bouton \"Tout télécharger (ZIP)\" en bas.",
    example: 'Les vidéos sont en MP4, lisibles partout (téléphone, ordinateur, tablette).'
  },
  account: {
    icon: '🔗',
    title: 'Le compte IA',
    body: "Pour que l'IA puisse générer tes vidéos, elle a besoin d'une <strong>autorisation gratuite</strong>. C'est ce qu'on appelle un \"compte IA\" (ou clé API).<br><br>1. Clique sur \"Créer un compte gratuit\"<br>2. Inscris-toi sur platform.agnes-ai.com<br>3. Copie ton code de connexion (sk-...)<br>4. Colle-le ici et clique \"Connecter\"",
    example: "Tu ne le fais qu'une seule fois. Ensuite, toutes les générations sont automatiques."
  },
  params: {
    icon: '⚙️',
    title: 'Paramètres avancés',
    body: "Ces réglages contrôlent <strong>le nombre de scènes et leur durée</strong>. Laisse les valeurs par défaut pour un résultat optimal. Si tu changes, sache que :<br>• Plus de scènes = plus long à générer<br>• Scènes plus longues = plus immersif",
    example: 'Par défaut : 3 scènes × 8s pour TikTok, 10 scènes × 8s pour Films.'
  }
};

export default function App() {
  // Splash screen init
  useEffect(() => {
    const splashStart = Date.now();
    const MIN_DISPLAY = 800;
    const MAX_DISPLAY = 3000;
    
    function hideSplash() {
      const splash = document.getElementById('splash-screen');
      if (!splash) return;
      const elapsed = Date.now() - splashStart;
      const waitMore = Math.max(0, MIN_DISPLAY - elapsed);
      setTimeout(() => {
        splash.classList.add('fade-out');
        setTimeout(() => {
          splash.style.display = 'none';
        }, 450);
      }, waitMore);
    }
    
    window.addEventListener('load', hideSplash);
    const timer = setTimeout(() => {
      const splash = document.getElementById('splash-screen');
      if (splash && !splash.classList.contains('fade-out')) hideSplash();
    }, MAX_DISPLAY);
    return () => {
      window.removeEventListener('load', hideSplash);
      clearTimeout(timer);
    };
  }, []);
  // ─── ROUTER & AUTH STATE ───
  const [currentPage, setCurrentPage] = useState<'home' | 'account' | 'preferences' | 'auth'>('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [pendingLaunchAfterAuth, setPendingLaunchAfterAuth] = useState<boolean>(false);

  // Auth Form State
  const [showEmailForm, setShowEmailForm] = useState<boolean>(false);
  const [isSignUpMode, setIsSignUpMode] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState<boolean>(false);

  // ─── KEYS & STATS ───
  const [apiKeysInput, setApiKeysInput] = useState<string>('');
  const [keysList, setKeysList] = useState<AgnesKeyStatus[]>([]);
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
  const [testKeyStatus, setTestKeyStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [testKeyMessage, setTestKeyMessage] = useState<string>('✓ Vérifier');
  const [stats, setStats] = useState<{ videos: number; images: number }>({ videos: 0, images: 0 });

  // ─── CREATIVE STATE ───
  const [activeMode, setActiveMode] = useState<ModeItem>(ALL_MODES[0]); // #941 TikTok JT 60s
  const [subject, setSubject] = useState<string>('');
  const [scenesCount, setScenesCount] = useState<number>(3);
  const [durationPerScene, setDurationPerScene] = useState<number>(15);
  const [totalTargetDuration, setTotalTargetDuration] = useState<number>(60);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1' | '4:3'>('9:16');
  const [selectedPalette, setSelectedPalette] = useState<string>('pink-mint');
  const [enableVoice, setEnableVoice] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [videoQuality, setVideoQuality] = useState<string>('1080P');
  const [tiktokExpanded, setTiktokExpanded] = useState<boolean>(false);
  const [filmsExpanded, setFilmsExpanded] = useState<boolean>(false);

  // ─── PREFERENCES & THEME ───
  const [theme, setTheme] = useState<'auto' | 'light' | 'dark'>('auto');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState<boolean>(false);
  const [showAdvancedPanel, setShowAdvancedPanel] = useState<boolean>(false);
  const [showScriptDetails, setShowScriptDetails] = useState<boolean>(false);

  // ─── PROJECT STATE ───
  const [project, setProject] = useState<GeneratedProject | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [recentProjects, setRecentProjects] = useState<RecentProjectItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('studio_master_recent_projects_v52');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecentProjects(parsed);
      }
    } catch {}
  }, []);

  const saveProjectToRecent = (proj: GeneratedProject, subj: string, modeName: string) => {
    const newItem: RecentProjectItem = {
      id: Math.random().toString(36).substring(2, 9),
      title: proj.title,
      subject: subj,
      modeName,
      date: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('fr-FR'),
      project: proj
    };
    setRecentProjects((prev) => {
      const updated = [newItem, ...prev.filter(p => p.subject !== subj)].slice(0, 5);
      try {
        localStorage.setItem('studio_master_recent_projects_v52', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleLoadRecentProject = (item: RecentProjectItem) => {
    setProject(item.project);
    setSubject(item.subject);
    showToast(`Projet chargé : "${item.title}"`, 'success');
    addLog('success', `Projet récent chargé : ${item.title}`);
  };

  const handleClearRecentProjects = () => {
    if (!confirm('Effacer l\'historique des projets récents ?')) return;
    setRecentProjects([]);
    try {
      localStorage.removeItem('studio_master_recent_projects_v52');
    } catch {}
    showToast('Historique effacé', 'warn');
  };

  // ─── PLAYER OVERLAY ───
  const [isOverlayVisible, setIsOverlayVisible] = useState<boolean>(false);
  const [currentPlaySceneIdx, setCurrentPlaySceneIdx] = useState<number>(0);
  const [isOverlayPlaying, setIsOverlayPlaying] = useState<boolean>(true);
  const [overlayProgress, setOverlayProgress] = useState<number>(0);
  const [spokenWordIndex, setSpokenWordIndex] = useState<number>(-1);
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
(function() {
  const splashStart = Date.now();
  const MIN_DISPLAY = 800;
  const MAX_DISPLAY = 3000;
  
  function hideSplash() {
    const splash = document.getElementById('splash-screen');
    if (!splash) return;
    const elapsed = Date.now() - splashStart;
    const waitMore = Math.max(0, MIN_DISPLAY - elapsed);
    setTimeout(() => {
      splash.classList.add('fade-out');
      setTimeout(() => {
        splash.style.display = 'none';
      }, 450);
    }, waitMore);
  }
  
  window.addEventListener('load', hideSplash);
  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash && !splash.classList.contains('fade-out')) hideSplash();
  }, MAX_DISPLAY);
})();

  // ─── TUTORIAL STATE ───
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [spotlightRect, setSpotlightRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [arrowPos, setArrowPos] = useState<{ top: number; left: number } | null>(null);

  // ─── CONTEXTUAL HELP POPOVER STATE ───
  const [helpPopover, setHelpPopover] = useState<{ key: string; top: number; left: number } | null>(null);

  // ─── ASSISTANT IA STATE ───
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);
  const [assistantUnreadCount, setAssistantUnreadCount] = useState<number>(1);
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: "Bonjour ! Je suis l'Assistant Studio Master 🤖. Besoin d'une idée de sujet percutant, d'aide pour choisir parmi nos 90 modes ou pour configurer vos clés API ?",
      action: {
        label: "💡 Donner une idée de vidéo",
        onClick: () => {
          handleSendAssistantMessage("Donne-moi une idée de vidéo originale");
        }
      }
    }
  ]);
  const [assistantInput, setAssistantInput] = useState<string>('');
  const [isAssistantTyping, setIsAssistantTyping] = useState<boolean>(false);
  const assistantMessagesEndRef = useRef<HTMLDivElement | null>(null);

  // ─── NOTIFICATION & AUDIO REFS ───
  const titleBlinkRef = useRef<any>(null);
  const originalTitleRef = useRef<string>(document.title);

  // ─── LOGS, TOAST, STATUS BAR ───
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [toast, setToast] = useState<{ visible: boolean; type: 'info' | 'success' | 'warn' | 'error'; text: string }>({
    visible: false,
    type: 'info',
    text: ''
  });
  const [statusBar, setStatusBar] = useState<{ visible: boolean; text: string }>({
    visible: false,
    text: 'Préparation…'
  });

  // Refs
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const consoleViewRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sceneStartMsRef = useRef<number>(Date.now());
  const pausedProgressRef = useRef<number>(0);

  // Log helper
  const addLog = (type: LogItem['type'], msg: string) => {
    const d = new Date();
    const time = d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
    setLogs((prev) => [
      ...prev.slice(-600),
      { id: Math.random().toString(36).substring(2, 9), time, type, msg }
    ]);
  };

  const showToast = (text: string, type: 'info' | 'success' | 'warn' | 'error' = 'success', duration = 3000) => {
    setToast({ visible: true, type, text });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, duration);
  };

  // Assistant IA Message Handler
  const handleSendAssistantMessage = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || isAssistantTyping) return;

    const userMsgId = 'msg-' + Date.now();
    const newMsg: AssistantMessage = {
      id: userMsgId,
      sender: 'user',
      text
    };

    setAssistantMessages((prev) => [...prev, newMsg]);
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

    const lower = text.toLowerCase();

    // Direct mode activation shortcuts
    if (lower.includes('jt 60s') || lower.includes('mode 941')) {
      const mode941 = ALL_MODES.find((m) => m.n === 941) || ALL_MODES[0];
      setActiveMode(mode941);
      setTimeout(() => {
        setIsAssistantTyping(false);
        setAssistantMessages((prev) => [
          ...prev,
          {
            id: 'bot-' + Date.now(),
            sender: 'bot',
            text: "✅ Le mode #941 — TikTok JT 60s est désormais activé ! Vous êtes prêt à créer un flash d'info dynamique.",
            action: {
              label: "✨ Écrire un sujet d'actualité",
              onClick: () => {
                setSubject("Flash info : Une découverte insolite dans les coulisses du Grand Budapest Hotel.");
                navigateTo('home');
                showToast("Sujet d'actualité injecté !", "success");
              }
            }
          }
        ]);
        assistantMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 400);
      return;
    }

    try {
      const res = await fetch('/api/assistant-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, context })
      });
      const data = await res.json();
      const reply = data.reply || "Je suis là pour vous aider ! Que souhaitez-vous créer aujourd'hui ?";

      let action: AssistantMessage['action'] | undefined = undefined;
      if (lower.includes('idée') || lower.includes('sujet') || lower.includes('scénario') || lower.includes('propose')) {
        action = {
          label: "✨ Utiliser comme sujet",
          onClick: () => {
            const clean = reply.replace(/[*#]/g, '').slice(0, 260);
            setSubject(clean);
            navigateTo('home');
            showToast("Sujet appliqué avec succès !", "success");
          }
        };
      } else if (lower.includes('clé') || lower.includes('compte') || lower.includes('agnes')) {
        action = {
          label: "👤 Ouvrir Mon Compte",
          onClick: () => {
            navigateTo('account');
            setIsAssistantOpen(false);
          }
        };
      }

      setAssistantMessages((prev) => [
        ...prev,
        {
          id: 'bot-' + Date.now(),
          sender: 'bot',
          text: reply,
          action
        }
      ]);
    } catch (err: any) {
      let fallbackText = "Pour vos vidéos, vous pouvez choisir parmi 90 modes (TikTok JT, Micro-trottoir, Séries Wes Anderson) et entrer une idée dans l'Étape 1 !";
      if (lower.includes('idée') || lower.includes('sujet')) {
        fallbackText = "💡 Idée : 'L'enquête secrète du Concierge Gustave sur la mystérieuse disparition d'une boîte de chocolats Mendl dans les Alpes.' Esthétique Wes Anderson, plans symétriques parfaits !";
      } else if (lower.includes('clé') || lower.includes('api')) {
        fallbackText = "🔑 Pour obtenir votre clé API Agnes gratuite, rendez-vous sur platform.agnes-ai.com, copiez-la puis collez-la dans la page 'Mon compte' (icône 👤).";
      }
      setAssistantMessages((prev) => [
        ...prev,
        {
          id: 'bot-' + Date.now(),
          sender: 'bot',
          text: fallbackText
        }
      ]);
    } finally {
      setIsAssistantTyping(false);
      setTimeout(() => {
        assistantMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  // Router navigation
  const navigateTo = (page: 'home' | 'account' | 'preferences' | 'auth') => {
    setCurrentPage(page);
    window.location.hash = page === 'home' ? '' : page;
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    navigateTo('home');
  };

  const renderAuthErrorBlock = () => {
    if (!authError) return null;

    const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
    const isUnauthorizedDomain =
      authError.includes('unauthorized-domain') ||
      authError.includes('Domaine non autorisé') ||
      authError.includes('auth/unauthorized-domain');

    if (isUnauthorizedDomain) {
      return (
        <div
          style={{
            background: 'rgba(238, 108, 77, 0.12)',
            border: '1px solid rgba(238, 108, 77, 0.4)',
            borderRadius: '10px',
            padding: '1rem',
            marginBottom: '1.2rem',
            textAlign: 'left',
            fontSize: '0.82rem',
            color: 'var(--ink)'
          }}
        >
          <div style={{ fontWeight: 700, color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem', fontSize: '0.88rem' }}>
            ⚠️ Domaine non autorisé pour Google Sign-In
          </div>
          <p style={{ margin: '0 0 0.6rem 0', color: 'var(--dim)', lineHeight: 1.4 }}>
            Le domaine d'aperçu actuel <code style={{ background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: '4px', color: '#e5c15a', fontFamily: 'monospace' }}>{currentDomain}</code> n'est pas encore enregistré dans votre Console Firebase.
          </p>

          <div style={{ background: 'rgba(229, 193, 90, 0.12)', border: '1px solid rgba(229, 193, 90, 0.3)', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem' }}>
            <strong style={{ color: '#e5c15a', display: 'block', marginBottom: '0.3rem' }}>✨ Solution recommandée (Immédiate) :</strong>
            Utilisez l'inscription/connexion par <strong>Email et Mot de passe</strong> ci-dessous. Elle ne requiert aucune autorisation de domaine et fonctionne tout de suite !
          </div>

          <details style={{ marginTop: '0.5rem', cursor: 'pointer' }}>
            <summary style={{ color: 'var(--acc)', fontWeight: 600, fontSize: '0.8rem' }}>
              🔧 Comment autoriser ce domaine dans Firebase Console ? (Google Sign-In)
            </summary>
            <ol style={{ margin: '0.5rem 0 0 1.2rem', padding: 0, color: 'var(--dim)', fontSize: '0.78rem', lineHeight: 1.5 }}>
              <li>
                Ouvrez la{' '}
                <a
                  href="https://console.firebase.google.com/project/studio-master-2acf7/authentication/settings"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#60a5fa', textDecoration: 'underline', fontWeight: 600 }}
                >
                  Console Firebase → Authentication → Settings ↗
                </a>
              </li>
              <li>Allez dans l'onglet <strong>Settings (Paramètres)</strong> → <strong>Authorized domains (Domaines autorisés)</strong>.</li>
              <li>Cliquez sur <strong>Add domain (Ajouter un domaine)</strong>.</li>
              <li>
                Saisissez le domaine :{' '}
                <code style={{ background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '4px', color: '#e5c15a', userSelect: 'all', fontWeight: 'bold' }}>
                  {currentDomain}
                </code>
              </li>
            </ol>
          </details>
        </div>
      );
    }

    return (
      <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '1.2rem', textAlign: 'center' }}>
        ⚠️ {authError}
      </div>
    );
  };

  // Auth Handlers
  const handleGoogleSignIn = async () => {
    setAuthError('');
    setIsAuthSubmitting(true);
    try {
      addLog('info', 'Utilisation de signInWithRedirect pour Google Auth');
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized domain')) {
        setShowEmailForm(true);
      }
      setAuthError(translateFirebaseError(err));
      setIsAuthSubmitting(false);
    }
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      setAuthError('Veuillez saisir votre email et votre mot de passe.');
      return;
    }
    try {
      setAuthError('');
      setIsAuthSubmitting(true);
      if (isSignUpMode) {
        await createUserWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
        showToast('Compte créé avec succès !', 'success');
      } else {
        await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
        showToast('Connexion réussie !', 'success');
      }
      setShowAuthModal(false);
      if (currentPage === 'auth') navigateTo('home');
    } catch (err: any) {
      setAuthError(translateFirebaseError(err));
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!emailInput || !emailInput.includes('@')) {
      setAuthError('Saisissez votre adresse email pour réinitialiser votre mot de passe.');
      return;
    }
    try {
      setAuthError('');
      await sendPasswordResetEmail(auth, emailInput.trim());
      showToast('Email de réinitialisation envoyé ! Vérifiez votre boîte mail.', 'success', 5000);
    } catch (err: any) {
      setAuthError(translateFirebaseError(err));
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      showToast('Déconnexion réussie', 'info');
      setCurrentPage('auth');
    } catch (err: any) {
      showToast(`Erreur déconnexion : ${err.message}`, 'error');
    }
  };

  // Theme application
  const applyThemeMode = (t: 'auto' | 'light' | 'dark') => {
    setTheme(t);
    try {
      localStorage.setItem('studio_master_theme_v4', t);
    } catch {}
    document.documentElement.classList.remove('light', 'dark');
    if (t === 'light') document.documentElement.classList.add('light');
    else if (t === 'dark') document.documentElement.classList.add('dark');
  };

  const toggleTheme = () => {
    const cycle: Record<string, 'auto' | 'light' | 'dark'> = { auto: 'light', light: 'dark', dark: 'auto' };
    const next = cycle[theme] || 'auto';
    applyThemeMode(next);
    showToast(`Thème : ${next === 'auto' ? 'Suit votre système' : next === 'light' ? 'Clair' : 'Sombre'}`, 'info', 1500);
  };

  // Stats handling
  const loadStoredStats = () => {
    try {
      const raw = localStorage.getItem('studio_master_stats_v4');
      if (raw) {
        const parsed = JSON.parse(raw);
        setStats({ videos: parsed.videos || 0, images: parsed.images || 0 });
      }
    } catch {}
  };

  const incrementStat = (type: 'videos' | 'images') => {
    setStats((prev) => {
      const updated = { ...prev, [type]: prev[type] + 1 };
      try {
        localStorage.setItem('studio_master_stats_v4', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // ─── AUDIO CHIME & NOTIFICATIONS ───
  const playSuccessSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      setTimeout(() => {
        try {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.value = 1320;
          osc2.type = 'sine';
          gain2.gain.setValueAtTime(0.15, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.4);
        } catch {}
      }, 200);
    } catch {}
  };

  const startTitleBlink = (count: number) => {
    if (titleBlinkRef.current) return;
    originalTitleRef.current = document.title;
    let toggle = true;
    titleBlinkRef.current = setInterval(() => {
      document.title = toggle ? `🎉 ${count} vidéo(s) prête(s) !` : originalTitleRef.current;
      toggle = !toggle;
    }, 1000);
  };

  const stopTitleBlink = () => {
    if (titleBlinkRef.current) {
      clearInterval(titleBlinkRef.current);
      titleBlinkRef.current = null;
      document.title = originalTitleRef.current;
    }
  };

  const notifyGenerationComplete = async (count: number) => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch {}
      }
      if (Notification.permission === 'granted' && document.visibilityState === 'hidden') {
        try {
          new Notification('🎬 Studio Master', {
            body: `${count} vidéo(s) prête(s) à télécharger !`,
            tag: 'studio-master-done'
          });
        } catch {}
      }
    }
    startTitleBlink(count);
    playSuccessSound();
  };

  // ══════════════════════════════════════════════════════════════════
  // TUTORIEL SUPPRIMÉ (fonctions vides pour compatibilité)
  // ══════════════════════════════════════════════════════════════════
  const closeTour = () => {};
  const initTour = () => {};
  const attachTourEvents = () => {};
  const attachHelpEvents = () => {};
  const openHelpPopover = () => {};
  const closeHelpPopover = () => {};
  // tutoriel désactivé
  // ⭐ TUTORIEL DÉSACTIVÉ — Plus de blocage possible
  // (les étapes 1, 2, 3 et les bulles d'aide "?" restent)

  // ─── CONTEXTUAL HELP POPOVER HANDLER ───
  const toggleHelp = (key: string, anchorEl: HTMLElement) => {
    if (helpPopover && helpPopover.key === key) {
      setHelpPopover(null);
      return;
    }
    const rect = anchorEl.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    let top = rect.bottom + 8;
    let left = rect.left + rect.width / 2 - 170;
    if (left + 340 > viewportW - 16) left = viewportW - 340 - 16;
    if (left < 16) left = 16;
    if (top + 220 > viewportH - 16) {
      top = Math.max(16, rect.top - 220 - 8);
    }
    setHelpPopover({ key, top, left });
  };

  // Firebase Auth Observer & Redirect Result Handling
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          showToast('Connexion Google réussie !', 'success');
          addLog('success', `Google Redirect : Connecté (${result.user.displayName || result.user.email})`);
          setShowAuthModal(false);
          if (currentPage === 'auth') setCurrentPage('home');
        }
      })
      .catch((err: any) => {
        if (err?.code) {
          if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized domain')) {
            setShowEmailForm(true);
          }
          const msg = translateFirebaseError(err);
          setAuthError(msg);
          addLog('error', `Google Redirect Error: ${err.message}`);
        }
      });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
      if (user) {
        setShowAuthModal(false);
        if (currentPage === 'auth') setCurrentPage('home');
        addLog('success', `Firebase : Connecté (${user.displayName || user.email})`);
      } else {
        addLog('info', 'Firebase : Non connecté');
      }
    });

    return () => unsubscribe();
  }, []);

  // Launch generation after login if user clicked Launch while logged out
  useEffect(() => {
    if (currentUser && pendingLaunchAfterAuth) {
      setPendingLaunchAfterAuth(false);
      setShowAuthModal(false);
      handleLaunch();
    }
  }, [currentUser, pendingLaunchAfterAuth]);

  // ─── EFFECTS ───
  // Mount
  useEffect(() => {
    const loaded = agnesPool.loadKeys();
    setKeysList(loaded);
    setApiKeysInput(loaded.map((k) => k.key).join('\n'));

    const savedTheme = (localStorage.getItem('studio_master_theme_v4') as any) || 'auto';
    applyThemeMode(savedTheme);
    loadStoredStats();

    // Hash sync
    const hash = window.location.hash.replace('#', '');
    if (['home', 'account', 'preferences'].includes(hash)) {
      setCurrentPage(hash as any);
    }

    addLog('success', 'Studio Master v4.0 initialisé · 90 styles disponibles');

    // ⭐ TUTORIEL DÉSACTIVÉ — Plus de blocage possible
    try {
      localStorage.removeItem(TUTORIAL_STORAGE);
    } catch {}

    // PWA event
    const onPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      addLog('info', 'Installation PWA disponible');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', () => {
      setIsPwaInstalled(true);
      setDeferredPrompt(null);
      showToast('Application installée ✓', 'success');
      addLog('success', 'PWA installée');
    });

    const onHashChange = () => {
      const h = window.location.hash.replace('#', '');
      if (['home', 'account', 'preferences'].includes(h)) {
        setCurrentPage(h as any);
      } else {
        setCurrentPage('home');
      }
    };
    window.addEventListener('hashchange', onHashChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);



  // Close help popover on Escape or click outside
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHelpPopover(null);
    };
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.help-popover') || target.closest('.help-bubble')) return;
      setHelpPopover(null);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('click', onDocClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onDocClick);
    };
  }, []);

  // Body floating button padding class
  useEffect(() => {
    if (currentPage === 'home' || isGenerating) {
      document.body.classList.add('has-floating-btn');
    } else {
      document.body.classList.remove('has-floating-btn');
    }
    return () => {
      document.body.classList.remove('has-floating-btn');
    };
  }, [currentPage, isGenerating]);

  // Stop title blink on interaction
  useEffect(() => {
    const onDocClick = () => stopTitleBlink();
    const onVisChange = () => {
      if (document.visibilityState === 'visible') {
        stopTitleBlink();
      }
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('visibilitychange', onVisChange);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('visibilitychange', onVisChange);
      stopTitleBlink();
    };
  }, []);

  // Beforeunload prompt while generating
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isGenerating) {
        e.preventDefault();
        e.returnValue = 'Une génération est en cours. Si vous quittez, elle sera perdue.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isGenerating]);

  // Auto-scroll console
  useEffect(() => {
    if (consoleViewRef.current) {
      consoleViewRef.current.scrollTop = consoleViewRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    setDurationPerScene(Math.max(3, Math.min(15, Math.round(totalTargetDuration / scenesCount))));
  }, [totalTargetDuration, scenesCount]);

  // Keys functions
  const handleSaveKeys = () => {
    const updated = agnesPool.saveKeys(apiKeysInput);
    setKeysList(updated);
    addLog('success', `${updated.length} compte(s) connecté(s) · parallélisme = ${updated.length}`);
    showToast(updated.length > 0 ? `${updated.length} compte(s) connecté(s) ✓` : 'Aucun code valide', updated.length > 0 ? 'success' : 'warn');
  };

  const handleTestKey = async () => {
    const keys = apiKeysInput.split(/\r?\n/).map((l) => l.trim()).filter((k) => k.startsWith('sk-'));
    if (keys.length === 0) {
      showToast('Aucun code valide à vérifier', 'error');
      return;
    }
    const firstKey = keys[0];
    setIsTestingKey(true);
    setTestKeyMessage('⏳ Vérification…');

    const result = await agnesPool.testKey(firstKey);
    setIsTestingKey(false);
    if (result.valid) {
      setTestKeyStatus('ok');
      setTestKeyMessage('✓ Vérifié');
      showToast('Compte IA vérifié et connecté ✓', 'success');
      addLog('success', `Test compte : ${result.message}`);
    } else {
      setTestKeyStatus('err');
      setTestKeyMessage('❌ Invalide');
      showToast('Code de connexion invalide', 'error');
      addLog('error', `Test compte : ${result.message}`);
    }

    setTimeout(() => {
      setTestKeyStatus('idle');
      setTestKeyMessage('✓ Vérifier');
    }, 3000);
  };

  const handleDeleteAllKeys = () => {
    if (!confirm('Déconnecter tous les comptes ? Cette action est irréversible.')) return;
    agnesPool.saveKeys('');
    setKeysList([]);
    setApiKeysInput('');
    showToast('Tous les comptes ont été déconnectés', 'warn');
    addLog('warn', 'Tous les comptes IA déconnectés');
  };

  // PWA install
  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (isIOS) {
        showToast("Sur iOS : Partager → Sur l'écran d'accueil", 'warn', 5000);
      } else {
        showToast('Application déjà installée ou non supportée', 'warn');
      }
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    addLog('info', `PWA : Choix d'installation : ${outcome}`);
    setDeferredPrompt(null);
  };

  // Select Mode
  const handleSelectMode = (m: ModeItem) => {
    setActiveMode(m);
    setScenesCount(m.scenes);
    setDurationPerScene(m.duration);
    setAspectRatio(m.ratio);
    if (m.palette) setSelectedPalette(m.palette);

    const tIdx = tiktokModes.findIndex((item) => item.n === m.n);
    if (tIdx >= 6) setTiktokExpanded(true);

    const fIdx = filmModes.findIndex((item) => item.n === m.n);
    if (fIdx >= 6) setFilmsExpanded(true);

    addLog('info', `Style sélectionné : ${m.name}`);
    showToast(`Style : ${m.name}`, 'info', 1500);
  };

  // Launch Generation Workflow
  const handleLaunch = async () => {
    if (!currentUser) {
      showToast('Connectez-vous d\'abord pour créer une vidéo', 'error');
      setShowAuthModal(true);
      setPendingLaunchAfterAuth(true);
      return;
    }
    if (isGenerating) return;

    const hasKey = keysList.some((k) => k.state === 'active');
    if (!hasKey) {
      showToast('Ajoutez une clé API dans 👤 Mon compte', 'error');
      navigateTo('account');
      return;
    }

    if (subject.trim().length < 5) {
      showToast('Décrivez votre sujet (5 caractères min)', 'error');
      return;
    }

    const qualityEl = document.getElementById('param-quality') as HTMLSelectElement;
    const currentQuality = qualityEl ? qualityEl.value : (videoQuality || '1080P');
    setVideoQuality(currentQuality);

    abortControllerRef.current = new AbortController();
    setIsGenerating(true);
    setStatusBar({ visible: true, text: 'Préparation du scénario…' });

    addLog('info', `--- LANCEMENT DE LA CRÉATION : ${activeMode.name} ---`);
    addLog('ai', `Sujet : « ${subject} » · ${scenesCount} scènes × ${durationPerScene}s · Qualité : ${currentQuality}`);

    try {
      let projectData: GeneratedProject | null = null;

      // 1. Call server API (Gemini or AI Studio proxy)
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
          addLog('ai', 'Scénario reçu. Analyse via le Parser 5-stratégies…');
          projectData = parseScenarioWith5Strategies(
            resJson.raw || JSON.stringify(resJson.data),
            activeMode,
            subject,
            scenesCount,
            durationPerScene,
            aspectRatio,
            addLog
          );
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          addLog('warn', 'Génération arrêtée par l’utilisateur.');
          return;
        }
        addLog('warn', `API serveur : ${err.message}. Utilisation de la Stratégie 5 procédurale.`);
      }

      if (!projectData) {
        projectData = generateProceduralFallback(
          activeMode,
          subject,
          scenesCount,
          durationPerScene,
          aspectRatio
        );
        addLog('success', 'Scénario généré avec succès (Stratégie 5).');
      }

      // 2. Generate Storyboards Thumbnails
      setStatusBar({ visible: true, text: 'Génération des plans visuels…' });
      addLog('info', `Rendu des plans pour ${projectData.scenes.length} séquences…`);

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
      incrementStat('images');
      saveProjectToRecent(projectData, subject.trim(), activeMode.name);

      const generateOneVideo = async (sc: GeneratedScene, quality: string) => {
        try {
          sc.status = 'generating';
          setProject({ ...projectData!, scenes: [...updatedScenes] });
          const vidUrl = await agnesPool.createVideoTask(
            sc.videoPrompt,
            aspectRatio,
            sc.duration,
            quality,
            (prog) => addLog('api', `Scène #${sc.sceneNumber} : ${prog}`)
          );
          sc.videoUrl = vidUrl;
          sc.status = 'done';
          setProject({ ...projectData!, scenes: [...updatedScenes] });
          incrementStat('videos');
          addLog('success', `Vidéo prête pour la scène #${sc.sceneNumber} !`);
        } catch (e: any) {
          addLog('warn', `Scène #${sc.sceneNumber} : Rendu Canvas HD maintenu (${e.message})`);
          sc.status = 'done';
          setProject({ ...projectData!, scenes: [...updatedScenes] });
        }
      };

      // 3. Dispatch to Agnes Video Pool
      const activeKeys = agnesPool.getKeys().filter((k) => k.state === 'active');
      if (activeKeys.length > 0) {
        addLog('api', `Pool Agnes actif (${activeKeys.length} workers). Envoi des requêtes vidéo (Qualité: ${currentQuality})…`);
        setStatusBar({ visible: true, text: `Génération vidéo avec Agnes AI (${currentQuality})…` });

        updatedScenes.forEach(async (sc) => {
          await generateOneVideo(sc, currentQuality);
        });
      } else {
        addLog('success', 'Rendu cinématique Canvas HD & Narration vocale prêts !');
      }

      showToast(`${projectData.scenes.length} vidéos prêtes à diffuser !`, 'success');
      notifyGenerationComplete(projectData.scenes.length);
    } catch (err: any) {
      addLog('error', `Erreur : ${err.message}`);
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
    addLog('warn', 'Tournage interrompu.');
    showToast('Génération arrêtée', 'warn');
  };

  // Launch Player Overlay
  const startPlayerOverlay = (sceneIdx = 0) => {
    if (!project) return;
    setCurrentPlaySceneIdx(sceneIdx);
    setIsOverlayPlaying(true);
    setIsOverlayVisible(true);
    addLog('info', `Diffusion : Scène #${project.scenes[sceneIdx].sceneNumber}`);
  };

  // Overlay Canvas animation & Speech loop
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
  }, [isOverlayVisible, currentPlaySceneIdx, isOverlayPlaying, project, enableVoice]);

  // Keyboard navigation
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

  // Export full ZIP
  const handleExportZip = async () => {
    if (!project) return;
    try {
      setIsExportingZip(true);
      showToast('Création de l’archive ZIP…', 'info');
      addLog('info', '[ZIP] Préparation du téléchargement de toutes les vidéos…');

      const zip = new JSZip();
      const folderName = `studio-master-${activeMode.n}`;
      const folder = zip.folder(folderName);

      folder?.file('scenario.json', JSON.stringify(project, null, 2));
      folder?.file(
        'manifest.txt',
        `Studio Master v4.0 — WG clip\nMode : ${activeMode.name}\nSujet : ${subject}\nDate : ${new Date().toISOString()}\nScènes : ${project.scenes.length}\n`
      );

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 720;
      tempCanvas.height = 1280;

      for (let i = 0; i < project.scenes.length; i++) {
        const sc = project.scenes[i];
        showToast(`Export scène ${i + 1}/${project.scenes.length}…`, 'info', 1000);

        if (sc.videoUrl) {
          try {
            const vidRes = await fetch(sc.videoUrl);
            const blob = await vidRes.blob();
            folder?.file(`scene-${String(i + 1).padStart(2, '0')}.mp4`, blob);
          } catch {
            videoRenderer.renderSceneFrame({ canvas: tempCanvas, scene: sc, progress: 0.5, aspectRatio });
            const blob = await videoRenderer.recordVideoFromCanvas(tempCanvas, 3000);
            folder?.file(`scene-${String(i + 1).padStart(2, '0')}.webm`, blob);
          }
        } else {
          videoRenderer.renderSceneFrame({ canvas: tempCanvas, scene: sc, progress: 0.5, aspectRatio });
          const blob = await videoRenderer.recordVideoFromCanvas(tempCanvas, 3000);
          folder?.file(`scene-${String(i + 1).padStart(2, '0')}.webm`, blob);
        }
      }

      const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folderName}-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('ZIP téléchargé avec succès ✓', 'success');
      addLog('success', '[ZIP] Archive complète téléchargée');
    } catch (e: any) {
      showToast(`Export ZIP impossible : ${e.message}`, 'error');
    } finally {
      setIsExportingZip(false);
    }
  };

  const hasActiveKey = keysList.some((k) => k.state === 'active');

  const tiktokModes = ALL_MODES.filter((m) => m.n <= 990);
  const filmModes = ALL_MODES.filter((m) => m.n >= 991);

  let visibleTiktokModes = tiktokExpanded ? tiktokModes : tiktokModes.slice(0, 6);
  if (!tiktokExpanded && tiktokModes.some(m => m.n === activeMode.n) && !visibleTiktokModes.some(m => m.n === activeMode.n)) {
    visibleTiktokModes = [...visibleTiktokModes, activeMode];
  }

  let visibleFilmModes = filmsExpanded ? filmModes : filmModes.slice(0, 6);
  if (!filmsExpanded && filmModes.some(m => m.n === activeMode.n) && !visibleFilmModes.some(m => m.n === activeMode.n)) {
    visibleFilmModes = [...visibleFilmModes, activeMode];
  }

  return (
    <>
      <div className="splash-screen" id="splash-screen">
        <svg className="splash-logo" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="38" stroke="#e5c15a" strokeWidth="1.5" fill="none" opacity="0.4"/>
          <g fill="#e5c15a">
            <path d="M50 12 L58 28 L42 28 Z"/>
            <path d="M85 38 L72 48 L78 60 Z"/>
            <path d="M85 62 L72 52 L78 40 Z"/>
            <path d="M50 88 L42 72 L58 72 Z"/>
            <path d="M15 62 L28 52 L22 40 Z"/>
            <path d="M15 38 L28 48 L22 60 Z"/>
          </g>
          <circle cx="50" cy="50" r="8" fill="#0a0a12"/>
          <circle cx="50" cy="50" r="9" stroke="#e5c15a" strokeWidth="1" fill="none" opacity="0.8"/>
        </svg>
        <div className="splash-title">Studio Master</div>
        <div className="splash-bar"></div>
        <div className="splash-loading">Chargement…</div>
      </div>
      
      {/* ═══════════ HEADER COMMUN ═══════════ */}
      <header className="app-header" id="app-header">
        <div className="header-left">
          <h1 id="header-title">
            {currentPage === 'home'
              ? '🎬 Studio Master'
              : currentPage === 'account'
              ? '👤 Mon compte'
              : currentPage === 'preferences'
              ? '⚙️ Préférences'
              : '🔐 Connexion'}
          </h1>
          <p className="header-subtitle" id="header-subtitle">
            {currentPage === 'home'
              ? 'Créez vos vidéos IA en 3 étapes'
              : currentPage === 'account'
              ? 'Clé API, Session & Statistiques'
              : currentPage === 'preferences'
              ? "Paramètres de l'application"
              : 'Espace membre Studio Master'}
          </p>
        </div>
        <div className="header-actions">
          {currentUser ? (
            <button
              type="button"
              className={`btn-icon ${currentPage === 'account' ? 'active' : ''}`}
              id="nav-account-btn"
              title={currentUser.displayName || currentUser.email || "Mon compte"}
              aria-label="Mon compte"
              onClick={() => navigateTo('account')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.2rem 0.5rem' }}
            >
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="Avatar"
                  style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#e5c15a', color: '#0a0a12', fontWeight: 'bold', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {(currentUser.displayName?.[0] || currentUser.email?.[0] || 'U').toUpperCase()}
                </span>
              )}
              <span className="hidden sm:inline" style={{ fontSize: '0.75rem', fontWeight: 600, maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser.displayName?.split(' ')[0] || currentUser.email?.split('@')[0]}
              </span>
              <span className={`badge-dot ${!hasActiveKey ? 'visible' : ''}`} id="account-badge"></span>
            </button>
          ) : (
            <button
              type="button"
              className="btn-icon"
              id="nav-account-btn"
              title="Se connecter"
              aria-label="Se connecter"
              onClick={() => setShowAuthModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0.2rem 0.6rem', width: 'auto', borderRadius: '20px', background: 'rgba(229, 193, 90, 0.15)', color: 'var(--acc)', border: '1px solid var(--acc)', cursor: 'pointer' }}
            >
              <span style={{ fontSize: '0.85rem' }}>🔑</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Se connecter</span>
            </button>
          )}
          <button
            type="button"
            className={`btn-icon ${currentPage === 'preferences' ? 'active' : ''}`}
            id="nav-preferences-btn"
            title="Préférences"
            aria-label="Préférences"
            onClick={() => navigateTo('preferences')}
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* ═══════════ PAGE 0 : AUTHENTIFICATION ═══════════ */}
      <main className={`page ${currentPage === 'auth' ? 'active' : ''}`} id="page-auth">
        <div style={{ maxWidth: '440px', margin: '1.5rem auto', padding: '1.5rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', textAlign: 'center' }}>
          {/* Logo SVG Diaphragme */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <svg viewBox="0 0 100 100" style={{ width: '80px', height: '80px' }} xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="auth-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#e5c15a" />
                  <stop offset="100%" stopColor="#e87b35" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="38" fill="none" stroke="url(#auth-logo-grad)" strokeWidth="1.5" opacity="0.9" />
              <g fill="url(#auth-logo-grad)" opacity="0.95">
                <path d="M 50,12 L 72,25 L 58,42 Z" transform="rotate(0 50 50)" />
                <path d="M 50,12 L 72,25 L 58,42 Z" transform="rotate(60 50 50)" />
                <path d="M 50,12 L 72,25 L 58,42 Z" transform="rotate(120 50 50)" />
                <path d="M 50,12 L 72,25 L 58,42 Z" transform="rotate(180 50 50)" />
                <path d="M 50,12 L 72,25 L 58,42 Z" transform="rotate(240 50 50)" />
                <path d="M 50,12 L 72,25 L 58,42 Z" transform="rotate(300 50 50)" />
              </g>
              <circle cx="50" cy="50" r="8" fill="#0a0a12" />
            </svg>
          </div>

          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, background: 'linear-gradient(135deg, #e5c15a 0%, #e87b35 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 0.4rem 0', fontFamily: 'Cinzel, serif' }}>
            Studio Master
          </h2>
          <p style={{ color: 'var(--dim)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Connectez-vous pour créer vos vidéos
          </p>

          {/* Message d'erreur global */}
          {renderAuthErrorBlock()}

          {/* Bouton Google */}
          <button
            type="button"
            style={{ width: '100%', padding: '0.75rem 1rem', background: '#ffffff', color: '#1f2937', fontWeight: 600, fontSize: '0.95rem', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', transition: 'opacity 0.15s ease' }}
            disabled={isAuthSubmitting}
            onClick={handleGoogleSignIn}
          >
            <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continuer avec Google</span>
          </button>

          {/* Séparateur */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0' }}>
            <div style={{ flex: 1, borderTop: '1px solid var(--border)' }} />
            <span style={{ padding: '0 0.75rem', color: 'var(--dim)', fontSize: '0.75rem', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
              ou
            </span>
            <div style={{ flex: 1, borderTop: '1px solid var(--border)' }} />
          </div>

          {/* Toggle Formulaire Email */}
          {!showEmailForm ? (
            <button
              type="button"
              className="btn btn-secondary btn-small"
              style={{ width: '100%' }}
              onClick={() => setShowEmailForm(true)}
            >
              ✉️ Utiliser un email
            </button>
          ) : (
            <form onSubmit={handleEmailAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', textAlign: 'left' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--dim)', marginBottom: '0.3rem' }}>
                  Adresse email
                </label>
                <input
                  type="email"
                  required
                  placeholder="votre@email.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--ink)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--dim)', marginBottom: '0.3rem' }}>
                  Mot de passe
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--ink)', fontSize: '0.85rem' }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isAuthSubmitting}
                style={{ marginTop: '0.4rem' }}
              >
                {isAuthSubmitting ? '⏳ Patientez…' : isSignUpMode ? 'Créer un compte' : 'Se connecter'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', marginTop: '0.4rem' }}>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--acc)', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                  onClick={() => {
                    setIsSignUpMode(!isSignUpMode);
                    setAuthError('');
                  }}
                >
                  {isSignUpMode ? 'Déjà un compte ? Se connecter' : 'Pas encore de compte ? Créer un compte'}
                </button>

                {!isSignUpMode && (
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--dim)', cursor: 'pointer', padding: 0 }}
                    onClick={handlePasswordReset}
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </main>

      {/* ═══════════ PAGE 1 : ACCUEIL ═══════════ */}
      <main className={`page ${currentPage === 'home' ? 'active' : ''}`} id="page-home">
        {/* Onboarding */}
        <div className={`onboarding ${!hasActiveKey ? 'visible' : ''}`} id="onboarding" onClick={() => navigateTo('account')}>
          <h2>🔑 Bienvenue !</h2>
          <p>Pour commencer à créer des vidéos, vous avez besoin d'une <strong>clé API Agnes</strong> (gratuite).</p>
          <button type="button" className="onboarding-btn" id="onboarding-btn" onClick={(e) => { e.stopPropagation(); navigateTo('account'); }}>
            Configurer ma clé API →
          </button>
        </div>

        {/* Étape 1 : Sujet */}
        <div className="panel">
          <div className="panel-title">Étape 1 · Votre sujet</div>
          <textarea
            id="subject-input"
            placeholder="Décrivez votre idée, votre histoire, votre actualité…"
            rows={3}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-small btn-secondary"
              id="subject-example-btn"
              onClick={() => {
                const examples = [
                  'La France insoumise et les mobilisations lycéennes',
                  'Un chaton détective enquête dans un Paris rétrofuturiste',
                  'Un chaton astronaute découvre une planète pastel',
                  'La campagne municipale de La France insoumise à Roubaix',
                  'Un chaton cowboy traverse un désert de pastel',
                  'Un film noir avec un chaton détective dans les années 50',
                  'Une aventure de chatons ninjas dans un Tokyo futuriste'
                ];
                setSubject(examples[Math.floor(Math.random() * examples.length)]);
              }}
            >
              💡 Voir un exemple
            </button>
          </div>
        </div>

        {/* Étape 2 : Styles */}
        <div className="panel">
          <div className="panel-title">Étape 2 · Choisissez un style</div>
          <div id="mode-categories">
            <div className="mode-category">
              <div className="mode-category-header">
                📱 TikTok <span className="mode-category-count">{tiktokModes.length} styles</span>
              </div>
              <div className="mode-grid">
                {visibleTiktokModes.map((m) => (
                  <div
                    key={m.n}
                    className={`mode-card ${activeMode.n === m.n ? 'active' : ''}`}
                    onClick={() => handleSelectMode(m)}
                  >
                    <span className="mode-name">{m.name.replace(/^TikTok /, '')}</span>
                  </div>
                ))}
              </div>
              {tiktokModes.length > 6 && (
                <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    style={{ margin: '0 auto' }}
                    onClick={() => setTiktokExpanded(!tiktokExpanded)}
                  >
                    {tiktokExpanded ? 'Voir moins' : `Voir plus (+${tiktokModes.length - 6} styles)`}
                  </button>
                </div>
              )}
            </div>

            <div className="mode-category">
              <div className="mode-category-header">
                🎬 Films & Séries <span className="mode-category-count">{filmModes.length} styles</span>
              </div>
              <div className="mode-grid">
                {visibleFilmModes.map((m) => (
                  <div
                    key={m.n}
                    className={`mode-card ${activeMode.n === m.n ? 'active' : ''}`}
                    onClick={() => handleSelectMode(m)}
                  >
                    <span className="mode-name">{m.name}</span>
                  </div>
                ))}
              </div>
              {filmModes.length > 6 && (
                <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    style={{ margin: '0 auto' }}
                    onClick={() => setFilmsExpanded(!filmsExpanded)}
                  >
                    {filmsExpanded ? 'Voir moins' : `Voir plus (+${filmModes.length - 6} styles)`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Étape 3 : Lancer */}
        <button
          type="button"
          className={`btn btn-primary ${subject.trim().length > 0 && activeMode && !isGenerating ? 'pulse-btn' : ''}`}
          id="launch-btn"
          disabled={isGenerating || (currentUser ? (subject.trim().length < 5 || !hasActiveKey) : false)}
          onClick={() => {
            if (!currentUser) {
              setPendingLaunchAfterAuth(true);
              setShowAuthModal(true);
            } else {
              handleLaunch();
            }
          }}
        >
          {!currentUser
            ? '🔑 Connectez-vous pour créer'
            : isGenerating
            ? '⏳ Génération en cours…'
            : !hasActiveKey
            ? '🔑 Ajoutez votre clé API'
            : subject.trim().length < 5
            ? '💡 Décrivez votre sujet'
            : '▶ Lancer la génération'}
        </button>

        {isGenerating && (
          <button type="button" className="btn btn-stop visible" id="stop-btn" onClick={handleStop}>
            ⏹ Arrêter
          </button>
        )}

        {/* Projets récents / LocalStorage */}
        <div className={`panel ${recentProjects.length > 0 ? '' : 'hidden'}`}>
          <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📜 Projets récents (LocalStorage) <span className="badge">{recentProjects.length}/5</span></span>
            <button type="button" className="btn btn-small btn-danger" style={{ width: 'auto', minHeight: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={handleClearRecentProjects}>
              🗑️ Effacer
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            {recentProjects.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg2)', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border)', gap: '0.5rem' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--acc)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.modeName} · {p.date}</div>
                </div>
                <button
                  type="button"
                  className="btn btn-small btn-secondary"
                  style={{ width: 'auto', flexShrink: 0 }}
                  onClick={() => handleLoadRecentProject(p)}
                >
                  📂 Charger
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Scénario */}
        <div className={`panel ${project ? '' : 'hidden'}`} id="script-panel">
          <div className="panel-title">
            📜 Votre histoire <span className="badge" id="script-badge">{project ? `${project.scenes.length} scènes` : '—'}</span>
          </div>
          <div className="script-summary">
            <div className="script-summary-title" id="script-title">{project?.title || '—'}</div>
            <div className="script-summary-logline" id="script-logline">{project?.synopsis || '—'}</div>
            <div className="script-summary-meta" id="script-meta">
              <span>👥 1-3 personnages</span>
              <span>🎬 {project?.scenes.length || 0} scènes</span>
            </div>
            <div
              className="script-details-toggle"
              id="script-toggle"
              onClick={() => setShowScriptDetails(!showScriptDetails)}
            >
              <span>{showScriptDetails ? 'Masquer le détail des scènes' : 'Voir le détail des scènes'}</span>
              <span className="chevron">{showScriptDetails ? '▾' : '▸'}</span>
            </div>
            <div className={`script-details ${showScriptDetails ? 'visible' : ''}`} id="script-details">
              {project?.scenes.map((sc) => (
                <div key={sc.sceneNumber} className="scene-item">
                  <div className="scene-num">Scène {sc.sceneNumber} · {sc.title}</div>
                  <div style={{ color: 'var(--ink)', marginTop: '0.2rem' }}>
                    🐱 <strong>{sc.title}</strong>
                  </div>
                  <div className="scene-decor">📍 {sc.visualDescription}</div>
                  <div className="scene-dialogue">🔊 « {sc.voiceover} »</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vidéos */}
        <div className={`panel ${project ? '' : 'hidden'}`} id="videos-panel">
          <div className="panel-title">
            🎞️ Vos vidéos <span className="badge" id="videos-count">{project?.scenes.length || 0}</span>
          </div>
          <div className="videos-grid" id="videos-grid">
            {project?.scenes.map((sc, idx) => (
              <div key={sc.sceneNumber} className={`scene-card ${sc.status || 'done'}`}>
                <div className="scene-card-header">
                  <span className="scene-card-title">Scène {sc.sceneNumber} · {sc.title}</span>
                  <span>{sc.duration}s</span>
                </div>
                <div className="scene-card-body">
                  {sc.videoUrl ? (
                    <video
                      src={sc.videoUrl}
                      playsInline
                      controls
                      loop
                      ref={(el) => {
                        if (el) el.playbackRate = playbackSpeed;
                      }}
                    />
                  ) : sc.thumbnailUrl ? (
                    <div onClick={() => startPlayerOverlay(idx)} style={{ cursor: 'pointer' }}>
                      <img src={sc.thumbnailUrl} alt={sc.title} style={{ width: '100%', borderRadius: '6px', display: 'block' }} />
                    </div>
                  ) : (
                    <div className="scene-placeholder">
                      <div className="spinner" />
                      <span>Rendu en cours…</span>
                    </div>
                  )}
                  <a
                    className="btn-download"
                    href={sc.videoUrl || sc.thumbnailUrl || '#'}
                    download={`scene-${String(sc.sceneNumber).padStart(2, '0')}.mp4`}
                    onClick={(e) => {
                      if (!sc.videoUrl) {
                        e.preventDefault();
                        startPlayerOverlay(idx);
                      }
                    }}
                  >
                    ⬇ Télécharger cette vidéo
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Player Card */}
        <div className={`player-card ${project ? '' : 'hidden'}`} id="player-panel">
          <div className="player-card-title">▶ Lecture du film</div>
          <div className="player-btn-row">
            <button
              type="button"
              className="btn"
              id="play-film-btn"
              disabled={!project}
              onClick={() => startPlayerOverlay(0)}
            >
              ▶ Diffuser
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              id="replay-btn"
              disabled={!project}
              onClick={() => startPlayerOverlay(0)}
            >
              🔁 Rejouer
            </button>
          </div>
          <div className="player-btn-row full">
            <button
              type="button"
              className="btn btn-download"
              id="download-zip-btn"
              disabled={!project || isExportingZip}
              onClick={handleExportZip}
            >
              {isExportingZip ? '⏳ Préparation du ZIP…' : '📦 Télécharger toutes les vidéos (ZIP)'}
            </button>
          </div>
          <label className="player-voice-row">
            <input
              type="checkbox"
              id="voice-toggle"
              checked={enableVoice}
              onChange={(e) => setEnableVoice(e.target.checked)}
            />
            <span>Narration vocale française</span>
          </label>
          <div style={{ marginTop: '0.6rem', padding: '0.6rem', background: 'var(--bg2)', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem', color: 'var(--ink)' }}>
              <span>Vitesse de lecture</span>
              <span style={{ fontWeight: 700, color: 'var(--acc)' }}>{playbackSpeed}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--acc)', cursor: 'pointer' }}
            />
          </div>
          <div className="player-hint">Échap ou tap pour quitter la lecture</div>
        </div>
      </main>

      {/* ═══════════ PAGE 2 : MON COMPTE ═══════════ */}
      <main className={`page ${currentPage === 'account' ? 'active' : ''}`} id="page-account">
        <div className="subpage-header">
          <button type="button" className="btn-back" id="account-back" title="Retour" onClick={goBack}>
            ←
          </button>
          <h2 className="subpage-title">👤 Mon compte</h2>
        </div>

        {/* Firebase User Profile & Logout */}
        <div className="panel">
          <div className="panel-title">👤 Session Membre Firebase</div>
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="Avatar" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#e5c15a', color: '#0a0a12', fontWeight: 'bold', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {(currentUser.displayName?.[0] || currentUser.email?.[0] || 'U').toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{currentUser.displayName || 'Utilisateur Firebase'}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--dim)' }}>{currentUser.email}</div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-danger btn-small"
                style={{ width: 'auto', flexShrink: 0 }}
                onClick={handleSignOut}
              >
                🚪 Se déconnecter
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAuthModal(true)}
            >
              🔑 Se connecter
            </button>
          )}
        </div>

        {/* Clé API */}
        <div className="panel">
          <div className="panel-title">🔑 Clé API Agnes</div>
          <textarea
            id="api-keys-input"
            placeholder="Collez votre clé API ici (sk-...)"
            rows={2}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            value={apiKeysInput}
            onChange={(e) => setApiKeysInput(e.target.value)}
          />
          <div className="input-hint">
            Clé gratuite sur{' '}
            <a href="https://platform.agnes-ai.com" target="_blank" rel="noopener noreferrer">
              platform.agnes-ai.com
            </a>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
            <button type="button" className="btn btn-small" id="api-save-btn" onClick={handleSaveKeys}>
              💾 Enregistrer
            </button>
            <button
              type="button"
              className={`btn btn-small btn-secondary ${testKeyStatus === 'ok' ? 'ok' : testKeyStatus === 'err' ? 'err' : ''}`}
              id="api-test-btn"
              disabled={isTestingKey}
              onClick={handleTestKey}
            >
              {testKeyMessage}
            </button>
          </div>
          <div className={`status ${hasActiveKey ? 'ok' : 'err'}`} id="api-status-line">
            <span className="dot"></span>
            <span id="api-status-text">
              {hasActiveKey ? `${keysList.filter((k) => k.state === 'active').length} clé(s) enregistrée(s)` : 'Aucune clé enregistrée'}
            </span>
          </div>
        </div>

        {/* Liste des clés */}
        <div className="panel">
          <div className="panel-title">🗝️ Clés enregistrées</div>
          <div className="key-list" id="key-list">
            {keysList.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: 'var(--dim)', textAlign: 'center', padding: '1rem' }}>
                Aucune clé enregistrée.
              </div>
            ) : (
              keysList.map((k, idx) => (
                <div key={idx} className="key-item">
                  <span className="key-id">
                    #{idx + 1} · {k.key.slice(0, 8)}…{k.key.slice(-4)}
                  </span>
                  <span className={`key-state ${k.state === 'cool' ? 'cool' : k.state === 'dead' ? 'dead' : ''}`}>
                    {k.state}
                  </span>
                </div>
              ))
            )}
          </div>
          {keysList.length > 0 && (
            <button
              type="button"
              className="btn btn-danger btn-small"
              id="delete-all-keys-btn"
              style={{ marginTop: '0.6rem' }}
              onClick={handleDeleteAllKeys}
            >
              🗑️ Supprimer toutes les clés
            </button>
          )}
        </div>

        {/* Statistiques */}
        <div className="panel">
          <div className="panel-title">📊 Mes statistiques</div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value" id="stat-videos">{stats.videos}</div>
              <div className="stat-label">Vidéos générées</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" id="stat-images">{stats.images}</div>
              <div className="stat-label">Images / Storyboards</div>
            </div>
          </div>
        </div>
      </main>

      {/* ═══════════ PAGE 3 : PRÉFÉRENCES ═══════════ */}
      <main className={`page ${currentPage === 'preferences' ? 'active' : ''}`} id="page-preferences">
        <div className="subpage-header">
          <button type="button" className="btn-back" id="preferences-back" title="Retour" onClick={goBack}>
            ←
          </button>
          <h2 className="subpage-title">⚙️ Préférences</h2>
        </div>

        {/* Paramètres avancés */}
        <div className="panel">
          <div className="panel-title">⚙️ Paramètres avancés</div>
          <div className="input-hint" style={{ marginBottom: '0.7rem' }}>
            Laissez les valeurs par défaut pour un résultat optimal.
          </div>
          
          <div className="pref-row">
            <div className="pref-info">
              <div className="pref-title">Durée totale (s)</div>
              <div className="pref-desc">Durée totale cible de la vidéo ({totalTargetDuration}s)</div>
            </div>
            <div className="pref-action" style={{ width: '120px' }}>
              <input
                type="range"
                min="30"
                max="180"
                step="5"
                value={totalTargetDuration}
                onChange={(e) => setTotalTargetDuration(parseInt(e.target.value, 10))}
                style={{ width: '100%', accentColor: 'var(--acc)', cursor: 'pointer', margin: 0 }}
              />
            </div>
          </div>

          <div className="pref-row">
            <div className="pref-info">
              <div className="pref-title">Nombre de scènes</div>
              <div className="pref-desc">Combien de scènes dans votre vidéo</div>
            </div>
            <div className="pref-action" style={{ width: '80px' }}>
              <input
                type="number"
                id="param-scenes"
                min="1"
                max="20"
                value={scenesCount}
                onChange={(e) => setScenesCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                style={{ textAlign: 'center', margin: 0 }}
              />
            </div>
          </div>
          <div className="pref-row" style={{ borderBottom: 'none', paddingTop: '0.6rem' }}>
            <div className="pref-info">
              <div className="pref-title">Durée par scène (secondes)</div>
              <div className="pref-desc">Entre 3 et 15 secondes</div>
            </div>
            <div className="pref-action" style={{ width: '80px' }}>
              <input
                type="number"
                id="param-duration"
                min="3"
                max="15"
                value={durationPerScene}
                onChange={(e) => {
                  const val = Math.max(3, Math.min(15, parseInt(e.target.value, 10) || 3));
                  setDurationPerScene(val);
                  setTotalTargetDuration(val * scenesCount);
                }}
                style={{ textAlign: 'center', margin: 0 }}
              />
            </div>
          </div>
          <div className="pref-row" style={{ borderBottom: 'none', paddingTop: '0.6rem' }}>
            <div className="pref-info">
              <div className="pref-title">Durée totale cible (secondes)</div>
              <div className="pref-desc">Calculée : {Math.round(durationPerScene * scenesCount)}s</div>
            </div>
            <div className="pref-action" style={{ width: '150px' }}>
              <input
                type="range"
                min="30"
                max="180"
                step="5"
                value={totalTargetDuration}
                onChange={(e) => setTotalTargetDuration(parseInt(e.target.value, 10))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
          </div>
          <div className="pref-row" style={{ borderBottom: 'none', paddingTop: '0.6rem' }}>
            <div className="pref-info">
              <div className="pref-title">Qualité de la vidéo</div>
              <div className="pref-desc">Plus la qualité est haute, plus c'est long à générer</div>
            </div>
            <div className="pref-action" style={{ width: '150px' }}>
              <select
                id="param-quality"
                value={videoQuality}
                onChange={(e) => setVideoQuality(e.target.value)}
                style={{ width: '100%', padding: '0.3rem', background: 'var(--bg2)', color: 'var(--ink)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.8rem' }}
              >
                <option value="720P">Standard (720p)</option>
                <option value="1080P">HD (1080p)</option>
                <option value="2K">Haute (2K)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Apparence */}
        <div className="panel">
          <div className="panel-title">🎨 Apparence</div>
          <div className="pref-row">
            <div className="pref-info">
              <div className="pref-title">Thème</div>
              <div className="pref-desc" id="theme-desc">
                {theme === 'auto' ? 'Suit votre système' : theme === 'light' ? 'Clair' : 'Sombre'}
              </div>
            </div>
            <div className="pref-action">
              <button type="button" className="btn btn-small btn-secondary" id="theme-toggle-btn" onClick={toggleTheme}>
                🌓 Changer
              </button>
            </div>
          </div>
        </div>

        {/* Application */}
        <div className="panel">
          <div className="panel-title">📱 Application</div>
          <div className="pref-row">
            <div className="pref-info">
              <div className="pref-title">Installer sur l'écran d'accueil</div>
              <div className="pref-desc">Accès rapide comme une app native</div>
            </div>
            <div className="pref-action">
              <button
                type="button"
                className="btn btn-small btn-secondary"
                id="install-btn"
                onClick={handleInstallPWA}
              >
                {isPwaInstalled ? '✅ Installée' : '📲 Installer'}
              </button>
            </div>
          </div>
        </div>

        {/* Aide */}
        <div className="panel">
          <div className="panel-title">❓ Aide</div>
          <div className="pref-row">
            <div className="pref-info">
              <div className="pref-title">Comment ça marche ?</div>
              <div className="pref-desc">Guide rapide en 5 étapes</div>
            </div>
            <div className="pref-action">
              <button
                type="button"
                className="btn btn-small btn-secondary"
                id="help-btn"
                onClick={() => {
                  alert(
                    "🎬 STUDIO MASTER — AIDE\n\n1. Allez dans 👤 Mon compte (icône en haut à droite)\n2. Collez votre clé API Agnes (gratuite)\n3. Revenez à l'accueil (bouton ←)\n4. Écrivez votre sujet (histoire, idée, actualité…)\n5. Choisissez un style parmi les 90 proposés\n6. Cliquez sur \"Lancer la génération\"\n\n⏱️ Temps : 3 à 10 minutes selon le nombre de scènes.\n📥 Téléchargements : Bouton vert \"Télécharger\" sous chaque vidéo ou \"Tout télécharger (ZIP)\".\n🔑 Clé gratuite : platform.agnes-ai.com"
                  );
                }}
              >
                ❓ Voir
              </button>
            </div>
          </div>
          <div className="pref-row" style={{ borderBottom: 'none', paddingTop: '0.6rem' }}>
            <div className="pref-info">
              <div className="pref-title">Rejouer le tutoriel guidé</div>
              <div className="pref-desc">Relancer la visite guidée de l'application</div>
            </div>
            <div className="pref-action">
              <button
                type="button"
                className="btn btn-small btn-secondary"
                onClick={() => {
                  localStorage.removeItem('studio_master_tour_v52');
                  location.reload();
                }}
              >
                🔄 Rejouer
              </button>
            </div>
          </div>
        </div>

        {/* Avancé (caché) */}
        <button
          type="button"
          className="advanced-toggle"
          id="advanced-toggle"
          onClick={() => setShowAdvancedPanel(!showAdvancedPanel)}
        >
          {showAdvancedPanel ? '🖥️ Avancé (masquer)' : '🖥️ Avancé (pour développeurs)'}
        </button>
        <div className={`advanced-panel ${showAdvancedPanel ? 'visible' : ''}`} id="advanced-panel">
          <div className="panel-title">🖥️ Journal technique</div>
          <div className="console" id="console-view" ref={consoleViewRef}>
            {logs.map((l) => (
              <div key={l.id} className={`c-line ${l.type}`}>
                <span className="c-time">{l.time}</span>
                <span className="c-tag">[{l.type.toUpperCase()}]</span>
                <span>{l.msg}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-small"
              id="console-copy-btn"
              onClick={() => {
                navigator.clipboard.writeText(logs.map((l) => `[${l.time}] [${l.type.toUpperCase()}] ${l.msg}`).join('\n'));
                showToast('Journal copié', 'success');
              }}
            >
              Copier
            </button>
            <button
              type="button"
              className="btn btn-small btn-secondary"
              id="console-clear-btn"
              onClick={() => setLogs([])}
            >
              Effacer
            </button>
          </div>
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════════════
           ⭐ ASSISTANT IA — BULLE FLOTTANTE + PANNEAU CHAT
           ══════════════════════════════════════════════════════════════════ */}
      {/* Bulle flottante */}
      <button
        type="button"
        className={`assistant-bubble ${isOverlayVisible ? 'dim' : ''}`}
        id="assistant-bubble"
        title="Assistant IA"
        aria-label="Assistant IA"
        onClick={() => {
          setIsAssistantOpen(!isAssistantOpen);
          setAssistantUnreadCount(0);
        }}
      >
        🤖
        <span
          className={`assistant-badge ${assistantUnreadCount > 0 ? 'visible' : ''}`}
          id="assistant-badge"
        >
          {assistantUnreadCount}
        </span>
      </button>

      {/* Panneau chat */}
      <div
        className={`assistant-panel ${isAssistantOpen ? 'visible' : ''}`}
        id="assistant-panel"
        role="region"
        aria-label="Panneau Assistant IA"
      >
        <div className="assistant-header">
          <div className="assistant-title">🤖 Assistant Studio</div>
          <button
            type="button"
            className="assistant-close"
            id="assistant-close"
            aria-label="Fermer"
            onClick={() => setIsAssistantOpen(false)}
          >
            ×
          </button>
        </div>

        <div className="assistant-messages" id="assistant-messages">
          {assistantMessages.map((msg) => (
            <div key={msg.id} className={`assistant-msg ${msg.sender}`}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
              {msg.action && (
                <button
                  type="button"
                  className="assistant-action-chip"
                  onClick={msg.action.onClick}
                >
                  {msg.action.label}
                </button>
              )}
            </div>
          ))}
          {isAssistantTyping && (
            <div className="assistant-msg typing">
              <span className="dot-typing"></span>
              <span className="dot-typing"></span>
              <span className="dot-typing"></span>
            </div>
          )}
          <div ref={assistantMessagesEndRef} />
        </div>

        {/* Suggestions rapides */}
        <div className="assistant-suggestions" id="assistant-suggestions">
          {[
            '💡 Idée de vidéo',
            '🎬 Quel style choisir ?',
            '⚡ Mode TikTok JT 60s',
            '🔑 Aide clé API Agnes'
          ].map((sug, idx) => (
            <button
              key={idx}
              type="button"
              className="assistant-suggestion"
              onClick={() => handleSendAssistantMessage(sug)}
            >
              {sug}
            </button>
          ))}
        </div>

        {/* Input bar */}
        <div className="assistant-input-row">
          <textarea
            className="assistant-input"
            id="assistant-input"
            placeholder="Posez votre question…"
            rows={1}
            value={assistantInput}
            onChange={(e) => setAssistantInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (assistantInput.trim()) {
                  handleSendAssistantMessage(assistantInput);
                  setAssistantInput('');
                }
              }
            }}
          />
          <button
            type="button"
            className="assistant-send"
            id="assistant-send"
            aria-label="Envoyer"
            disabled={isAssistantTyping || !assistantInput.trim()}
            onClick={() => {
              if (assistantInput.trim()) {
                handleSendAssistantMessage(assistantInput);
                setAssistantInput('');
              }
            }}
          >
            ➤
          </button>
        </div>
      </div>

      {/* ═══════════ STATUS BAR ═══════════ */}
      <div className={`status-bar ${statusBar.visible ? 'visible' : ''}`} id="status-bar">
        <div className="spinner"></div>
        <span id="status-text">{statusBar.text}</span>
      </div>

      {/* ═══════════ TOAST ═══════════ */}
      <div className={`toast ${toast.visible ? 'visible' : ''} ${toast.type}`} id="toast">
        <span id="toast-text">{toast.text}</span>
      </div>

      {/* ═══════════ PLAYER OVERLAY ═══════════ */}
      <div
        className={`player-overlay ${isOverlayVisible ? 'visible' : ''}`}
        id="player-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsOverlayVisible(false);
            audioEngine.stopSpeech();
            audioEngine.stopAmbientMusic();
          }
        }}
      >
        <canvas id="player-canvas" ref={overlayCanvasRef}></canvas>
        <button
          type="button"
          className="player-close"
          id="player-close"
          onClick={() => {
            setIsOverlayVisible(false);
            audioEngine.stopSpeech();
            audioEngine.stopAmbientMusic();
          }}
        >
          ×
        </button>
        <div className="player-hint-overlay" id="player-hint-overlay">
          Échap ou tap pour quitter
        </div>
      </div>

      {/* ═══════════ NO SLEEP ═══════════ */}
      <canvas id="noSleepCanvas" width="2" height="2"></canvas>
      <video id="noSleepVideo" playsInline muted loop></video>

      {/* ═══════════ MODAL DE CONNEXION ═══════════ */}
      {showAuthModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 10, 18, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 9000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAuthModal(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '440px',
              background: 'var(--bg2)',
              border: '1px solid var(--acc)',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.7), 0 0 24px rgba(229, 193, 90, 0.15)',
              position: 'relative',
              animation: 'popoverIn 0.25s ease'
            }}
          >
            <button
              type="button"
              style={{
                position: 'absolute',
                top: '0.75rem',
                right: '0.75rem',
                background: 'none',
                border: 'none',
                color: 'var(--dim)',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '0.2rem 0.5rem',
                lineHeight: 1
              }}
              onClick={() => setShowAuthModal(false)}
              aria-label="Fermer"
            >
              ×
            </button>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>🎬</div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--acc)', margin: '0 0 0.4rem 0', fontFamily: 'Cinzel, serif' }}>
                Une dernière étape avant de créer
              </h3>
              <p style={{ color: 'var(--dim)', fontSize: '0.85rem', margin: 0, lineHeight: 1.4 }}>
                Connectez-vous pour lancer la génération. C'est gratuit et instantané.
              </p>
            </div>

            {/* Error message */}
            {renderAuthErrorBlock()}

            {/* Google Button */}
            <button
              type="button"
              style={{ width: '100%', padding: '0.8rem 1rem', background: '#ffffff', color: '#1f2937', fontWeight: 600, fontSize: '0.95rem', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', transition: 'opacity 0.15s ease' }}
              disabled={isAuthSubmitting}
              onClick={handleGoogleSignIn}
            >
              <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continuer avec Google</span>
            </button>

            {/* Separator */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0' }}>
              <div style={{ flex: 1, borderTop: '1px solid var(--border)' }} />
              <span style={{ padding: '0 0.75rem', color: 'var(--dim)', fontSize: '0.75rem', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                ou
              </span>
              <div style={{ flex: 1, borderTop: '1px solid var(--border)' }} />
            </div>

            {/* Toggle Email Form */}
            {!showEmailForm ? (
              <button
                type="button"
                className="btn btn-secondary btn-small"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setShowEmailForm(true)}
              >
                ✉️ Utiliser un email
              </button>
            ) : (
              <form onSubmit={handleEmailAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', textAlign: 'left' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--dim)', marginBottom: '0.3rem' }}>
                    Adresse email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="votre@email.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--ink)', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--dim)', marginBottom: '0.3rem' }}>
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--ink)', fontSize: '0.85rem' }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isAuthSubmitting}
                  style={{ marginTop: '0.4rem' }}
                >
                  {isAuthSubmitting ? '⏳ Patientez…' : isSignUpMode ? 'Créer un compte' : 'Se connecter'}
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', marginTop: '0.4rem' }}>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--acc)', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                    onClick={() => {
                      setIsSignUpMode(!isSignUpMode);
                      setAuthError('');
                    }}
                  >
                    {isSignUpMode ? 'Déjà un compte ? Se connecter' : 'Créer un compte'}
                  </button>

                  {!isSignUpMode && (
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--dim)', cursor: 'pointer', padding: 0 }}
                      onClick={handlePasswordReset}
                    >
                      Mot de passe oublié ?
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Close button at bottom */}
            <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                style={{ width: 'auto', display: 'inline-flex' }}
                onClick={() => setShowAuthModal(false)}
              >
                Fermer et continuer à explorer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
