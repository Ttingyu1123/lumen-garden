/* ============================================================
   progress.js — 關卡星級與成就（localStorage 持久化）
   星級規則：通關 1★；剩餘炸彈 ≥3 顆 2★；5 顆全保留 3★。
   成就解鎖走 Progress.unlock()，重複解鎖靜默略過。
   ============================================================ */

const ACHIEVEMENTS = [
  { id: 'first_win',  emoji: '🏆', name: '首勝',       desc: '首次通關任一戰役關卡' },
  { id: 'perfect',    emoji: '🌟', name: '完美防線',   desc: '通關且 5 顆星光炸彈全數保留' },
  { id: 'all_levels', emoji: '🗺️', name: '庭園守護者', desc: '通關全部 5 個戰役關卡' },
  { id: 'max_unit',   emoji: '⭐', name: '究極培育',   desc: '將任一單位升到 Lv3' },
  { id: 'mine_boss',  emoji: '💥', name: '地雷戰術',   desc: '用星火地雷擊殺暗影君王' },
  { id: 'tycoon',     emoji: '💰', name: '光能大亨',   desc: '同時持有 500 光能' },
  { id: 'endless_15', emoji: '🌊', name: '無盡行者',   desc: '無盡模式撐到第 15 波' },
  { id: 'endless_25', emoji: '🌀', name: '無盡傳說',   desc: '無盡模式撐到第 25 波' },
];

const Progress = {
  KEY_LEVELS: 'lumenGarden.levels',
  KEY_ACH: 'lumenGarden.achievements',
  _levels: null,   // { levelId: stars }
  _ach: null,      // { achId: true }

  /** 讀取快取（localStorage 損壞時歸零但不覆寫，下次寫入才修復） */
  _load(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '{}') || {};
    } catch (e) {
      return {};
    }
  },

  init() {
    this._levels = this._load(this.KEY_LEVELS);
    this._ach = this._load(this.KEY_ACH);
  },

  getStars(levelId) {
    return this._levels[levelId] || 0;
  },

  /** 記錄星級（只升不降）；回傳是否為新高 */
  setStars(levelId, stars) {
    if (stars <= this.getStars(levelId)) return false;
    this._levels[levelId] = stars;
    localStorage.setItem(this.KEY_LEVELS, JSON.stringify(this._levels));
    return true;
  },

  isUnlocked(id) {
    return !!this._ach[id];
  },

  /** 解鎖成就：新解鎖跳 toast，已解鎖靜默 */
  unlock(id) {
    if (this._ach[id]) return;
    const def = ACHIEVEMENTS.find(a => a.id === id);
    if (!def) return;
    this._ach[id] = true;
    localStorage.setItem(this.KEY_ACH, JSON.stringify(this._ach));
    UI.toast(`🏆 成就解鎖：${def.emoji} ${def.name}`);
    Sfx.play('collect');
  },

  /** 勝利結算：算星級、記錄、觸發相關成就。回傳本局星數。 */
  recordWin() {
    const bombs = G.rowBombs.filter(Boolean).length;
    const stars = bombs === CONFIG.ROWS ? 3 : bombs >= 3 ? 2 : 1;
    this.setStars(G.level.id, stars);
    this.unlock('first_win');
    if (bombs === CONFIG.ROWS) this.unlock('perfect');
    if (LEVELS.every(l => this.getStars(l.id) >= 1)) this.unlock('all_levels');
    return stars;
  },

  /** 敗北結算（無盡里程碑成就） */
  recordLose(reachedWave) {
    if (G.mode !== 'endless') return;
    if (reachedWave >= 15) this.unlock('endless_15');
    if (reachedWave >= 25) this.unlock('endless_25');
  },
};
