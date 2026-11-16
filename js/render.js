/* ============================================================
   render.js — canvas 渲染層
   只讀狀態、不改狀態。背景與環境光點在 scenery.js，
   角色圖在 sprites.js（缺圖自動退回 emoji）。
   動畫：待機呼吸、射擊後座、敵人走路搖擺與撲咬、輪廓閃白、
   結冰染色、投射物柔光、爆裂火花、大爆炸畫面震動。
   ============================================================ */

const Renderer = {
  ctx: null,

  FOOT: 36,        // 角色腳底相對列中心的 y 偏移（格高 96，腳踩在格子下緣上方 12px）
  UNIT_H: 78,      // 防禦單位顯示高度
  ENEMY_H: 1.45,   // 敵人顯示高度 = 碰撞尺寸 × 此倍率（顯示略大於碰撞框）
  SHAKE_MIN_R: 70, // 半徑達此值的爆裂（地雷、星光炸彈、Boss 死亡）才震動畫面

  init(canvas) {
    canvas.width = CONFIG.CANVAS_W;
    canvas.height = CONFIG.CANVAS_H;
    this.ctx = canvas.getContext('2d');
    Sprites.init();
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
   * 彩色字形會「乘上 fillStyle 的透明度」——若前面畫過半透明色塊，
   * 忘記重設就會整批 emoji 變透明。這裡固定先設不透明 fillStyle 再畫。
   */
  emoji(text, x, y, size) {
    const ctx = this.ctx;
    ctx.font = this.font(size);
    ctx.fillStyle = '#000';
    ctx.fillText(text, x, y);
  },

  /**
   * 畫角色的唯一入口：腳底中心對齊 (x, footY)，塞進邊長 box 的方框。
   * 有圖用圖，沒圖退回 emoji。
   * o: { rot, sx, sy, alpha, tint, tintAlpha }；tint = 疊一層同輪廓純色
   */
  sprite(key, emoji, x, footY, box, o = {}) {
    const ctx = this.ctx;
    const img = Sprites.get(key);
    ctx.save();
    ctx.translate(x, footY);
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(o.sx || 1, o.sy || 1);
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;

    if (img) {
      // 寬扁的圖（飛翼）允許比方框寬 30%，不然會被縮得太小
      const scale = Math.min(box / img.naturalHeight, box * 1.3 / img.naturalWidth);
      const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
      ctx.drawImage(img, -w / 2, -h, w, h);
      if (o.tint && o.tintAlpha > 0) {
        ctx.globalAlpha = (o.alpha === undefined ? 1 : o.alpha) * Math.min(1, o.tintAlpha);
        ctx.drawImage(Sprites.tinted(key, o.tint), -w / 2, -h, w, h);
      }
    } else {
      this.emoji(emoji, 0, -box * 0.5, Math.round(box * 0.62));
      if (o.tint && o.tintAlpha > 0) {
        ctx.fillStyle = o.tint;
        ctx.globalAlpha = Math.min(1, o.tintAlpha) * 0.6;
        ctx.beginPath();
        ctx.arc(0, -box * 0.5, box * 0.36, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  },

  /** 腳下橢圓影子：讓角色踩在地上而不是浮在格子上 */
  shadow(x, y, rx, alpha) {
    const ctx = this.ctx;
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, Math.max(3, rx * 0.26), 0, 0, Math.PI * 2);
    ctx.fill();
  },

  /** 帶深色描邊的文字（疊在任何底色上都讀得到） */
  label(text, x, y, font, color) {
    const ctx = this.ctx;
    ctx.font = font;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(8, 12, 24, .8)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  },

  /* ---------- 各層 ---------- */

  drawField() {
    const ctx = this.ctx;
    ctx.drawImage(Scenery.background(), 0, 0);

    // 巨石格（關卡障礙）
    for (let r = 0; r < CONFIG.ROWS; r++) {
      for (let c = 0; c < CONFIG.COLS; c++) {
        if (!(G.blocked[r] && G.blocked[r][c])) continue;
        const o = Grid.cellOrigin(r, c);
        const cx = o.x + CONFIG.CELL_W / 2, footY = o.y + CONFIG.CELL_H / 2 + this.FOOT;
        ctx.fillStyle = 'rgba(10, 14, 24, .35)';
        ctx.fillRect(o.x, o.y, CONFIG.CELL_W, CONFIG.CELL_H);
        this.shadow(cx, footY - 2, 36, 0.4);
        this.sprite('rock', '⛰️', cx, footY, 74);
      }
    }

    // 左側防線：星光炸彈還在的列亮星燈（最後防線），用掉的列剩暗掉的小屋
    for (let r = 0; r < CONFIG.ROWS; r++) {
      const y = Grid.rowCenterY(r), x = CONFIG.GRID_X / 2 + 2;
      if (G.rowBombs[r]) {
        const wave = Math.sin(G.time * 3 + r);
        Scenery.drawGlow(ctx, '#ffd97a', x, y, 46 + wave * 6, 0.55 + wave * 0.15);
        this.sprite('star', '🌟', x, y + 13, 26 * (1 + wave * 0.08));
      } else {
        this.sprite('house', '🏡', x, y + 12, 24, { alpha: 0.5 });
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
      this.label(
        cost === null ? 'Lv MAX' : `⬆ 升級 ✨${cost}`,
        o.x + CONFIG.CELL_W / 2, o.y + 12, 'bold 14px sans-serif', '#ffd97a'
      );
      return;
    }

    // 鏟子模式：有單位的格亮橘（可鏟），空格微亮
    if (G.selectedType === 'shovel') {
      ctx.fillStyle = occupied ? 'rgba(255, 160, 80, .38)' : 'rgba(255, 255, 255, .08)';
      ctx.fillRect(o.x, o.y, CONFIG.CELL_W, CONFIG.CELL_H);
      return;
    }

    const blocked = G.blocked[hoverCell.row][hoverCell.col];
    ctx.fillStyle = occupied || blocked ? 'rgba(255, 80, 80, .3)' : 'rgba(255, 255, 255, .18)';
    ctx.fillRect(o.x, o.y, CONFIG.CELL_W, CONFIG.CELL_H);
    if (!occupied && !blocked) {
      const c = Grid.cellCenter(hoverCell.row, hoverCell.col);
      const def = UNIT_TYPES[G.selectedType];
      this.sprite(`unit-${def.id}`, def.emoji, c.x, c.y + this.FOOT, this.UNIT_H, { alpha: 0.55 });
    }
  },

  /** 通用血條：在 (x, y) 畫寬 w 的血條 */
  drawHpBar(x, y, w, ratio) {
    if (ratio >= 1) return;                    // 滿血不畫，畫面乾淨
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 7);
    ctx.fillStyle = ratio > .5 ? '#7ee081' : ratio > .25 ? '#ffd97a' : '#ff7a7a';
    ctx.fillRect(x - w / 2, y, w * Math.max(0, ratio), 5);
  },

  drawUnits() {
    const ctx = this.ctx;
    for (const u of G.units) {
      const c = Grid.cellCenter(u.row, u.col);
      const footY = c.y + this.FOOT;
      const key = `unit-${u.def.id}`;
      const barY = c.y - 46;

      // 地雷：佈署中半透明縮小，警戒後脈動發光
      if (u.def.type === 'mine') {
        const armed = u.timer >= u.def.mine.armTime;
        const pulse = armed ? 1 + Math.sin(G.time * 6) * 0.08 : 0.8;
        this.shadow(c.x, footY - 2, 22, 0.3);
        if (armed) Scenery.drawGlow(ctx, '#ffb35a', c.x, footY - 26, 70, 0.3 + Math.sin(G.time * 6) * 0.15);
        this.sprite(key, u.def.emoji, c.x, footY, 54 * pulse, { alpha: armed ? 1 : 0.55 });
        this.drawHpBar(c.x, barY + 20, 52, u.hp / u.maxHp);
        continue;
      }

      // 放置彈出：0.25 秒內從 55% 長到 100%
      const pop = Math.min(1, u.age / 0.25);
      // 待機呼吸：每個單位相位錯開，才不會整排同步起伏
      const breathe = 1 + Math.sin(G.time * 2.2 + u.row * 1.3 + u.col * 0.7) * 0.03;
      // 射擊後座：開火瞬間往後縮並壓扁，0.2 秒內彈回
      const sinceShot = G.time - (u.shotAt === undefined ? -9 : u.shotAt);
      const kick = sinceShot >= 0 && sinceShot < 0.2 ? 1 - sinceShot / 0.2 : 0;

      this.shadow(c.x, footY - 2, 28, 0.34);

      // 聚光菇：越接近產出光珠越亮
      if (u.def.type === 'producer') {
        const ready = Math.min(1, u.timer / Units.produceInterval(u));
        Scenery.drawGlow(ctx, '#ffe08a', c.x, c.y, 110, 0.12 + ready * 0.38);
      }

      this.sprite(key, u.def.emoji, c.x - kick * 5, footY, this.UNIT_H * (0.55 + 0.45 * pop), {
        sx: 1 + kick * 0.08,
        sy: breathe * (1 - kick * 0.07),
      });

      // 等級星星：Lv2 一顆、Lv3 兩顆（放左下角，不擋血條）
      for (let i = 0; i < u.level - 1; i++) {
        this.emoji('⭐', c.x - 34 + i * 15, c.y + 36, 13);
      }
      this.drawHpBar(c.x, barY, 52, u.hp / u.maxHp);
    }
  },

  drawEnemies() {
    const ctx = this.ctx;
    // 由上列畫到下列：下面那列的角色蓋在上面那列前面
    const ordered = [...G.enemies].sort((a, b) => a.row - b.row);
    for (const e of ordered) {
      const rowY = Grid.rowCenterY(e.row);
      const s = e.def.size;
      const half = s / 2;
      const box = s * this.ENEMY_H;
      const groundY = rowY + this.FOOT;
      const flying = !!e.def.flying;
      const walking = !e.target;
      const key = `enemy-${e.typeId}`;

      // 走路：左右搖擺 + 小跳步，步頻跟移動速度走；減速時步伐也變慢
      const pace = (4 + e.def.speed * 0.18) * (e.slowT > 0 ? CONFIG.SLOW_FACTOR : 1);
      const phase = G.time * pace + e.x * 0.05;
      const rot = walking && !flying ? Math.sin(phase) * 0.07 : 0;
      const hop = walking && !flying ? -Math.abs(Math.sin(phase)) * 2.5 : 0;
      // 攻擊：配合攻擊計時往前撲一下
      const lunge = e.target
        ? -Math.sin(Math.min(1, e.attackTimer / e.def.attackInterval) * Math.PI) * 6 : 0;
      // 飛行：離地浮動 + 拍翅（縱向伸縮）
      const lift = flying ? -22 + Math.sin(G.time * 4 + e.x * 0.05) * 4 : 0;
      const flap = flying ? 1 + Math.sin(G.time * 11 + e.x * 0.1) * 0.07 : 1;
      const footY = groundY + lift + hop;

      this.shadow(e.x, groundY - 2, half * (flying ? 0.6 : 0.85), flying ? 0.22 : 0.36);
      // 暗影族共通的腳下紫光：一眼分得出敵我
      Scenery.drawGlow(ctx, '#8a5cff', e.x, groundY - 6, s * 1.9, 0.22);

      // 減速中：腳下結冰光圈
      if (e.slowT > 0) {
        ctx.fillStyle = 'rgba(140, 215, 255, .38)';
        ctx.beginPath();
        ctx.ellipse(e.x, groundY - 2, half * 1.05, half * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 受傷閃白優先於結冰染藍
      const flash = e.flashT > 0 ? e.flashT / 0.15 : 0;
      this.sprite(key, e.def.emoji, e.x + lunge, footY, box, {
        rot,
        sy: flap,
        tint: flash > 0 ? '#ffffff' : (e.slowT > 0 ? '#7fd0ff' : null),
        tintAlpha: flash > 0 ? flash * 0.85 : 0.35,
      });

      const top = footY - box;

      // 護甲未破：右上角小盾牌
      if (e.armor > 0) {
        this.emoji('🛡️', e.x + half * 0.9, Math.max(12, top + 14), 18);
      }

      // 護甲條（灰）疊在血條上方；Boss 在最上列時夾在畫面內
      const barW = s;
      const barY = Math.max(10, top - 6);
      if (e.maxArmor > 0 && e.armor > 0) {
        ctx.fillStyle = 'rgba(0,0,0,.6)';
        ctx.fillRect(e.x - barW / 2 - 1, barY - 8, barW + 2, 6);
        ctx.fillStyle = '#c0c8d8';
        ctx.fillRect(e.x - barW / 2, barY - 7, barW * (e.armor / e.maxArmor), 4);
      }
      this.drawHpBar(e.x, barY, barW, e.hp / e.maxHp);
    }
  },

  drawProjectiles() {
    const ctx = this.ctx;
    for (const p of G.projectiles) {
      // 微幅上下飄，讓飛行有生命感
      const y = p.y + Math.sin(p.age * 25) * 2;

      // 貫穿彈：竹槍長條 + 槍尖柔光
      if (p.pierce) {
        Scenery.drawGlow(ctx, p.color, p.x + 4, y, 34, 0.55);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 16, y - 2.5, 26, 5);
        ctx.globalAlpha = .35;
        ctx.fillRect(p.x - 32, y - 1.5, 14, 3);
        ctx.globalAlpha = 1;
        continue;
      }

      Scenery.drawGlow(ctx, p.color, p.x, y, 38, 0.75);
      // 三節尾焰
      ctx.fillStyle = p.color;
      for (let i = 1; i <= 3; i++) {
        ctx.globalAlpha = 0.5 - i * 0.13;
        ctx.beginPath();
        ctx.arc(p.x - i * 8, y, 5.5 - i * 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(p.x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      // 亮芯
      ctx.fillStyle = 'rgba(255, 255, 255, .8)';
      ctx.beginPath();
      ctx.arc(p.x + 1, y - 1, 2.6, 0, Math.PI * 2);
      ctx.fill();
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
      Scenery.drawGlow(ctx, '#ffd97a', o.x, o.y, 64 * pulse, 0.6);
      ctx.strokeStyle = 'rgba(255, 213, 94, .9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(o.x, o.y, 17 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      this.emoji('✨', o.x, o.y + 1, 24);
    }
  },

  /** 爆裂特效：中心閃光 + 擴散光環 + 放射短刺 + 飛散火花 */
  drawBursts() {
    const ctx = this.ctx;
    for (const b of G.bursts) {
      const t = b.age / 0.45;                 // 0 → 1
      const ease = 1 - (1 - t) * (1 - t);     // 先快後慢
      const radius = b.r * (0.35 + 0.65 * ease);

      Scenery.drawGlow(ctx, b.color, b.x, b.y, b.r * 2.6, (1 - t) * 0.7);

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
      // 飛散火花：角度由爆點座標決定，同一顆爆裂每幀方向一致
      ctx.fillStyle = b.color;
      const sparks = b.r >= this.SHAKE_MIN_R ? 12 : 7;
      for (let i = 0; i < sparks; i++) {
        const ang = i * (Math.PI * 2 / sparks) + b.x * 0.37;
        const dist = b.r * (0.4 + 0.9 * ease) * (0.75 + (i % 3) * 0.2);
        ctx.beginPath();
        ctx.arc(
          b.x + Math.cos(ang) * dist,
          b.y + Math.sin(ang) * dist + t * t * 14,   // 末段微微下墜
          (1 - t) * 3.2 + 0.4, 0, Math.PI * 2
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  },

  drawFloaters() {
    const ctx = this.ctx;
    for (const f of G.floaters) {
      ctx.globalAlpha = Math.max(0, 1 - f.age);
      this.label(f.text, f.x, f.y, 'bold 18px sans-serif', '#ffe08a');
    }
    ctx.globalAlpha = 1;
  },

  /** 開場準備 / 波間空檔的倒數提示 */
  drawCountdown() {
    if (G.phase !== 'playing') return;
    const cd = Waves.countdown();
    if (!cd) return;
    this.label(`${cd.text}  ${cd.secs} 秒`, CONFIG.CANVAS_W / 2, 14, 'bold 22px sans-serif', '#ffe08a');
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

  /** 大爆炸的畫面震動幅度（px）：取場上最強的一顆，隨爆裂老化衰減 */
  shakeAmount() {
    let amp = 0;
    for (const b of G.bursts) {
      if (b.r < this.SHAKE_MIN_R) continue;
      amp = Math.max(amp, (1 - b.age / 0.45) * Math.min(1, b.r / 85) * 7);
    }
    return amp;
  },

  /* ---------- 主渲染 ---------- */

  render(hoverCell) {
    const ctx = this.ctx;
    const now = performance.now() / 1000;
    ctx.clearRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 世界層（會跟著震動）
    const amp = G.paused ? 0 : this.shakeAmount();
    ctx.save();
    if (amp > 0) ctx.translate(Math.sin(now * 90) * amp, Math.cos(now * 73) * amp);
    this.drawField();
    this.drawHover(hoverCell);
    this.drawUnits();
    this.drawEnemies();
    this.drawProjectiles();
    this.drawBursts();
    this.drawOrbs();
    Scenery.drawAmbient(ctx, now);
    ctx.restore();

    // 介面層（不震動）
    this.drawFloaters();
    this.drawCountdown();
    this.drawPaused();
  },
};
