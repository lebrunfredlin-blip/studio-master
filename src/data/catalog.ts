export interface ModeItem {
  n: number;
  name: string;
  category: 'TikTok & Monétisation (941-990)' | 'Films & Séries (991-1030)';
  scenes: number;
  duration: number;
  ratio: '9:16' | '16:9' | '1:1' | '4:3';
  newsSource?: 'lfi' | 'custom';
  palette?: string;
  style: string;
  description: string;
  defaultSubject: string;
  promptTemplate?: string | null;
}

export interface PaletteItem {
  id: string;
  label: string;
  colors: string[];
}

export const WA_PALETTES: PaletteItem[] = [
  { id: 'pink-mint', label: 'Rose poudré & Menthe', colors: ['#F4C2C2', '#A8D8B9', '#E5B95A', '#F5F0E1', '#7B9FB0'] },
  { id: 'coral-teal', label: 'Corail & Turquoise', colors: ['#E8A87C', '#85CDCA', '#F4E4BA', '#D4A5A5', '#7C6A8B'] },
  { id: 'mustard-blue', label: 'Moutarde & Bleu ciel', colors: ['#F7D794', '#778BEB', '#E77F67', '#F1E7D0', '#3B4B55'] },
  { id: 'lavender', label: 'Lavande & Ocre', colors: ['#C5B7D9', '#E5B95A', '#F4A6A6', '#F5EFE0', '#7A8B7E'] },
  { id: 'sage-blush', label: 'Sauge & Blush', colors: ['#B8C9A8', '#F1C6C6', '#E8B44A', '#F5F0E1', '#5B6E7A'] },
  { id: 'ochre-rose', label: 'Ocre & Rose fané', colors: ['#D9A44A', '#E8B8B8', '#8FAE8B', '#F4E8D0', '#6B5B7B'] }
];

export const VISUAL_STYLES = [
  'Wes Anderson Signature (Symétrie absolue, pastels, cadrage frontal géométrique)',
  'TikTok Viral Flash (Rythme ultra rapide, gros plans expressifs, punchlines)',
  'Film Noir Vintage N&B (Ombres tranchées, atmosphère feutrée, vénitiennes)',
  'Cinéma Technicolor 35mm (Grain photo, couleurs saturées rétro, chaleur analogique)',
  'Cyberpunk Néo-Tokyo (Néons colorés, reflets sur bitume mouillé, synthwave)',
  'Documentaire Prestige Nature (Grand angle haute précision, lumière rasante dorée)',
  'Anime & Animation Poétique (Couleurs aquarelle, décors peints minutieux)',
  'Caméscope VHS 90s (Scanlines douces, texture analogique nostalgique)'
];

export const SUBTITLE_STYLES = [
  { id: 'karaoke-yellow', name: 'Karaoké TikTok Jaune Fluo (Mots en surbrillance)' },
  { id: 'wes-anderson', name: 'Futura Bold Centré (Élégance Wes Anderson)' },
  { id: 'cinema-classic', name: 'Bandeau Cinéma Classique (Noir translucide)' },
  { id: 'minimal-modern', name: 'Minimaliste Blanc & Ombre portée' }
];

// Specific tutorial prompts for modes 950-958
export const TUTORIAL_PROMPTS: Record<number, string> = {
  950: 'Démontre visuellement le parser JSON 5-stratégies : montre un JSON cassé, puis le même réparé. Utilise des overlays de code.',
  951: 'Démontre le polling multi-endpoints : 4 écrans en parallèle, un par endpoint. Le premier qui répond passe en vert.',
  952: 'Démontre le pool multi-clés : montre 3 clés API en parallèle, chacune avec son worker, sur un dashboard rétro.',
  953: 'Compare le format 1K+ratio vs 1024x1792 : deux images côte à côte, annotées.',
  954: 'Démontre le fallback programmatique : le LLM échoue (croix rouge), le fallback prend le relais (coche verte), scénario généré.',
  955: 'Chatons kung-fu en action : enchaînements de mouvements shaolin, caméra qui orbite.',
  956: 'Tutoriel Wes Anderson : montre la symétrie, les cuts, le champ-contrechamp, avec des flèches annotées.',
  957: 'Palette Generator : affiche les 6 palettes WA, chaque scène en utilise une.',
  958: 'RSS Fallback : montre rss2json qui échoue, allorigins qui prend le relais, puis codetabs en backup.'
};

const TIKTOK_CAT = 'TikTok & Monétisation (941-990)';
const FILM_CAT = 'Films & Séries (991-1030)';

const tiktokNames = [
  'TikTok JT 60s', 'TikTok Débat Multi-Clés', 'TikTok Série Quotidienne', 'TikTok Micro-JT 15s',
  'TikTok Chaton du Jour', 'TikTok Combinaison Folle', 'TikTok Analyse de Style', 'TikTok Anti-Fuite',
  'TikTok Player Canvas Démo', 'TikTok Parser JSON', 'TikTok Multi-Endpoints', 'TikTok Pool Multi-Clés',
  'TikTok Format 1K', 'TikTok Fallback Programmatique', 'TikTok Chatons Kung-Fu', 'TikTok Wes Anderson Tutorial',
  'TikTok Palette Generator', 'TikTok RSS Fallback', 'TikTok Validation Manuelle', 'TikTok JT Personnalisé',
  'TikTok JT Local Vendée', 'TikTok JT Association', 'TikTok JT Mariage', 'TikTok JT Anniversaire',
  'TikTok JT Entreprise', 'TikTok JT École', 'TikTok JT Club Sportif', 'TikTok JT Paroisse',
  'TikTok JT Syndic', 'TikTok JT Mairie', 'TikTok JT Parti Politique', 'TikTok JT ONG',
  'TikTok JT Festival', 'TikTok JT Salon', 'TikTok JT Conférence', 'TikTok JT Formation',
  'TikTok JT Voyage', 'TikTok JT Cuisine', 'TikTok JT Sport Quotidien', 'TikTok JT Météo',
  'TikTok JT Horoscope', 'TikTok JT Crypto', 'TikTok JT Bourse', 'TikTok JT Immobilier',
  'TikTok JT Auto', 'TikTok JT Tech', 'TikTok JT Gaming', 'TikTok JT Cinéma',
  'TikTok JT Livre', 'TikTok JT Musique'
];

const filmNames = [
  'Film Noir Chaton', 'Film Cyberpunk Chaton', 'Film Western Chaton', 'Film Spatial Chaton',
  'Film Historique Chaton', 'Film Fantastique Chaton', 'Film Horreur Chaton', 'Film Romantique Chaton',
  'Film Comédie Chaton', 'Film Documentaire Chaton', 'Série Saison 1 Chaton', 'Série Saison 2 Chaton',
  'Série Anthologie Chaton', 'Série Spin-Off Chaton', 'Série Prequel Chaton', 'Série Sequel Chaton',
  'Série Crossover Chaton', 'Film 3 Actes Chaton', 'Film 5 Actes Chaton', 'Film Chronologique Inversé',
  'Film Boucle Temporelle', 'Film Multiverse Chaton', 'Film Found Footage Chaton', 'Film Mockumentaire Chaton',
  'Film Muet Chaton', 'Film Rétro 1920 Chaton', 'Film Rétro 1950 Chaton', 'Film Rétro 1980 Chaton',
  'Film Rétro 1990 Chaton', 'Film Futuriste 2100 Chaton', 'Film Post-Apo Chaton', 'Film Utopique Chaton',
  'Film Dystopique Chaton', 'Film Catastrophe Chaton', 'Film Apocalyptique Chaton', 'Film Philosophique Chaton',
  'Film Expérimental Chaton', 'Film Poétique Chaton', 'Film Musical Chaton', 'Film Opéra Chaton'
];

const filmPalettes = [
  'ochre-rose', 'mustard-blue', 'ochre-rose', 'coral-teal', 'sage-blush', 'lavender', 'ochre-rose',
  'pink-mint', 'mustard-blue', 'sage-blush', 'pink-mint', 'coral-teal', 'lavender', 'sage-blush',
  'pink-mint', 'ochre-rose', 'mustard-blue', 'pink-mint', 'ochre-rose', 'sage-blush', 'coral-teal',
  'lavender', 'ochre-rose', 'sage-blush', 'mustard-blue', 'ochre-rose', 'pink-mint', 'coral-teal',
  'lavender', 'mustard-blue', 'sage-blush', 'pink-mint', 'ochre-rose', 'coral-teal', 'sage-blush',
  'lavender', 'mustard-blue', 'pink-mint', 'coral-teal', 'ochre-rose'
];

export const ALL_MODES: ModeItem[] = [];

// Build 50 TikTok modes (941-990)
tiktokNames.forEach((name, i) => {
  const n = 941 + i;
  ALL_MODES.push({
    n,
    name,
    category: TIKTOK_CAT,
    scenes: i === 40 ? 12 : 3,
    duration: 15,
    ratio: '9:16',
    newsSource: i < 20 ? 'lfi' : 'custom',
    style: 'Wes Anderson Signature (Symétrie absolue, pastels, cadrage frontal géométrique)',
    palette: 'pink-mint',
    description: `Format court dynamique TikTok · ${i === 40 ? '12 séquences' : '3 séquences'} × 15s · Ratio vertical 9:16.`,
    defaultSubject: n === 941
      ? 'La France insoumise et les mobilisations lycéennes'
      : n === 945
      ? 'Un chaton détective enquête dans un Paris rétrofuturiste'
      : n === 955
      ? 'Des chatons kung-fu en kimono shaolin pastel défendent un temple'
      : `${name} — Un sujet captivant tourné avec une esthétique cinématographique Wes Anderson.`,
    promptTemplate: TUTORIAL_PROMPTS[n] || null
  });
});

// Build 40 Film & Series modes (991-1030)
filmNames.forEach((name, i) => {
  const n = 991 + i;
  const scenes = i < 10 ? 10 : (i < 17 ? 6 : 10);
  ALL_MODES.push({
    n,
    name,
    category: FILM_CAT,
    scenes,
    duration: 8,
    ratio: '16:9',
    palette: filmPalettes[i],
    style: 'Cinéma Technicolor 35mm (Grain photo, couleurs saturées rétro, chaleur analogique)',
    description: `Production cinématographique complète · ${scenes} scènes × 8s · Ratio écran large 16:9 · Palette ${filmPalettes[i]}.`,
    defaultSubject: `Un récit cinématographique immersif pour ${name} avec des personnages de chatons kung-fu et mise en scène soignée.`,
    promptTemplate: null
  });
});
