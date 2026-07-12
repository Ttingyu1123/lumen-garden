/* ============================================================
   main.js — 遊戲迴圈、輸入、啟動
   （渲染已抽到 render.js，這裡只剩控制流）
   ============================================================ */

(function () {
  const canvas = document.getElementById('game');
  Renderer.init(canvas);

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

  // 觸控支援：把 touch 座標轉換為 canvas 座標並模擬 click
  canvas.addEventListener('touchmove', (evt) => {
    if (evt.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      const touch = evt.touches[0];
      hoverCell = Grid.cellAt(
        (touch.clientX - rect.left) * (canvas.width / rect.width),
        (touch.clientY - rect.top) * (canvas.height / rect.height)
      );
    }
  }, { passive: true });

  canvas.addEventListener('touchend', (evt) => { hoverCell = null; }, { passive: true });

  canvas.addEventListener('touchstart', (evt) => {
    if (G.phase !== 'playing' || G.paused) return;
    evt.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = evt.touches[0];
    const p = {
      x: (touch.clientX - rect.left) * (canvas.width / rect.width),
      y: (touch.clientY - rect.top) * (canvas.height / rect.height),
    };

    // 觸控邏輯同 click：先收集光珠 → 鏟子模式 → 放置單位
    if (Resources.tryCollect(p.x, p.y)) return;

    if (G.selectedType === 'shovel') {
      const cell = Grid.cellAt(p.x, p.y);
      if (!cell) return;
      const result = Units.remove(cell.row, cell.col);
      if (result.ok) {
        G.selectedType = null;
        UI.refreshCards();
      } else {
        UI.toast(result.reason);
      }
      return;
    }

    if (G.selectedType) {
      const cell = Grid.cellAt(p.x, p.y);
      if (!cell) return;
      const result = Units.tryPlace(G.selectedType, cell.row, cell.col);
      if (result.ok) {
        G.selectedType = null;
        UI.refreshCards();
      } else {
        UI.toast(result.reason);
      }
    }
  });

  canvas.addEventListener('click', (evt) => {
    if (G.phase !== 'playing' || G.paused) return;
    const p = canvasPos(evt);

    // 1) 優先收集光珠
    if (Resources.tryCollect(p.x, p.y)) return;

    // 2) 鏟子模式 → 移除單位並退回一半光能
    if (G.selectedType === 'shovel') {
      const cell = Grid.cellAt(p.x, p.y);
      if (!cell) return;
      const result = Units.remove(cell.row, cell.col);
      if (result.ok) {
        G.selectedType = null;
        UI.refreshCards();
      } else {
        UI.toast(result.reason);
      }
      return;
    }

    // 3) 有選卡牌 → 嘗試放置
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

  // P 鍵暫停 / 繼續
  document.addEventListener('keydown', (evt) => {
    if (evt.key === 'p' || evt.key === 'P') togglePause();
  });

  function togglePause() {
    if (G.phase !== 'playing') return;
    G.paused = !G.paused;
    UI.syncPauseButton();
  }

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

    // 勝負切畫面（update 只在 playing 時被呼叫，所以只會觸發一次）
    if (G.phase === 'win' || G.phase === 'lose') {
      Sfx.play(G.phase);
      if (G.phase === 'lose') UI.fillLoseStats();   // 撐到第幾波 + 無盡最高紀錄
      UI.showScreen(G.phase);
    }

    UI.updateHUD();
    UI.refreshCards();
  }

  /* ---------------- 主迴圈 ---------------- */

  function loop(ts) {
    const dt = Math.min((ts - lastTs) / 1000, 0.05);  // 切頁回來 dt 上限 50ms，避免跳幀穿模
    lastTs = ts;
    if (G.phase === 'playing' && !G.paused) update(dt);
    Renderer.render(hoverCell);
    requestAnimationFrame(loop);
  }

  /* ---------------- 啟動 ---------------- */

  function startGame(mode) {
    Sfx.init();                 // 需要使用者手勢後才能建 AudioContext
    resetGame(mode);
    UI.showScreen('playing');   // 隱藏所有 overlay
    UI.syncPauseButton();
    UI.updateHUD();
    UI.refreshCards();
  }

  UI.init({ onStart: startGame, onTogglePause: togglePause });
  UI.showScreen('start');
  requestAnimationFrame((ts) => { lastTs = ts; requestAnimationFrame(loop); });
})();
