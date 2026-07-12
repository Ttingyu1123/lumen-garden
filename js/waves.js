/* ============================================================
   waves.js — 波次系統
   流程：開場倒數 → 第 1 波 → 清空 → 短倒數 → 下一波 → …
   最後一波清空 → 勝利。
   ============================================================ */

const Waves = {

  /** 開始第 index 波：把 spawns 換算成絕對遊戲時間排入 pending */
  startWave(index) {
    const w = G.wave;
    w.index = index;
    w.allSpawned = false;
    w.clearedAt = null;
    w.pending = WAVES[index].spawns.map(s => ({
      type: s.type,
      at: G.time + s.delay,   // 絕對時間；進場後標記為 null
    }));
    const isFinal = index === WAVES.length - 1;
    UI.showBanner(isFinal ? '最終波來襲！！' : `第 ${index + 1} 波來襲！`);
    Sfx.play('wave');
    UI.updateHUD();
  },

  update(dt) {
    const w = G.wave;
    if (w.finished) return;

    // 開場：倒數到第一波
    if (w.index === -1) {
      if (G.time >= w.nextWaveAt) this.startWave(0);
      return;
    }

    // 把時間到的敵人放進場
    let spawnedAll = true;
    for (const s of w.pending) {
      if (s.at !== null && G.time >= s.at) {
        Enemies.spawn(s.type);
        s.at = null;
      }
      if (s.at !== null) spawnedAll = false;
    }
    w.allSpawned = spawnedAll;

    // 本波全員進場且戰場清空 → 勝利，或倒數開下一波
    if (w.allSpawned && G.enemies.length === 0) {
      if (w.clearedAt === null) {
        w.clearedAt = G.time;   // 記錄清空瞬間
        if (w.index === WAVES.length - 1) {
          w.finished = true;
          G.phase = 'win';
          return;
        }
      }
      if (G.time - w.clearedAt >= CONFIG.NEXT_WAVE_DELAY) {
        this.startWave(w.index + 1);
      }
    }
  },

  /** HUD 顯示用文字 */
  label() {
    const w = G.wave;
    if (w.index === -1) return '準備中…';
    return `第 ${w.index + 1} / ${WAVES.length} 波`;
  },

  /**
   * 倒數顯示：開場準備時間 / 波間空檔時回傳 { text, secs }，
   * 其他時候回傳 null。由渲染層畫在戰場上方。
   */
  countdown() {
    const w = G.wave;
    if (w.finished) return null;
    if (w.index === -1) {
      return { text: '⏳ 準備時間 — 首波來襲', secs: Math.max(0, Math.ceil(w.nextWaveAt - G.time)) };
    }
    if (w.allSpawned && G.enemies.length === 0 && w.clearedAt !== null) {
      return { text: '⏳ 下一波來襲', secs: Math.max(0, Math.ceil(w.clearedAt + CONFIG.NEXT_WAVE_DELAY - G.time)) };
    }
    return null;
  },
};
