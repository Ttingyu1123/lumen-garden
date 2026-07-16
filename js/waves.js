/* ============================================================
   waves.js — 波次系統
   戰役模式：10 手寫波 → 全清勝利。
   無盡模式：10 手寫波後改用公式生波，玩到失守為止。
   ============================================================ */

const Waves = {

  /**
   * 取得第 index 波：手寫表內直接回傳；
   * 超出（無盡模式）用公式生成 — 數量、重甲比例、進場密度隨波數成長，
   * 血量成長沿用 enemies.js 的 WAVE_HP_GROWTH（無上限）。
   */
  getWave(index) {
    if (index < WAVES.length) return this.applyLevelMods(WAVES[index], index);

    const E = CONFIG.ENDLESS;
    const over = index - WAVES.length + 1;   // 超出手寫表的第幾波（1-based）
    const count = Math.min(E.COUNT_BASE + over * E.COUNT_PER_WAVE, E.COUNT_MAX);
    const bruteP = Math.min(E.BRUTE_BASE + over * E.BRUTE_PER_WAVE, E.BRUTE_MAX);
    const gap = Math.max(E.GAP_BASE - over * E.GAP_DECAY, E.GAP_MIN);

    const spawns = [];
    const flyerP = over >= E.FLYER_FROM ? E.FLYER_P : 0;
    const splitP = over >= E.SPLIT_FROM ? E.SPLIT_P : 0;
    let t = 0;
    for (let i = 0; i < count; i++) {
      const r = Math.random();
      const type = r < bruteP ? 'brute'
        : r < bruteP + E.SPRINT_P ? 'sprinter'
        : r < bruteP + E.SPRINT_P + flyerP ? 'flyer'
        : r < bruteP + E.SPRINT_P + flyerP + splitP ? 'splitter'
        : 'shambler';
      spawns.push({ type, delay: t });
      t += gap;
    }
    // 每 BOSS_EVERY 波（第 15、20、25…）在波次中段加一隻暗影君王
    if ((index + 1) % E.BOSS_EVERY === 0) {
      spawns.push({ type: 'boss', delay: t * 0.5 });
    }
    return { spawns };
  },

  /**
   * 關卡規則套在手寫波次表上（不動原表）：
   * galeMix    → 每 3 隻慢行者換 1 疾走者、每 4 隻換 1 飛翼（確定性，無隨機）
   * doubleBoss → 最終波在原 Boss 後 3 秒追加第二隻
   */
  applyLevelMods(wave, index) {
    const mods = G.level ? G.level.mods : {};
    const isFinal = index === WAVES.length - 1;
    if (!mods.galeMix && !(mods.doubleBoss && isFinal)) return wave;

    let spawns = wave.spawns.map(s => ({ ...s }));
    if (mods.galeMix) {
      let n = 0;
      spawns = spawns.map(s => {
        if (s.type !== 'shambler') return s;
        n += 1;
        if (n % 3 === 0) return { ...s, type: 'sprinter' };
        if (n % 4 === 0) return { ...s, type: 'flyer' };
        return s;
      });
    }
    if (mods.doubleBoss && isFinal) {
      const boss = spawns.find(s => s.type === 'boss');
      spawns.push({ type: 'boss', delay: boss.delay + 3 });
    }
    return { spawns };
  },

  /** 開始第 index 波：把 spawns 換算成絕對遊戲時間排入 pending */
  startWave(index) {
    const w = G.wave;
    w.index = index;
    w.allSpawned = false;
    w.clearedAt = null;
    w.pending = this.getWave(index).spawns.map(s => ({
      type: s.type,
      at: G.time + s.delay,   // 絕對時間；進場後標記為 null
    }));
    const isFinal = G.mode === 'campaign' && index === WAVES.length - 1;
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

    // 本波全員進場且戰場清空 → 戰役最終波勝利，或倒數開下一波
    if (w.allSpawned && G.enemies.length === 0) {
      if (w.clearedAt === null) {
        w.clearedAt = G.time;   // 記錄清空瞬間
        if (G.mode === 'campaign' && w.index === WAVES.length - 1) {
          w.finished = true;
          G.phase = 'win';
          return;
        }
        // 無盡：每清完 PERKS.EVERY 波跳增益三選一（遊戲凍結至選完）
        if (G.mode === 'endless' && (w.index + 1) % CONFIG.PERKS.EVERY === 0) {
          G.perkChoice = Perks.roll(CONFIG.PERKS.CHOICES);
          UI.showPerkChoice(G.perkChoice);
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
    if (G.mode === 'endless') return `第 ${w.index + 1} 波 ∞`;
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
