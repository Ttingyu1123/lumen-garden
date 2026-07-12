/* ============================================================
   ui.js — DOM 介面
   卡牌列（選取 / 冷卻遮罩 / 買不起變灰）、HUD、toast、
   波次橫幅、暫停 / 音效 / 說明按鈕、畫面切換。
   ============================================================ */

const UI = {
  els: {},          // 快取的 DOM 節點
  toastTimer: null,

  /** 初始化：抓節點、生成卡牌列、綁按鈕 */
  init(handlers) {
    this.els = {
      luxCount: document.getElementById('lux-count'),
      waveLabel: document.getElementById('wave-label'),
      cardBar: document.getElementById('card-bar'),
      banner: document.getElementById('banner'),
      toast: document.getElementById('toast'),
      screenStart: document.getElementById('screen-start'),
      screenWin: document.getElementById('screen-win'),
      screenLose: document.getElementById('screen-lose'),
      screenHelp: document.getElementById('screen-help'),
      btnPause: document.getElementById('btn-pause'),
      btnSound: document.getElementById('btn-sound'),
    };

    this.buildCardBar();
    this.buildHelp();

    // 開始 / 重開按鈕 → 各自對應模式；敗北重開沿用本局模式
    document.getElementById('btn-start').addEventListener('click', () => handlers.onStart('campaign'));
    document.getElementById('btn-endless').addEventListener('click', () => handlers.onStart('endless'));
    document.getElementById('btn-restart-win').addEventListener('click', () => handlers.onStart('campaign'));
    document.getElementById('btn-win-endless').addEventListener('click', () => handlers.onStart('endless'));
    document.getElementById('btn-restart-lose').addEventListener('click', () => handlers.onStart(G.mode));

    // 暫停 / 繼續
    this.els.btnPause.addEventListener('click', handlers.onTogglePause);

    // 音效開關
    this.els.btnSound.addEventListener('click', () => {
      const on = Sfx.toggle();
      this.els.btnSound.textContent = on ? '🔊' : '🔇';
      this.toast(on ? '音效：開' : '音效：關');
    });

    // 遊戲說明：開啟時自動暫停，關閉時恢復原狀
    let wasPaused = false;
    const openHelp = () => {
      wasPaused = G.paused;
      if (G.phase === 'playing') { G.paused = true; this.syncPauseButton(); }
      this.els.screenHelp.classList.remove('hidden');
    };
    const closeHelp = () => {
      this.els.screenHelp.classList.add('hidden');
      if (G.phase === 'playing' && !wasPaused) { G.paused = false; this.syncPauseButton(); }
    };
    document.getElementById('btn-help').addEventListener('click', openHelp);
    document.getElementById('btn-help-start').addEventListener('click', openHelp);
    document.getElementById('btn-close-help').addEventListener('click', closeHelp);
  },

  /** 依 UNIT_TYPES 生成卡牌 */
  buildCardBar() {
    this.els.cardBar.innerHTML = '';
    this.cards = {};
    for (const def of Object.values(UNIT_TYPES)) {
      const card = document.createElement('div');
      card.className = 'card';
      card.dataset.type = def.id;
      card.innerHTML = `
        <img class="card-img" src="${Assets.dataUri(def.id)}" alt="${def.name}">
        <div class="card-name">${def.name}</div>
        <div class="card-cost">✨ ${def.cost}</div>
        <div class="card-cd" style="height:0"></div>
      `;
      card.title = `${def.desc || ''}（冷卻 ${def.cooldown} 秒）`;
      card.addEventListener('click', () => this.onCardClick(def.id));
      this.els.cardBar.appendChild(card);
      this.cards[def.id] = card;
    }

    // 鏟子：特殊卡，無成本無冷卻，點單位格移除並退 50% 光能
    const shovel = document.createElement('div');
    shovel.className = 'card card-shovel';
    shovel.innerHTML = `
      <img class="card-img" src="${Assets.dataUri('shovel')}" alt="鏟子">
      <div class="card-name">鏟子</div>
      <div class="card-cost">退 50%</div>
    `;
    shovel.title = '鏟除單位，退回一半光能';
    shovel.addEventListener('click', () => {
      if (G.phase !== 'playing' || G.paused) return;
      G.selectedType = G.selectedType === 'shovel' ? null : 'shovel';
      this.refreshCards();
    });
    this.els.cardBar.appendChild(shovel);
    this.shovelCard = shovel;
  },

  /** 說明 overlay 的單位 / 敵人表格由資料表生成，永不與 config 脫節 */
  buildHelp() {
    const icon = id => `<img class="help-img" src="${Assets.dataUri(id)}" alt="">`;
    const unitRows = Object.values(UNIT_TYPES).map(d =>
      `<tr><td>${icon(d.id)} ${d.name}</td><td>✨${d.cost}</td><td>${d.cooldown}s</td><td>${d.desc || ''}</td></tr>`
    ).join('');
    const enemyRows = Object.values(ENEMY_TYPES).map(d =>
      `<tr><td>${icon(d.id)} ${d.name}</td><td>${d.hp}${d.armor ? ` +甲${d.armor}` : ''}</td><td>${d.desc || ''}</td></tr>`
    ).join('');
    document.getElementById('help-units').innerHTML =
      `<tr><th>單位</th><th>成本</th><th>冷卻</th><th>功能</th></tr>${unitRows}`;
    document.getElementById('help-enemies').innerHTML =
      `<tr><th>敵人</th><th>血量</th><th>特性</th></tr>${enemyRows}`;
  },

  /** 點卡牌：檢查冷卻與資源，通過才選取（再點一次取消選取） */
  onCardClick(typeId) {
    if (G.phase !== 'playing' || G.paused) return;
    const def = UNIT_TYPES[typeId];

    if (G.selectedType === typeId) {   // 再點一次 = 取消
      G.selectedType = null;
      this.refreshCards();
      return;
    }
    const readyAt = G.cardReadyAt[typeId] || 0;
    if (G.time < readyAt) {
      this.toast(`${def.name} 冷卻中（${Math.ceil(readyAt - G.time)} 秒）`);
      return;
    }
    if (G.lux < def.cost) {
      this.toast(`光能不足（需要 ${def.cost}）`);
      return;
    }
    G.selectedType = typeId;
    this.refreshCards();
  },

  /** 每幀更新卡牌外觀：選取框、冷卻遮罩高度、買不起變灰 */
  refreshCards() {
    this.shovelCard.classList.toggle('selected', G.selectedType === 'shovel');
    for (const def of Object.values(UNIT_TYPES)) {
      const card = this.cards[def.id];
      card.classList.toggle('selected', G.selectedType === def.id);
      card.classList.toggle('unaffordable', G.lux < def.cost);

      const readyAt = G.cardReadyAt[def.id] || 0;
      const remain = Math.max(0, readyAt - G.time);
      const cdEl = card.querySelector('.card-cd');
      if (remain > 0) {
        const ratio = remain / def.cooldown;
        cdEl.style.height = `${Math.round(ratio * 100)}%`;
        cdEl.textContent = `${remain.toFixed(1)}s`;
      } else {
        cdEl.style.height = '0';
        cdEl.textContent = '';
      }
    }
  },

  /** 更新頂部 HUD */
  updateHUD() {
    this.els.luxCount.textContent = G.lux;
    this.els.waveLabel.textContent = Waves.label();
  },

  /** 暫停按鈕圖示與狀態同步 */
  syncPauseButton() {
    this.els.btnPause.textContent = G.paused ? '▶' : '⏸';
    this.els.btnPause.title = G.paused ? '繼續 (P)' : '暫停 (P)';
  },

  /** 波次橫幅（CSS animation 播完自動隱藏） */
  showBanner(text) {
    const b = this.els.banner;
    b.textContent = text;
    b.classList.remove('hidden');
    // 重新觸發 animation
    b.style.animation = 'none';
    void b.offsetWidth;
    b.style.animation = '';
  },

  /** 底部提示，2 秒後淡出 */
  toast(msg) {
    const t = this.els.toast;
    t.textContent = msg;
    t.classList.remove('hidden');
    t.style.opacity = '1';
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { t.style.opacity = '0'; }, 2000);
  },

  /**
   * 敗北統計：顯示本局撐到第幾波；無盡模式另讀寫 localStorage 最高紀錄。
   * 在切到失敗畫面前呼叫。
   */
  fillLoseStats() {
    const reached = Math.max(1, G.wave.index + 1);
    let html = `本局撐到 <b>第 ${reached} 波</b>`;
    if (G.mode === 'endless') {
      const KEY = 'lumenGarden.bestWave';
      const best = parseInt(localStorage.getItem(KEY) || '0', 10);
      if (reached > best) {
        localStorage.setItem(KEY, String(reached));
        html += `<br>🏅 新紀錄！（原紀錄第 ${best || '—'} 波）`;
      } else {
        html += `<br>歷史最佳：第 ${best} 波`;
      }
    }
    document.getElementById('lose-stats').innerHTML = html;
  },

  /** 依遊戲階段切換全螢幕畫面 */
  showScreen(phase) {
    this.els.screenStart.classList.toggle('hidden', phase !== 'start');
    this.els.screenWin.classList.toggle('hidden', phase !== 'win');
    this.els.screenLose.classList.toggle('hidden', phase !== 'lose');
  },
};
