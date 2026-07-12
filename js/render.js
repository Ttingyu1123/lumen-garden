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
    // 左側防線：星光炸彈還在的列亮 🌟（最後防線），用掉的列剩 🏡
    ctx.fillStyle = 'rgba(255, 217, 122, .12)';
    ctx.fillRect(0, CONFIG.GRID_Y, CONFIG.GRID_X, CONFIG.ROWS * CONFIG.CELL_H);
    ctx.font = '20px serif';
    for (let r = 0; r < CONFIG.ROWS; r++) {
      const armed = G.rowBombs[r];
      if (armed) {
        const pulse = 1 + Math.sin(G.time * 3 + r) * .15;
        ctx.save();
        ctx.globalAlpha = .8 + Math.sin(G.time * 3 + r) * .2;
        ctx.font = `${Math.round(20 * pulse)}px serif`;
        ctx.fillText('🌟', CONFIG.GRID_X / 2, Grid.rowCenterY(r));
        ctx.restore();
        ctx.font = '20px serif';
      } else {
        ctx.globalAlpha = .45;
        ctx.fillText('🏡', CONFIG.GRID_X / 2, Grid.rowCenterY(r));
        ctx.globalAlpha = 1;
      }
    }
  },

  drawHover(hoverCell) {
    if (!hoverCell || !G.selectedType || G.phase !== 'playing') return;
    const ctx = this.ctx;
    const o = Grid.cellOrigin(hoverCell.row, hoverCell.col);
    const occupied = Grid.isOccupied(hoverCell.row, hoverCell.col);

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
      ctx.font = '46px serif';
      const c = Grid.cellCenter(hoverCell.row, hoverCell.col);
      ctx.fillText(UNIT_TYPES[G.selectedType].emoji, c.x, c.y);
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
      ctx.font = `${size}px serif`;
      ctx.fillText(u.def.emoji, c.x, c.y + 2);
      this.drawHpBar(c.x, c.y - 38, 52, u.hp / u.maxHp);
    }
  },

  drawEnemies() {
    const ctx = this.ctx;
    for (const e of G.enemies) {
      const y = Grid.rowCenterY(e.row);
      // 攻擊中的敵人微微前傾抖動
      const shake = e.target ? Math.sin(G.time * 20) * 2 : 0;

      // 減速中：腳下結冰光圈
      if (e.slowT > 0) {
        ctx.fillStyle = 'rgba(120, 200, 255, .3)';
        ctx.beginPath();
        ctx.arc(e.x, y + 22, 22, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.font = '48px serif';
      ctx.fillText(e.def.emoji, e.x + shake, y + 2);

      // 護甲未破：右上角小盾牌
      if (e.armor > 0) {
        ctx.font = '18px serif';
        ctx.fillText('🛡️', e.x + 20, y - 22);
      }

      // 受傷閃白
      if (e.flashT > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${e.flashT / 0.15 * 0.65})`;
        ctx.beginPath();
        ctx.arc(e.x + shake, y, 26, 0, Math.PI * 2);
        ctx.fill();
      }

      // 護甲條（灰）疊在血條上方
      if (e.maxArmor > 0 && e.armor > 0) {
        ctx.fillStyle = 'rgba(0,0,0,.55)';
        ctx.fillRect(e.x - 26, y - 48, 52, 4);
        ctx.fillStyle = '#c0c8d8';
        ctx.fillRect(e.x - 26, y - 48, 52 * (e.armor / e.maxArmor), 4);
      }
      this.drawHpBar(e.x, y - 40, 52, e.hp / e.maxHp);
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
      ctx.fillStyle = 'rgba(255, 224, 138, .35)';
      ctx.beginPath();
      ctx.arc(o.x, o.y, 20 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '26px serif';
      ctx.fillText('✨', o.x, o.y + 1);
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
    this.drawOrbs();
    this.drawFloaters();
    this.drawCountdown();
    this.drawPaused();
  },
};
