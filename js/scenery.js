/* ============================================================
   scenery.js — 戰場場景（背景、關卡色盤、環境光點）
   背景整張預先畫到離屏 canvas，每幀只貼一次圖；
   換關卡 / 模式時依色盤重建。全部程式繪製，不需要圖檔。
   ============================================================ */

const Scenery = {
  /**
   * 每關一組色盤（key = LEVELS 的 id，無盡模式用 endless）。
   * grass：棋盤兩色；blade：草葉亮 / 暗筆觸；light：主光源位置與顏色；
   * fog：右側敵人來向的霧色；fly：光點顏色與數量；vignette：暗角強度。
   * 顏色一律用 #rrggbb（glow() 靠補 '00' 做出透明端）。
   */
  THEMES: {
    classic: {
      grass: ['#2f5238', '#294931'], blade: ['#4f8a55', '#1c3524'], soil: '#16241c',
      light: { x: 0.18, y: 0.0, color: '#aac4ff', alpha: 0.20 },
      fog: '#2a1f4d', fly: '#ffe08a', flies: 16, dot: '#ffe9a8', vignette: 0.55,
    },
    moonless: {
      grass: ['#1c3036', '#18292f'], blade: ['#2f5560', '#0f1c22'], soil: '#0b1418',
      light: { x: 0.5, y: 0.5, color: '#6f8fb5', alpha: 0.06 },
      fog: '#120d2b', fly: '#9adcff', flies: 7, dot: '#7fb4c9', vignette: 0.8,
    },
    rocky: {
      grass: ['#3c4a3d', '#354237'], blade: ['#66796a', '#232c25'], soil: '#1c211d',
      light: { x: 0.25, y: 0.0, color: '#c9d4e8', alpha: 0.16 },
      fog: '#2b2440', fly: '#e8ddb0', flies: 10, dot: '#9aa39c', vignette: 0.55,
      pebbles: true,
    },
    gale: {
      grass: ['#22504a', '#1d4641'], blade: ['#48958a', '#12302c'], soil: '#0f2421',
      light: { x: 0.15, y: 0.0, color: '#a8f0e0', alpha: 0.16 },
      fog: '#1a2a52', fly: '#c8fff2', flies: 10, dot: '#bff5ea', vignette: 0.55,
      wind: true,
    },
    dusk: {
      grass: ['#44324f', '#3a2a45'], blade: ['#7a5a8c', '#231829'], soil: '#1b1220',
      light: { x: 1.0, y: 0.1, color: '#ff8a5c', alpha: 0.22 },
      fog: '#5a1a3c', fly: '#ff9ad0', flies: 14, dot: '#ffb3d9', vignette: 0.6,
    },
    endless: {
      grass: ['#2a3862', '#243158'], blade: ['#5068a8', '#161d3a'], soil: '#121830',
      light: { x: 0.5, y: 0.0, color: '#ffd97a', alpha: 0.14 },
      fog: '#3a1f66', fly: '#ffd97a', flies: 22, dot: '#ffe9a8', vignette: 0.6,
    },
  },

  cache: null,
  cacheKey: '',
  glowCache: {},

  themeKey() {
    if (G.mode === 'endless' && G.phase !== 'start') return 'endless';
    return G.level ? G.level.id : 'classic';
  },

  theme() {
    return this.THEMES[this.themeKey()] || this.THEMES.classic;
  },

  /** 目前關卡的背景圖（換關才重畫） */
  background() {
    const key = this.themeKey();
    if (!this.cache || this.cacheKey !== key) {
      this.cache = this.build(this.theme());
      this.cacheKey = key;
    }
    return this.cache;
  },

  /** 固定種子亂數：同一關每次長一樣，草不會每次重開就換位置 */
  rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  build(th) {
    const W = CONFIG.CANVAS_W, H = CONFIG.CANVAS_H;
    const GX = CONFIG.GRID_X, GY = CONFIG.GRID_Y;
    const CW = CONFIG.CELL_W, CH = CONFIG.CELL_H;
    const gridW = CONFIG.COLS * CW, gridH = CONFIG.ROWS * CH;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const rand = this.rng(20260716);

    ctx.fillStyle = th.soil;
    ctx.fillRect(0, 0, W, H);

    // 棋盤草地：兩色差距刻意小，靠格緣暗線維持「哪一格」的可讀性
    for (let r = 0; r < CONFIG.ROWS; r++) {
      for (let c = 0; c < CONFIG.COLS; c++) {
        const x = GX + c * CW, y = GY + r * CH;
        ctx.fillStyle = th.grass[(r + c) % 2];
        ctx.fillRect(x, y, CW, CH);
        ctx.strokeStyle = 'rgba(0, 0, 0, .13)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, CW - 2, CH - 2);
      }
    }

    // 草葉筆觸：每叢 2~3 根短弧線，亮暗各半
    ctx.lineCap = 'round';
    for (let i = 0; i < 1100; i++) {
      const x = GX + rand() * gridW, y = GY + rand() * gridH;
      ctx.strokeStyle = th.blade[rand() < 0.5 ? 0 : 1];
      ctx.globalAlpha = 0.25 + rand() * 0.35;
      ctx.lineWidth = 1.4;
      const blades = 2 + Math.floor(rand() * 2);
      for (let b = 0; b < blades; b++) {
        const lean = (rand() - 0.5) * 7, len = 4 + rand() * 6;
        ctx.beginPath();
        ctx.moveTo(x + b * 2.5, y);
        ctx.quadraticCurveTo(x + b * 2.5 + lean * 0.3, y - len * 0.6, x + b * 2.5 + lean, y - len);
        ctx.stroke();
      }
    }

    // 點綴：小花光點（巨石陣改成碎石）
    for (let i = 0; i < 70; i++) {
      const x = GX + rand() * gridW, y = GY + rand() * gridH;
      ctx.globalAlpha = th.pebbles ? 0.5 : 0.35 + rand() * 0.4;
      ctx.fillStyle = th.dot;
      ctx.beginPath();
      if (th.pebbles) ctx.ellipse(x, y, 2 + rand() * 3, 1.5 + rand() * 2, rand() * 3, 0, Math.PI * 2);
      else ctx.arc(x, y, 0.8 + rand() * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 主光源（月光 / 暮色 / 星光）
    const lx = th.light.x * W, ly = th.light.y * H;
    const light = ctx.createRadialGradient(lx, ly, 0, lx, ly, W * 0.75);
    light.addColorStop(0, th.light.color);
    light.addColorStop(1, th.light.color + '00');
    ctx.globalAlpha = th.light.alpha;
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    // 右側：暗影族來向的霧
    const fog = ctx.createLinearGradient(W - 210, 0, W, 0);
    fog.addColorStop(0, th.fog + '00');
    fog.addColorStop(1, th.fog);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = fog;
    ctx.fillRect(W - 210, 0, 210, H);
    ctx.globalAlpha = 1;

    // 左側防線：樹籬 + 家的暖光
    ctx.fillStyle = '#12261a';
    ctx.fillRect(0, GY - 6, GX, gridH + 12);
    for (let y = GY - 4; y < GY + gridH + 8; y += 9) {
      ctx.fillStyle = rand() < 0.5 ? '#1f4a2c' : '#183a23';
      ctx.beginPath();
      ctx.arc(GX - 7 + rand() * 4, y + rand() * 3, 7 + rand() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    const warm = ctx.createLinearGradient(0, 0, GX + 70, 0);
    warm.addColorStop(0, 'rgba(255, 217, 122, .22)');
    warm.addColorStop(1, 'rgba(255, 217, 122, 0)');
    ctx.fillStyle = warm;
    ctx.fillRect(0, GY, GX + 70, gridH);

    // 暗角：把視線收向戰場中央
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, W * 0.62);
    vig.addColorStop(0, 'rgba(4, 6, 14, 0)');
    vig.addColorStop(1, `rgba(4, 6, 14, ${th.vignette})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    return canvas;
  },

  /** 柔光圓點貼圖（光點、投射物、爆裂共用），每色只建一次 */
  glow(color) {
    if (this.glowCache[color]) return this.glowCache[color];
    const size = 64;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, color);
    g.addColorStop(0.35, color + '88');
    g.addColorStop(1, color + '00');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    this.glowCache[color] = c;
    return c;
  },

  /** 在 (x, y) 疊一顆直徑 d 的加亮柔光 */
  drawGlow(ctx, color, x, y, d, alpha) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(this.glow(color), x - d / 2, y - d / 2, d, d);
    ctx.restore();
  },

  /** 環境動態：飄動光點（+ 疾風關的風痕）。t 用實際時間，暫停時畫面仍有生氣 */
  drawAmbient(ctx, t) {
    const th = this.theme();
    const W = CONFIG.CANVAS_W, H = CONFIG.CANVAS_H;
    const frac = v => v - Math.floor(v);
    for (let i = 0; i < th.flies; i++) {
      const bx = frac(Math.sin(i * 12.9898) * 43758.5453) * W;
      const by = frac(Math.sin(i * 78.233) * 24634.6345) * H;
      const x = bx + Math.sin(t * 0.31 + i) * 26 + Math.sin(t * 0.11 + i * 2.3) * 40;
      const y = by + Math.cos(t * 0.23 + i * 1.3) * 18;
      const a = 0.3 + 0.4 * Math.sin(t * 1.7 + i * 4.1);
      this.drawGlow(ctx, th.fly, x, y, 14, a);
    }
    if (th.wind) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.5;
      for (let k = 0; k < 8; k++) {
        const speed = 300 + k * 35;
        const x = W + 120 - frac((t * speed + k * 211) / (W + 240)) * (W + 240);
        const y = frac(Math.sin(k * 5.17) * 9631.7) * H;
        ctx.globalAlpha = 0.07 + (k % 3) * 0.03;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 70 + k * 6, y - 5);
        ctx.stroke();
      }
      ctx.restore();
    }
  },
};
