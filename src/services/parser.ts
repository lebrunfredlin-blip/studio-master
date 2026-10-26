import { ModeItem, WA_PALETTES } from '../data/catalog';

export interface GeneratedScene {
  sceneNumber: number;
  title: string;
  duration: number;
  voiceover: string;
  visualDescription: string;
  cameraMovement: string;
  videoPrompt: string;
  soundAmbience: string;
  overlayText: string;
  colorHexes: string[];
  // Runtime status & rendering
  status?: 'pending' | 'generating' | 'done' | 'error';
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

export interface GeneratedProject {
  title: string;
  synopsis: string;
  mode: string;
  style: string;
  palette: string;
  aspectRatio: '9:16' | '16:9' | '1:1' | '4:3';
  totalDuration: number;
  scenes: GeneratedScene[];
  rawText?: string;
  usedStrategy?: number;
}

// Anti-Leak Sanitizer: Removes internal system prompts, tokens and sensitive headers
export function sanitizeAntiLeak(input: string): string {
  if (!input) return '';
  let sanitized = input;

  // Strip system prompt injection markers
  sanitized = sanitized.replace(/<\/?(?:system|instruction|prompt|secret|api_key|ais_metadata)[^>]*>/gi, '');
  sanitized = sanitized.replace(/sk-[a-zA-Z0-9_\-]{20,}/g, '[CLE_MASQUEE]');
  sanitized = sanitized.replace(/AI Studio|Gemini API Key|Antigravity/gi, 'WG clip Studio');
  
  return sanitized.trim();
}

// 5-Strategy Parser with full resilience
export function parseScenarioWith5Strategies(
  rawText: string,
  mode: ModeItem,
  subject: string,
  scenesCount: number,
  duration: number,
  aspectRatio: '9:16' | '16:9' | '1:1' | '4:3',
  onLog?: (type: 'info' | 'warn' | 'success' | 'error', msg: string) => void
): GeneratedProject {
  const cleanRaw = sanitizeAntiLeak(rawText);

  // Strategy 1: Direct JSON parse
  try {
    const directObj = JSON.parse(cleanRaw);
    if (directObj && Array.isArray(directObj.scenes) && directObj.scenes.length > 0) {
      onLog?.('success', 'Stratégie 1 réussie : JSON natif valide analysé');
      return normalizeProject(directObj, mode, scenesCount, duration, aspectRatio, 1, cleanRaw);
    }
  } catch {
    // continue to strategy 2
  }

  // Strategy 2: Codeblock extraction (```json ... ``` or ``` ... ```)
  try {
    const codeBlockMatch = cleanRaw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
      const parsed = JSON.parse(codeBlockMatch[1]);
      if (parsed && Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
        onLog?.('success', 'Stratégie 2 réussie : Bloc de code JSON extrait');
        return normalizeProject(parsed, mode, scenesCount, duration, aspectRatio, 2, cleanRaw);
      }
    }
  } catch {
    // continue to strategy 3
  }

  // Strategy 3: Regex bracket repair / substring extraction
  try {
    const firstBrace = cleanRaw.indexOf('{');
    const lastBrace = cleanRaw.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      let jsonSlice = cleanRaw.slice(firstBrace, lastBrace + 1);
      // Clean trailing commas before closing braces/brackets
      jsonSlice = jsonSlice.replace(/,\s*([}\]])/g, '$1');
      const parsed = JSON.parse(jsonSlice);
      if (parsed && (parsed.scenes || parsed.title)) {
        onLog?.('success', 'Stratégie 3 réussie : Réparation d’accolades Regex effectuée');
        return normalizeProject(parsed, mode, scenesCount, duration, aspectRatio, 3, cleanRaw);
      }
    }
  } catch {
    // continue to strategy 4
  }

  // Strategy 4: Line-by-line Markdown parsing heuristic
  try {
    const lines = cleanRaw.split('\n');
    let title = `${mode.name} — ${subject.slice(0, 30)}`;
    let synopsis = subject;
    const extractedScenes: GeneratedScene[] = [];
    let currentScene: Partial<GeneratedScene> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (/^(?:#+\s*|titre\s*:\s*)(.*)/i.test(trimmed)) {
        const m = trimmed.match(/^(?:#+\s*|titre\s*:\s*)(.*)/i);
        if (m && m[1]) title = m[1].replace(/[*_#"']/g, '').trim();
      } else if (/^(?:scène|scene)\s*(\d+)[:\s-]*(.*)/i.test(trimmed)) {
        if (currentScene && currentScene.voiceover) {
          extractedScenes.push(finalizeScene(currentScene, extractedScenes.length + 1, duration, mode));
        }
        const m = trimmed.match(/^(?:scène|scene)\s*(\d+)[:\s-]*(.*)/i);
        currentScene = {
          sceneNumber: extractedScenes.length + 1,
          title: m ? m[2].replace(/[*_#"']/g, '').trim() : `Séquence ${extractedScenes.length + 1}`,
          voiceover: '',
          visualDescription: '',
          cameraMovement: 'Plan symétrique frontal fixe',
          overlayText: ''
        };
      } else if (currentScene) {
        if (/(?:voix off|narration|texte)\s*[:=](.*)/i.test(trimmed)) {
          const match = trimmed.match(/(?:voix off|narration|texte)\s*[:=](.*)/i);
          if (match) currentScene.voiceover += ' ' + match[1].trim();
        } else if (/(?:visuel|description|visuelle)\s*[:=](.*)/i.test(trimmed)) {
          const match = trimmed.match(/(?:visuel|description|visuelle)\s*[:=](.*)/i);
          if (match) currentScene.visualDescription += ' ' + match[1].trim();
        } else if (/(?:caméra|mouvement|cadrage)\s*[:=](.*)/i.test(trimmed)) {
          const match = trimmed.match(/(?:caméra|mouvement|cadrage)\s*[:=](.*)/i);
          if (match) currentScene.cameraMovement = match[1].trim();
        } else if (!currentScene.voiceover) {
          currentScene.voiceover = trimmed.replace(/^[-*•]\s*/, '');
        }
      }
    }

    if (currentScene && (currentScene.voiceover || currentScene.visualDescription)) {
      extractedScenes.push(finalizeScene(currentScene, extractedScenes.length + 1, duration, mode));
    }

    if (extractedScenes.length > 0) {
      onLog?.('success', `Stratégie 4 réussie : Extraction heuristique (${extractedScenes.length} scènes)`);
      return {
        title,
        synopsis,
        mode: `#${mode.n} - ${mode.name}`,
        style: mode.style,
        palette: mode.palette || 'pink-mint',
        aspectRatio,
        totalDuration: extractedScenes.length * duration,
        scenes: extractedScenes,
        rawText: cleanRaw,
        usedStrategy: 4
      };
    }
  } catch (err: any) {
    onLog?.('warn', `Stratégie 4 en échec : ${err.message}`);
  }

  // Strategy 5: Programmatic procedural generator fallback
  onLog?.('warn', 'Stratégie 5 activée : Génération procédurale de secours garantie');
  return generateProceduralFallback(mode, subject, scenesCount, duration, aspectRatio, cleanRaw);
}

function finalizeScene(partial: Partial<GeneratedScene>, index: number, duration: number, mode: ModeItem): GeneratedScene {
  const palLabel = (mode.palette || 'pink-mint').toLowerCase();
  const chosenPalette = WA_PALETTES.find(p => p.id === mode.palette || p.label.toLowerCase().includes(palLabel)) || WA_PALETTES[0];
  return {
    sceneNumber: index,
    title: partial.title || `Séquence #${index}`,
    duration: duration,
    voiceover: partial.voiceover?.trim() || `Séquence ${index} : une exploration minutieuse de ${mode.name}.`,
    visualDescription: partial.visualDescription?.trim() || `Plan centré géométrique montrant les éléments clés dans un décor pastel à la Wes Anderson.`,
    cameraMovement: partial.cameraMovement || 'Travelling avant lent parfaitement centré',
    videoPrompt: `Cinematic footage, style of ${mode.style}, symmetrical framing, vintage pastel palette, 4k ultra-detailed`,
    soundAmbience: 'Musique douce de celesta et accordéon rétro',
    overlayText: partial.overlayText || `ACTE ${index}`,
    colorHexes: chosenPalette.colors.slice(0, 3),
    status: 'pending'
  };
}

function normalizeProject(
  rawObj: any,
  mode: ModeItem,
  scenesCount: number,
  duration: number,
  aspectRatio: '9:16' | '16:9' | '1:1' | '4:3',
  strategy: number,
  rawText: string
): GeneratedProject {
  const palLabel = (mode.palette || 'pink-mint').toLowerCase();
  const chosenPalette = WA_PALETTES.find(p => p.id === mode.palette || p.label.toLowerCase().includes(palLabel)) || WA_PALETTES[0];
  const rawScenes = Array.isArray(rawObj.scenes) ? rawObj.scenes : [];

  const scenes: GeneratedScene[] = rawScenes.map((s: any, idx: number) => {
    return {
      sceneNumber: s.sceneNumber || idx + 1,
      title: s.title || `Séquence ${idx + 1}`,
      duration: s.duration || duration,
      voiceover: s.voiceover || `Séquence ${idx + 1} du clip ${mode.name}.`,
      visualDescription: s.visualDescription || `Composition cinématographique symétrique en couleurs douces.`,
      cameraMovement: s.cameraMovement || 'Travelling latéral fluide',
      videoPrompt: s.videoPrompt || `A cinematic shot in style of ${mode.style}, pastel colors, 8k, symmetrical`,
      soundAmbience: s.soundAmbience || 'Ambiance feutrée avec instruments acoustiques',
      overlayText: s.overlayText || `ACTE ${idx + 1}`,
      colorHexes: Array.isArray(s.colorHexes) && s.colorHexes.length ? s.colorHexes : chosenPalette.colors.slice(0, 3),
      status: 'pending'
    };
  });

  return {
    title: rawObj.title || `${mode.name} — Production Spéciale`,
    synopsis: rawObj.logline || rawObj.synopsis || `Création visuelle studio suivant le mode #${mode.n}.`,
    mode: rawObj.mode || `#${mode.n} - ${mode.name}`,
    style: rawObj.style || mode.style,
    palette: rawObj.palette || mode.palette || 'pink-mint',
    aspectRatio: aspectRatio,
    totalDuration: scenes.reduce((acc, s) => acc + (s.duration || duration), 0),
    scenes,
    rawText,
    usedStrategy: strategy
  };
}

// Strategy 5 procedural fallback generator
export function generateProceduralFallback(
  mode: ModeItem,
  subject: string,
  scenesCount: number,
  duration: number,
  aspectRatio: '9:16' | '16:9' | '1:1' | '4:3',
  rawText?: string
): GeneratedProject {
  const palLabel = (mode.palette || 'pink-mint').toLowerCase();
  const chosenPalette = WA_PALETTES.find(p => p.id === mode.palette || p.label.toLowerCase().includes(palLabel)) || WA_PALETTES[0];
  const safeSubject = subject.trim() || mode.defaultSubject;

  const sceneTitles = [
    'Le Décor & L’Accroche',
    'La Révélation Inattendue',
    'Le Tournant Critique',
    'Le Climax Mémorable',
    'L’Épilogue Poétique',
    'La Note Finale'
  ];

  const cameraMotions = [
    'Plan fixe géométrique avec symétrie axiale parfaite',
    'Travelling latéral à 90 degrés de gauche à droite',
    'Gros plan frontal millimétré avec focale vintage',
    'Plongée zénithale à 90 degrés sur les objets disposés au cordeau',
    'Travelling avant lent et majestueux vers le protagoniste',
    'Panoramique rapide whip-pan avec arrêt net'
  ];

  const scenes: GeneratedScene[] = [];
  const count = Math.max(1, Math.min(6, scenesCount));

  for (let i = 0; i < count; i++) {
    const num = i + 1;
    let voice = '';
    let visual = '';

    if (num === 1) {
      voice = `Voici l’histoire insolite de ${safeSubject}. Tout a commencé un mardi matin ordinaire, à huit heures quarante-deux précises.`;
      visual = `Cadrage parfaitement symétrique centré sur un personnage impassible dans un décor rétro aux teintes ${chosenPalette.colors[0]} et ${chosenPalette.colors[1]}.`;
    } else if (num === count) {
      voice = `Et c’est ainsi que ${safeSubject} prit une tournure inoubliable. Comme quoi, les détails les plus infimes cachent parfois les plus grands mystères.`;
      visual = `Plan large majestueux montrant l’ensemble de la scène, avec un carton de fin vintage aux typographies dorées.`;
    } else {
      voice = `Acte ${num} : Tandis que les indices s’accumulent, une curieuse coïncidence vient bouleverser la routine millimétrée du récit.`;
      visual = `Mouvement de caméra fluide dévoilant des accessoires d’époque, lettres manuscrites et objets insolites harmonisés en ${chosenPalette.colors[num % chosenPalette.colors.length]}.`;
    }

    scenes.push({
      sceneNumber: num,
      title: sceneTitles[i] || `Scène ${num}`,
      duration: duration,
      voiceover: voice,
      visualDescription: visual,
      cameraMovement: cameraMotions[i % cameraMotions.length],
      videoPrompt: `Cinematic frame, style of Wes Anderson, pastel aesthetics, symmetrical composition, colors ${chosenPalette.colors.join(', ')}, Kodak film stock, 35mm photography`,
      soundAmbience: 'Accordéon mélancolique, battement d’horloge vintage et clochettes d’hôtel',
      overlayText: `CHAPITRE ${num}`,
      colorHexes: chosenPalette.colors.slice(0, 3),
      status: 'pending'
    });
  }

  return {
    title: `${mode.name} — ${safeSubject.slice(0, 35)}`,
    synopsis: `Une production cinématographique ${mode.category.split(' ')[0]} explorant avec poésie et rythme : "${safeSubject}".`,
    mode: `#${mode.n} - ${mode.name}`,
    style: mode.style,
    palette: mode.palette || 'pink-mint',
    aspectRatio,
    totalDuration: count * duration,
    scenes,
    rawText,
    usedStrategy: 5
  };
}
