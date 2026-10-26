import { GeneratedScene } from './parser';
import { audioEngine } from './audioEngine';

export interface RenderFrameOptions {
  canvas: HTMLCanvasElement;
  scene: GeneratedScene;
  progress: number; // 0 to 1
  spokenWordIndex?: number;
  spokenWordLength?: number;
  showCrosshairs?: boolean;
  aspectRatio: '9:16' | '16:9' | '1:1' | '4:3';
  subtitleStyle?: string;
  totalScenesCount?: number;
}

export class VideoRendererService {
  // Render a single animated cinematic frame to canvas
  public renderSceneFrame(options: RenderFrameOptions) {
    const {
      canvas,
      scene,
      progress,
      spokenWordIndex = -1,
      spokenWordLength = 0,
      showCrosshairs = false,
      aspectRatio,
      subtitleStyle = 'karaoke-yellow',
      totalScenesCount = 4
    } = options;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;

    const colors = scene.colorHexes && scene.colorHexes.length >= 2 
      ? scene.colorHexes 
      : ['#F4C2C2', '#A8D8B9', '#E5B95A'];

    // 1. Ken Burns Camera Motion calculations
    const zoom = 1.0 + (progress * 0.12); // smooth subtle push-in
    let panX = 0;
    let panY = 0;

    if (scene.cameraMovement.toLowerCase().includes('gauche') || scene.cameraMovement.toLowerCase().includes('left')) {
      panX = (progress - 0.5) * 40;
    } else if (scene.cameraMovement.toLowerCase().includes('droite') || scene.cameraMovement.toLowerCase().includes('right')) {
      panX = (0.5 - progress) * 40;
    } else if (scene.cameraMovement.toLowerCase().includes('haut') || scene.cameraMovement.toLowerCase().includes('plongée')) {
      panY = (progress - 0.5) * 30;
    }

    ctx.save();
    // Center transformations
    ctx.translate(cx, cy);
    ctx.scale(zoom, zoom);
    ctx.translate(-cx + panX, -cy + panY);

    // 2. Background base: Symmetrical Wes Anderson room/landscape composition
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(0.5, colors[1]);
    grad.addColorStop(1, colors[2] || colors[0]);
    ctx.fillStyle = grad;
    ctx.fillRect(-60, -60, width + 120, height + 120);

    // Decorative architectural panels (Wes Anderson signature symmetry)
    const wallColor = colors[1] || '#FAF6EB';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fillRect(width * 0.1, height * 0.15, width * 0.8, height * 0.7);

    // Symmetrical columns / panels
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fillRect(width * 0.15, height * 0.2, width * 0.3, height * 0.55);
    ctx.fillRect(width * 0.55, height * 0.2, width * 0.3, height * 0.55);

    // Fine molding lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 3;
    ctx.strokeRect(width * 0.12, height * 0.17, width * 0.76, height * 0.66);
    ctx.strokeRect(width * 0.15, height * 0.2, width * 0.3, height * 0.55);
    ctx.strokeRect(width * 0.55, height * 0.2, width * 0.3, height * 0.55);

    // Central framed focal point (circle or emblem)
    ctx.beginPath();
    ctx.arc(cx, cy - (height * 0.05), Math.min(width, height) * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = colors[2] || '#E5B95A';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Focal subject silhouette or geometric icon
    ctx.fillStyle = '#1A1A28';
    ctx.font = `bold ${Math.round(Math.min(width, height) * 0.12)}px 'Cinzel', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${scene.sceneNumber}`, cx, cy - (height * 0.05));

    ctx.restore(); // end camera transformation

    // 3. Film Grain & Vignette Overlay
    const vignette = ctx.createRadialGradient(cx, cy, Math.min(width, height) * 0.4, cx, cy, Math.max(width, height) * 0.85);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.48)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    // 4. Subtle Film Border Frame
    ctx.strokeStyle = 'rgba(235, 230, 215, 0.85)';
    ctx.lineWidth = Math.max(4, Math.round(width * 0.012));
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, width - ctx.lineWidth, height - ctx.lineWidth);

    // 5. Wes Anderson Symmetrical Crosshairs (if enabled)
    if (showCrosshairs) {
      ctx.save();
      ctx.strokeStyle = 'rgba(229, 193, 90, 0.55)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      // Vertical center line
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, height);
      ctx.stroke();
      // Horizontal center line
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(width, cy);
      ctx.stroke();
      ctx.restore();
    }

    // 6. Header Badge: Scene indicator & Mode badge
    ctx.save();
    const badgeTop = height * 0.06;
    ctx.fillStyle = 'rgba(10, 10, 18, 0.85)';
    ctx.strokeStyle = '#E5C15A';
    ctx.lineWidth = 1.5;
    const badgeW = width * 0.65;
    const badgeH = 34;
    const badgeX = cx - (badgeW / 2);
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeTop, badgeW, badgeH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#E5C15A';
    ctx.font = `600 12px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '1px';
    ctx.fillText(
      `WG CLIP · SCÈNE ${scene.sceneNumber}/${totalScenesCount} · ${scene.title.toUpperCase()}`,
      cx,
      badgeTop + (badgeH / 2)
    );
    ctx.restore();

    // 7. Dynamic Subtitles & Narration Overlay
    this.renderSubtitles({
      ctx,
      width,
      height,
      scene,
      spokenWordIndex,
      spokenWordLength,
      subtitleStyle
    });

    // 8. Progress Bar at bottom
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, height - 6, width, 6);
    ctx.fillStyle = '#E5C15A';
    ctx.fillRect(0, height - 6, width * progress, 6);
  }

  // Render subtitles with Karaoke word-by-word highlight or Wes Anderson title cards
  private renderSubtitles(params: {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    scene: GeneratedScene;
    spokenWordIndex: number;
    spokenWordLength: number;
    subtitleStyle: string;
  }) {
    const { ctx, width, height, scene, spokenWordIndex, subtitleStyle } = params;
    const text = scene.voiceover.trim();
    if (!text) return;

    ctx.save();

    if (subtitleStyle === 'wes-anderson') {
      // Elegant Wes Anderson centered title card with dark frame
      const boxW = width * 0.86;
      const boxY = height * 0.74;
      const padding = 16;
      
      ctx.font = `italic 600 ${Math.max(16, Math.round(width * 0.038))}px 'Plus Jakarta Sans', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const lines = this.wrapText(ctx, `« ${text} »`, boxW - 32);
      const boxH = Math.max(70, lines.length * 28 + 24);

      ctx.fillStyle = 'rgba(16, 16, 26, 0.92)';
      ctx.strokeStyle = '#E5C15A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect((width - boxW) / 2, boxY, boxW, boxH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FAF6EB';
      lines.forEach((line, idx) => {
        ctx.fillText(line, width / 2, boxY + padding + 14 + (idx * 28));
      });
    } else {
      // Default / Karaoke yellow font for TikTok
      const boxW = width * 0.92;
      const boxY = height * 0.75;
      const fontSize = Math.max(18, Math.round(width * 0.046));

      ctx.font = `bold ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
      ctx.textAlign = 'center';

      // Split into words for karaoke animation
      const words = text.split(/\s+/);
      let currentLength = 0;
      let activeWordIdx = -1;

      for (let i = 0; i < words.length; i++) {
        const wordStart = text.indexOf(words[i], currentLength);
        if (spokenWordIndex >= wordStart && spokenWordIndex <= wordStart + words[i].length + 1) {
          activeWordIdx = i;
          break;
        }
        currentLength = wordStart + words[i].length;
      }

      // Display window of ~10 words centered
      const chunkSize = 8;
      const currentChunk = activeWordIdx >= 0 ? Math.floor(activeWordIdx / chunkSize) : 0;
      const visibleWords = words.slice(currentChunk * chunkSize, (currentChunk + 1) * chunkSize);
      const visibleSentence = visibleWords.join(' ');

      // Subtitle background pill
      const metrics = ctx.measureText(visibleSentence);
      const bgW = Math.min(boxW, metrics.width + 48);
      const bgH = fontSize * 1.8;
      const bgX = (width - bgW) / 2;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.beginPath();
      ctx.roundRect(bgX, boxY, bgW, bgH, 8);
      ctx.fill();

      // Draw each word, highlight active word in bright TikTok yellow
      ctx.textAlign = 'left';
      let startX = bgX + 24;
      const wordY = boxY + (bgH / 2) + (fontSize * 0.32);

      visibleWords.forEach((w, idx) => {
        const absoluteIdx = (currentChunk * chunkSize) + idx;
        const isCurrent = absoluteIdx === activeWordIdx;

        ctx.fillStyle = isCurrent ? '#FFE600' : '#FFFFFF';
        if (isCurrent) {
          ctx.shadowColor = '#FFE600';
          ctx.shadowBlur = 12;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fillText(w, startX, wordY);
        startX += ctx.measureText(w + ' ').width;
      });
    }

    ctx.restore();
  }

  // Text wrapper helper
  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = ctx.measureText(testLine).width;
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // Generate thumbnail snapshot from scene canvas
  public generateSceneThumbnail(scene: GeneratedScene, aspectRatio: '9:16' | '16:9' | '1:1' | '4:3'): string {
    const canvas = document.createElement('canvas');
    if (aspectRatio === '9:16') {
      canvas.width = 450;
      canvas.height = 800;
    } else if (aspectRatio === '16:9') {
      canvas.width = 800;
      canvas.height = 450;
    } else if (aspectRatio === '1:1') {
      canvas.width = 600;
      canvas.height = 600;
    } else {
      canvas.width = 640;
      canvas.height = 480;
    }

    this.renderSceneFrame({
      canvas,
      scene,
      progress: 0.5,
      aspectRatio,
      showCrosshairs: false
    });

    return canvas.toDataURL('image/jpeg', 0.85);
  }

  // Record an actual WebM video file from canvas and audio stream
  public recordVideoFromCanvas(
    canvas: HTMLCanvasElement,
    durationMs: number,
    onProgress?: (progressPct: number) => void
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const stream = canvas.captureStream(30);
        const audioStream = audioEngine.getAudioStreamDestination().stream;

        // Combine canvas video track + synthesized audio track
        audioStream.getAudioTracks().forEach(track => stream.addTrack(track));

        let mimeType = 'video/webm;codecs=vp9,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }

        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3500000 });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          resolve(blob);
        };

        const startTime = Date.now();
        const interval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
          onProgress?.(pct);
          if (elapsed >= durationMs) {
            clearInterval(interval);
            if (recorder.state === 'recording') recorder.stop();
          }
        }, 100);

        recorder.start(250);
      } catch (err) {
        reject(err);
      }
    });
  }
}

export const videoRenderer = new VideoRendererService();
