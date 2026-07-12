/* ============================================================
   ui.js — DOM 介面
   卡牌列（選取 / 冷卻 / 買不起變灰）、HUD、toast、
   波次橫幅、開始 / 勝利 / 失敗畫面切換。
   ============================================================ */

const UI = {
  els: {},          // 快取的 DOM 節點
  toastTimer: null,

  /** 初始化：抓節點、生成卡牌列、綁按鈕 */
  init(onStart) {
    this.els = {
      luxCount: document.getElementById('lux-count'),
      waveLabel: document.getElementById('wave-label'),
      cardBar: document.getElementById('card-bar'),
      banner: document.getElementById('banner'),
      toast: document.getElementById('toast'),
      screenStart: document.getElementById('screen-start'),
      screenWin: document.getElementById('screen-win'),
      screenLose: document.getElementById('screen-lose'),
    };

    this.buildCardBar();

    document.getElementById('btn-start').addEventListener('click', onStart);
    document.getElementById('btn-restart-win').addEventListener('click', onStart);
    document.getElementById('btn-restart-lose').addEventListener('click', onStart);
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
        <div class="card-emoji">${def.emoji}</div>
        <div class="card-name">${def.name}</div>
        <div class="card-cost">✨ ${def.cost}</div>
        <div class="card-cd" style="height:0"></div>
      `;
      card.addEventListener('click', () => this.onCardClick(def.id));
      this.els.cardBar.appendChild(card);
      this.cards[def.id] = card;
    }
  },

  /** 點卡牌：檢查冷卻與資源，通過才選取（再點一次取消選取） */
  onCardClick(typeId) {
    if (G.phase !== 'playing') return;
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

  /** 依遊戲階段切換全螢幕畫面 */
  showScreen(phase) {
    this.els.screenStart.classList.toggle('hidden', phase !== 'start');
    this.els.screenWin.classList.toggle('hidden', phase !== 'win');
    this.els.screenLose.classList.toggle('hidden', phase !== 'lose');
  },
};
