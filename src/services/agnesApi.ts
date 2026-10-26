export interface AgnesKeyStatus {
  key: string;
  state: 'active' | 'cool' | 'dead';
  cooldownUntil?: number;
  usageCount: number;
  lastUsed?: number;
}

export interface QuotaStatus {
  videoRpm: number;
  imagesGenerated: number;
  videosGenerated: number;
  lastReset: number;
}

const STORAGE_KEY = 'studio_master_keys_v2';
const API_BASE = 'https://apihub.agnes-ai.com/v1';
const POLL_BASE = 'https://apihub.agnes-ai.com/agnesapi';
const VIDEO_FIRST_POLL_DELAY_SEC = 60;
const VIDEO_POLL_INTERVALS = [8, 8, 12, 12, 20, 20, 25];
const VIDEO_MAX_POLL_ATTEMPTS = 100;
const MODEL_VIDEO = 'agnes-video-v2.0';

class AgnesPoolManager {
  private keys: AgnesKeyStatus[] = [];
  private currentKeyIndex = 0;
  private quota: QuotaStatus = {
    videoRpm: 0,
    imagesGenerated: 0,
    videosGenerated: 0,
    lastReset: Date.now()
  };

  constructor() {
    this.loadKeys();
  }

  public loadKeys(): AgnesKeyStatus[] {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('studio_master_keys_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.keys = parsed.map(k => ({
            key: typeof k === 'string' ? k : k.key,
            state: 'active',
            usageCount: 0
          }));
        }
      }
    } catch {
      this.keys = [];
    }
    return this.keys;
  }

  public saveKeys(rawKeysText: string): AgnesKeyStatus[] {
    const lines = rawKeysText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 5);

    const newKeys: AgnesKeyStatus[] = lines.map(line => ({
      key: line,
      state: 'active',
      usageCount: 0
    }));

    this.keys = newKeys;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newKeys));
    }
    return this.keys;
  }

  public getKeys(): AgnesKeyStatus[] {
    const now = Date.now();
    this.keys.forEach(k => {
      if (k.state === 'cool' && k.cooldownUntil && k.cooldownUntil < now) {
        k.state = 'active';
      }
    });
    return [...this.keys];
  }

  public getActiveWorkerCount(): number {
    return this.getKeys().filter(k => k.state === 'active').length;
  }

  public getQuota(): QuotaStatus {
    const now = Date.now();
    if (now - this.quota.lastReset > 60000) {
      this.quota.videoRpm = 0;
      this.quota.lastReset = now;
    }
    return { ...this.quota };
  }

  public incrementImages() {
    this.quota.imagesGenerated++;
  }

  public incrementVideos() {
    this.quota.videosGenerated++;
    this.quota.videoRpm++;
  }

  // Test an API key (HTTP GET /models or via backend proxy)
  public async testKey(keyStr: string): Promise<{ valid: boolean; status: number; message: string }> {
    try {
      const trimmed = keyStr.trim();
      const res = await fetch('/api/agnes-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: `${API_BASE}/models`,
          apiKey: trimmed,
          method: 'GET'
        })
      });

      if (res.status === 200 || res.status === 404) {
        return { valid: true, status: res.status, message: 'Clé API valide ✓' };
      } else if (res.status === 401 || res.status === 403) {
        return { valid: false, status: res.status, message: 'Clé API invalide (401/403)' };
      } else {
        return { valid: true, status: res.status, message: `HTTP ${res.status}` };
      }
    } catch (e: any) {
      return { valid: false, status: 500, message: e.message || 'Erreur réseau' };
    }
  }

  // Get next active key using Round-Robin
  public getNextKey(): AgnesKeyStatus | null {
    const active = this.getKeys().filter(k => k.state === 'active');
    if (active.length === 0) return null;

    this.currentKeyIndex = (this.currentKeyIndex + 1) % active.length;
    const selected = active[this.currentKeyIndex];
    selected.usageCount++;
    selected.lastUsed = Date.now();
    return selected;
  }

  public markKeyCool(keyStr: string, cooldownSec = 30) {
    const found = this.keys.find(k => k.key === keyStr);
    if (found) {
      found.state = 'cool';
      found.cooldownUntil = Date.now() + (cooldownSec * 1000);
    }
  }

  public markKeyDead(keyStr: string) {
    const found = this.keys.find(k => k.key === keyStr);
    if (found) {
      found.state = 'dead';
    }
  }

  // Decode composite base64 ID
  private decodeCompositeId(composite: string): string | null {
    if (!composite || typeof composite !== 'string') return null;
    if (!composite.startsWith('video_')) return null;
    let b64 = composite.slice(6);
    while (b64.length % 4) b64 += '=';
    try {
      const decoded = atob(b64);
      const m = decoded.match(/video_id:([^;]+)/);
      if (m && m[1]) return m[1].trim();
    } catch {}
    return null;
  }

  public async submitVideoTask(
    prompt: string,
    aspectRatio: string,
    durationSec: number,
    onProgress?: (progressText: string) => void
  ): Promise<string> {
    return this.createVideoTask(prompt, aspectRatio, durationSec, '1080P', onProgress);
  }

  // Create video task with quality parameter
  public async createVideoTask(
    prompt: string,
    aspectRatio: string,
    durationSec: number,
    quality: string = '1080P',
    onProgress?: (progressText: string) => void
  ): Promise<string> {
    const keyItem = this.getNextKey();
    if (!keyItem) {
      throw new Error('Aucune clé API Agnes active disponible dans le pool.');
    }

    onProgress?.(`Envoi tâche vidéo (Worker ${keyItem.key.slice(0, 8)}…)`);

    const effQuality = quality || '1080P';
    const payload = {
      model: MODEL_VIDEO,
      prompt: prompt,
      aspect_ratio: aspectRatio,
      duration: durationSec,
      size: effQuality,
      frame_rate: 24
    };

    const res = await fetch('/api/agnes-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: `${API_BASE}/videos`,
        apiKey: keyItem.key,
        body: payload
      })
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        this.markKeyDead(keyItem.key);
        throw new Error(`Clé Agnes invalide (${res.status})`);
      } else if (res.status === 429) {
        this.markKeyCool(keyItem.key, 45);
        throw new Error('Limite de requêtes Agnes atteinte (429 Cooldown)');
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Erreur Agnes: HTTP ${res.status}`);
    }

    const data = await res.json();
    const compositeId = data.video_id || data.id || data.task_id;
    if (!compositeId) {
      if (data.url || data.video_url) return data.url || data.video_url;
      throw new Error('Réponse Agnes invalide : identifiant de vidéo introuvable.');
    }

    this.incrementVideos();
    const innerId = this.decodeCompositeId(compositeId);
    const idToPoll = innerId || compositeId;

    // Wait initial delay
    let rem = VIDEO_FIRST_POLL_DELAY_SEC;
    while (rem > 0) {
      onProgress?.(`Préparation — ${rem}s`);
      await new Promise(r => setTimeout(r, 1000));
      rem -= 2;
    }

    // Polling endpoints
    const endpoints = [
      `${POLL_BASE}?video_id=${encodeURIComponent(idToPoll)}&model_name=${encodeURIComponent(MODEL_VIDEO)}`,
      `${API_BASE}/videos/${encodeURIComponent(idToPoll)}`,
      `${API_BASE}/videos/${encodeURIComponent(compositeId)}`
    ];

    let attempts = 0;
    while (attempts < VIDEO_MAX_POLL_ATTEMPTS) {
      const waitInterval = VIDEO_POLL_INTERVALS[Math.min(attempts, VIDEO_POLL_INTERVALS.length - 1)];
      attempts++;

      onProgress?.(`Création — tentative ${attempts}/${VIDEO_MAX_POLL_ATTEMPTS}`);
      await new Promise(r => setTimeout(r, waitInterval * 1000));

      for (const endpoint of endpoints) {
        try {
          const pollRes = await fetch('/api/agnes-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint,
              apiKey: keyItem.key,
              method: 'GET'
            })
          });

          if (pollRes.ok) {
            const pollData = await pollRes.json();
            const status = pollData.status;
            if (status === 'completed' || status === 'succeeded' || status === 'done') {
              return pollData.video_url || pollData.url || (pollData.metadata && pollData.metadata.url) || pollData.output;
            } else if (status === 'failed' || status === 'error') {
              throw new Error(pollData.error || 'Génération vidéo Agnes échouée.');
            }
          }
        } catch {}
      }
    }

    throw new Error('Délai maximal dépassé pour le rendu de la vidéo Agnes.');
  }
}

export const agnesPool = new AgnesPoolManager();
