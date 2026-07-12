/* ============================================================
   main.js — 遊戲迴圈、輸入、canvas 渲染、啟動
   ============================================================ */

(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  canvas.width = CONFIG.CANVAS_W;
  canvas.height = CONFIG.CANVAS_H;

  let hoverCell = null;   // 滑鼠所在格（放置預覽用）
  let lastTs = 0;

  /* ---------------- 輸入 ---------------- */

  function canvasPos(evt) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (evt.clientX - rect.left) * (canvas.width / rect.width),
      y: (evt.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  canvas.addEventListener('mousemove', (evt) => {
    const p = canvasPos(evt);
    hoverCell = Grid.cellAt(p.x, p.y);
  });

  canvas.addEventListener('mouseleave', () => { hoverCell = null; });

  canvas.addEventListener('click', (evt) => {
    if (G.phase !== 'playing') return;
    const p = canvasPos(evt);

    // 1) 優先收集光珠
    if (Resources.tryCollect(p.x, p.y)) return;

    // 2) 有選卡牌 → 嘗試放置
    if (G.selectedType) {
      const cell = Grid.cellAt(p.x, p.y);
      if (!cell) return;
      const result = Units.tryPlace(G.selectedType, cell.row, cell.col);
      if (result.ok) {
        G.selectedType = null;   // 放完取消選取（要連放就再點卡牌）
        UI.refreshCards();
      } else {
        UI.toast(result.reason);
      }
    }
  });

  /* ---------------- 更新 ---------------- */

  function update(dt) {
    G.time += dt;

    Resources.update(dt);
    Units.update(dt);
    Enemies.update(dt);
    Projectiles.update(dt);
    Waves.update(dt);

    // 漂浮字上飄 + 老化
    for (const f of G.floaters) { f.y -= 30 * dt; f.age += dt; }
    G.floaters = G.floaters.filter(f => f.age < 1);

    // 勝負切畫面
    if (G.phase === 'win' || G.phase === 'lose') {
      UI.showScreen(G.phase);
    }

    UI.updateHUD();
    UI.refreshCards();
  }

  /* ---------------- 渲染 ---------------- */

  function drawGrid() {
    for (let r = 0; r < CONFIG.ROWS; r++) {
      for (let c = 0; c < CONFIG.COLS; c++) {
        const o = Grid.cellOrigin(r, c);
        // 棋盤式雙色夜間草地
        ctx.fillStyle = (r + c) % 2 === 0 ? '#2c4a33' : '#26402c';
        ctx.fillRect(o.x, o.y, CONFIG.CELL_W, CONFIG.CELL_H);
      }
    }
    // 左側防線（家）
    ctx.fillStyle = 'rgba(255, 217, 122, .12)';
    ctx.fillRect(0, CONFIG.GRID_Y, CONFIG.GRID_X, CONFIG.ROWS * CONFIG.CELL_H);
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let r = 0; r < CONFIG.ROWS; r++) {
      ctx.fillText('🏡', CONFIG.GRID_X / 2, Grid.rowCenterY(r));
    }
  }

  function drawHover() {
    if (!hoverCell || !G.selectedType || G.phase !== 'playing') return;
    const o = Grid.cellOrigin(hoverCell.row, hoverCell.col);
    const occupied = Grid.isOccupied(hoverCell.row, hoverCell.col);
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
  }

  /** 通用血條：在 (x, y) 畫寬 w 的血條 */
  function drawHpBar(x, y, w, ratio) {
    if (ratio >= 1) return;                    // 滿血不畫，畫面乾淨
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(x - w / 2, y, w, 5);
    ctx.fillStyle = ratio > .5 ? '#7ee081' : ratio > .25 ? '#ffd97a' : '#ff7a7a';
    ctx.fillRect(x - w / 2, y, w * Math.max(0, ratio), 5);
  }

  function drawUnits() {
    ctx.font = '46px serif';
    for (const u of G.units) {
      const c = Grid.cellCenter(u.row, u.col);
      ctx.fillText(u.def.emoji, c.x, c.y + 2);
      drawHpBar(c.x, c.y - 38, 52, u.hp / u.maxHp);
    }
  }

  function drawEnemies() {
    for (const e of G.enemies) {
      const y = Grid.rowCenterY(e.row);
      // 攻擊中的敵人微微前傾抖動
      const shake = e.target ? Math.sin(G.time * 20) * 2 : 0;
      ctx.font = '48px serif';
      ctx.fillText(e.def.emoji, e.x + shake, y + 2);
      drawHpBar(e.x, y - 40, 52, e.hp / e.maxHp);
    }
  }

  function drawProjectiles() {
    for (const p of G.projectiles) {
      ctx.fillStyle = '#b6ff7a';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(182, 255, 122, .35)';
      ctx.beginPath();
      ctx.arc(p.x - 8, p.y, 4, 0, Math.PI * 2);   // 小尾焰
      ctx.fill();
    }
  }

  function drawOrbs() {
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
  }

  function drawFloaters() {
    ctx.font = 'bold 18px sans-serif';
    for (const f of G.floaters) {
      ctx.fillStyle = `rgba(255, 224, 138, ${1 - f.age})`;
      ctx.fillText(f.text, f.x, f.y);
    }
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    drawGrid();
    drawHover();
    drawUnits();
    drawEnemies();
    drawProjectiles();
    drawOrbs();
    drawFloaters();
  }

  /* ---------------- 主迴圈 ---------------- */

  function loop(ts) {
    const dt = Math.min((ts - lastTs) / 1000, 0.05);  // 切頁回來 dt 上限 50ms，避免跳幀穿模
    lastTs = ts;
    if (G.phase === 'playing') update(dt);
    render();
    requestAnimationFrame(loop);
  }

  /* ---------------- 啟動 ---------------- */

  function startGame() {
    resetGame();
    UI.showScreen('playing');   // 隱藏所有 overlay
    UI.updateHUD();
    UI.refreshCards();
  }

  UI.init(startGame);
  UI.showScreen('start');
  requestAnimationFrame((ts) => { lastTs = ts; requestAnimationFrame(loop); });
})();
