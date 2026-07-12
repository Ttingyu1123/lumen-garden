/* ============================================================
   state.js — 全域遊戲狀態
   G 是唯一的可變狀態容器，所有模組讀寫這裡。
   ============================================================ */

const G = {
  phase: 'start',   // 'start' | 'playing' | 'win' | 'lose'
  mode: 'campaign', // 'campaign'（10 波破關）| 'endless'（無盡）
  paused: false,    // 暫停中（僅 playing 階段有意義）
  time: 0,          // 遊戲內累計秒數（不用 Date.now，切頁暫停不會跳波）

  lux: 0,           // 目前光能

  grid: [],         // grid[row][col] = unit 或 null
  units: [],        // 所有場上防禦單位
  enemies: [],      // 所有場上敵人
  projectiles: [],  // 所有投射物
  orbs: [],         // 所有光珠
  floaters: [],     // 「+25」之類的漂浮字

  selectedType: null,   // 目前選中的卡牌 typeId；'shovel' = 鏟子模式
  cardReadyAt: {},      // typeId -> 遊戲時間幾秒後可再放置
  rowBombs: [],         // 每列一顆星光炸彈（最後防線），用掉變 false

  wave: {
    index: -1,          // 目前波次（0-based），-1 = 尚未開始
    pending: [],        // 本波的 { type, at } 清單（at = 絕對遊戲時間，進場後為 null）
    nextWaveAt: 0,      // 開場第一波的遊戲時間
    allSpawned: false,  // 本波是否已全部進場
    clearedAt: null,    // 本波清空的時間點（供波間倒數）
    finished: false,    // 全部波次是否結束
  },

  skyOrbTimer: 0,   // 天降光珠計時器
};

/** 重置為一場新遊戲（開始 / 再玩一次都走這裡） */
function resetGame(mode = 'campaign') {
  G.mode = mode;
  G.time = 0;
  G.lux = CONFIG.START_LUX;

  G.grid = [];
  for (let r = 0; r < CONFIG.ROWS; r++) {
    G.grid.push(new Array(CONFIG.COLS).fill(null));
  }

  G.units = [];
  G.enemies = [];
  G.projectiles = [];
  G.orbs = [];
  G.floaters = [];

  G.selectedType = null;
  G.cardReadyAt = {};
  G.rowBombs = new Array(CONFIG.ROWS).fill(true);

  G.wave = {
    index: -1,
    pending: [],
    nextWaveAt: CONFIG.FIRST_WAVE_DELAY,
    allSpawned: false,
    clearedAt: null,
    finished: false,
  };

  G.skyOrbTimer = 0;
  G.paused = false;
  G.phase = 'playing';
}
