/* ============================================================
   render.js — canvas 渲染層（從 main.js 抽出）
   只讀狀態、不改狀態。動畫：單位放置彈出、敵人受傷閃白、
   減速結冰染色、投射物尾焰、光珠脈動、倒數提示、暫停遮罩。
   ============================================================ */

const Renderer = {
  ctx: null,

  init(canvas) {
    canvas.width = CONFIG.CANVAS_W;
    canvas.height = CONFIG.CANVAS_H;
    this.ctx = canvas.getContext('2d');
  },

  /**
   * emoji 專用字型：明確指定彩色 emoji 字型堆疊。
   * 泛型 serif 在 lang="zh-Hant" 頁面會解析到中文字型，
   * emoji fallback 變成單色字形（被 fillStyle 染色、又小又暗）。
   */
  font(size) {
    return `${size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", serif`;
  },

  /**
   * 畫 emoji 的唯一入口。
   * 彩色字形會「乘上 fillStyle 的透明度」——若前面畫過半透明色塊
   * （如防線帶 rgba(...,.12)），忘記重設就會整批 emoji 變 12% 透明。
   * 這裡固定先設不透明 fillStyle 再畫，杜絕狀態洩漏。
   */
  emoji(text, x, y, size) {
    const ctx = this.ctx;
    ctx.font = this.font(size);
    ctx.fillStyle = '#000';
    ctx.fillText(text, x, y);
  },

  /* ---------- 各層 ---------- */

  drawGrid() {
    const ctx = this.ctx;
    for (let r = 0; r < CONFIG.ROWS; r++) {
      for (let c = 0; c < CONFIG.COLS; c++) {
        const o = Grid.cellOrigin(r, c);
        // 棋盤式雙色夜間草地
        ctx.fillStyle = (r + c) % 2 === 0 ? '#2c4a33' : '#26402c';
        ctx.fillRect(o.x, o.y, CONFIG.CELL_W, CONFIG.CELL_H);
      }
    }
    // 左側防線：星光炸彈還在的列亮 🌟（最後防線），用掉的列剩暗色 🏡
    ctx.fillStyle = 'rgba(255, 217, 122, .12)';
    ctx.fillRect(0, CONFIG.GRID_Y, CONFIG.GRID_X, CONFIG.ROWS * CONFIG.CELL_H);
    for (let r = 0; r < CONFIG.ROWS; r++) {
      const y = Grid.rowCenterY(r);
      if (G.rowBombs[r]) {
        const pulse = 1 + Math.sin(G.time * 3 + r) * .15;
        ctx.globalAlpha = .8 + Math.sin(G.time * 3 + r) * .2;
        this.emoji('🌟', CONFIG.GRID_X / 2, y, Math.round(20 * pulse));
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = .45;
        this.emoji('🏡', CONFIG.GRID_X / 2, y, 20);
        ctx.globalAlpha = 1;
      }
    }
  },

  drawHover(hoverCell) {
    if (!hoverCell || G.phase !== 'playing') return;
    const ctx = this.ctx;
    const o = Grid.cellOrigin(hoverCell.row, hoverCell.col);
    const occupied = Grid.isOccupied(hoverCell.row, hoverCell.col);

    // 沒選卡牌：hover 到單位顯示升級提示
    if (!G.selectedType) {
      if (!occupied) return;
      const unit = G.grid[hoverCell.row][hoverCell.col];
      const cost = Units.upgradeCost(unit);
      ctx.fillStyle = 'rgba(255, 217, 122, .22)';
      ctx.fillRect(o.x, o.y, CONFIG.CELL_W, CONFIG.CELL_H);
      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = '#ffd97a';
      ctx.fillText(
        cost === null ? 'Lv MAX' : `⬆ 升級 ✨${cost}`,
        o.x + CONFIG.CELL_W / 2, o.y + 12
      );
      return;
    }

    // 鏟子模式：有單位的格亮橘（可鏟），空格微亮
    if (G.selectedType === 'shovel') {
      ctx.fillStyle = occupied ? 'rgba(255, 160, 80, .38)' : 'rgba(255, 255, 255, .08)';
      ctx.fillRect(o.x, o.y, CONFIG.CELL_W, CONFIG.CELL_H);
      return;
    }

    ctx.fillStyle = occupied ? 'rgba(255, 80, 80, .3)' : 'rgba(255, 255, 255, .22)';
    ctx.fillRect(o.x, o.y, CONFIG.CELL_W, CONFIG.CELL_H);
    if (!occupied) {
      // 半透明預覽
      ctx.globalAlpha = .55;
      const c = Grid.cellCenter(hoverCell.row, hoverCell.col);
      this.emoji(UNIT_TYPES[G.selectedType].emoji, c.x, c.y, 46);
      ctx.globalAlpha = 1;
    }
  },

  /** 通用血條：在 (x, y) 畫寬 w 的血條 */
  drawHpBar(x, y, w, ratio) {
    if (ratio >= 1) return;                    // 滿血不畫，畫面乾淨
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(x - w / 2, y, w, 5);
    ctx.fillStyle = ratio > .5 ? '#7ee081' : ratio > .25 ? '#ffd97a' : '#ff7a7a';
    ctx.fillRect(x - w / 2, y, w * Math.max(0, ratio), 5);
  },

  drawUnits() {
    const ctx = this.ctx;
    for (const u of G.units) {
      const c = Grid.cellCenter(u.row, u.col);
      // 放置彈出動畫：0.25 秒內從 55% 長到 100%
      const pop = Math.min(1, u.age / 0.25);
      const size = Math.round(46 * (0.55 + 0.45 * pop));
      this.emoji(u.def.emoji, c.x, c.y + 2, size);
      // 等級星星：Lv2 一顆、Lv3 兩顆
      for (let i = 0; i < u.level - 1; i++) {
        this.emoji('⭐', c.x - 30 + i * 15, c.y - 30, 13);
      }
      this.drawHpBar(c.x, c.y - 38, 52, u.hp / u.maxHp);
    }
  },

  drawEnemies() {
    const ctx = this.ctx;
    for (const e of G.enemies) {
      const rowY = Grid.rowCenterY(e.row);
      // 飛行型：上下浮動 + 地面影子
      const fly = e.def.flying ? -16 + Math.sin(G.time * 4 + e.x * 0.05) * 4 : 0;
      const y = rowY + fly;
      const s = e.def.size;              // 身體尺寸（Boss 88，其餘 52）
      const draw = s * 1.15;             // 視覺略大於碰撞框
      const half = s / 2;
      // 攻擊中的敵人微微前傾抖動
      const shake = e.target ? Math.sin(G.time * 20) * 2 : 0;

      if (e.def.flying) {
        ctx.fillStyle = 'rgba(0, 0, 0, .3)';
        ctx.beginPath();
        ctx.ellipse(e.x, rowY + half * 0.85, half * 0.6, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 減速中：腳下結冰光圈
      if (e.slowT > 0) {
        ctx.fillStyle = 'rgba(120, 200, 255, .3)';
        ctx.beginPath();
        ctx.arc(e.x, y + half * 0.85, half * 0.85, 0, Math.PI * 2);
        ctx.fill();
      }

      this.emoji(e.def.emoji, e.x + shake, y + 2, Math.round(draw * 0.82));   // 一般 48px、Boss 83px

      // 護甲未破：右上角小盾牌
      if (e.armor > 0) {
        this.emoji('🛡️', e.x + half * 0.8, y - half * 0.85, 18);
      }

      // 受傷閃白
      if (e.flashT > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${e.flashT / 0.15 * 0.6})`;
        ctx.beginPath();
        ctx.arc(e.x + shake, y, half, 0, Math.PI * 2);
        ctx.fill();
      }

      // 護甲條（灰）疊在血條上方
      const barW = s;
      if (e.maxArmor > 0 && e.armor > 0) {
        ctx.fillStyle = 'rgba(0,0,0,.55)';
        ctx.fillRect(e.x - barW / 2, y - half - 22, barW, 4);
        ctx.fillStyle = '#c0c8d8';
        ctx.fillRect(e.x - barW / 2, y - half - 22, barW * (e.armor / e.maxArmor), 4);
      }
      this.drawHpBar(e.x, y - half - 14, barW, e.hp / e.maxHp);
    }
  },

  drawProjectiles() {
    const ctx = this.ctx;
    for (const p of G.projectiles) {
      // 微幅上下飄，讓飛行有生命感
      const wobble = Math.sin(p.age * 25) * 2;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y + wobble, 6, 0, Math.PI * 2);
      ctx.fill();
      // 兩節尾焰
      ctx.globalAlpha = .4;
      ctx.beginPath();
      ctx.arc(p.x - 9, p.y + wobble, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = .18;
      ctx.beginPath();
      ctx.arc(p.x - 17, p.y + wobble, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  },

  drawOrbs() {
    const ctx = this.ctx;
    for (const o of G.orbs) {
      // 快過期時閃爍提示
      const expiring = o.landed && (CONFIG.ORB_LIFETIME - o.age) < 3;
      if (expiring && Math.floor(G.time * 6) % 2 === 0) continue;
      const pulse = 1 + Math.sin(G.time * 5 + o.x) * .08;
      // 深色底盤 + 金色描邊：疊在單位上也看得清楚
      ctx.fillStyle = 'rgba(12, 18, 34, .6)';
      ctx.beginPath();
      ctx.arc(o.x, o.y, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 213, 94, .9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(o.x, o.y, 17 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 224, 138, .3)';
      ctx.beginPath();
      ctx.arc(o.x, o.y, 22 * pulse, 0, Math.PI * 2);
      ctx.fill();
      this.emoji('✨', o.x, o.y + 1, 24);
    }
  },

  /** 爆裂特效：擴散光環 + 放射短刺（取代 emoji 💥） */
  drawBursts() {
    const ctx = this.ctx;
    for (const b of G.bursts) {
      const t = b.age / 0.45;                 // 0 → 1
      const radius = b.r * (0.35 + 0.65 * t);
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 3 * (1 - t) + 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      // 六道放射短刺
      for (let i = 0; i < 6; i++) {
        const ang = i * Math.PI / 3 + t * 0.6;
        const r1 = radius * 0.75, r2 = radius * 1.15;
        ctx.beginPath();
        ctx.moveTo(b.x + Math.cos(ang) * r1, b.y + Math.sin(ang) * r1);
        ctx.lineTo(b.x + Math.cos(ang) * r2, b.y + Math.sin(ang) * r2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  },

  drawFloaters() {
    const ctx = this.ctx;
    ctx.font = 'bold 18px sans-serif';
    for (const f of G.floaters) {
      ctx.fillStyle = `rgba(255, 224, 138, ${1 - f.age})`;
      ctx.fillText(f.text, f.x, f.y);
    }
  },

  /** 開場準備 / 波間空檔的倒數提示 */
  drawCountdown() {
    if (G.phase !== 'playing') return;
    const cd = Waves.countdown();
    if (!cd) return;
    const ctx = this.ctx;
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = 'rgba(255, 224, 138, .9)';
    ctx.fillText(`${cd.text}  ${cd.secs} 秒`, CONFIG.CANVAS_W / 2, 14);
  },

  /** 暫停遮罩 */
  drawPaused() {
    if (!G.paused || G.phase !== 'playing') return;
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(8, 12, 24, .55)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
    ctx.font = 'bold 40px sans-serif';
    ctx.fillStyle = '#ffd97a';
    ctx.fillText('⏸ 已暫停', CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#cdd9f5';
    ctx.fillText('按右上角 ▶ 或 P 鍵繼續', CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2 + 36);
  },

  /* ---------- 主渲染 ---------- */

  render(hoverCell) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    this.drawGrid();
    this.drawHover(hoverCell);
    this.drawUnits();
    this.drawEnemies();
    this.drawProjectiles();
    this.drawBursts();
    this.drawOrbs();
    this.drawFloaters();
    this.drawCountdown();
    this.drawPaused();
  },
};
