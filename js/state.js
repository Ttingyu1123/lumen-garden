/* ============================================================
   state.js — 全域遊戲狀態
   G 是唯一的可變狀態容器，所有模組讀寫這裡。
   ============================================================ */

const G = {
  phase: 'start',   // 'start' | 'playing' | 'win' | 'lose'
  mode: 'campaign', // 'campaign'（10 波破關）| 'endless'（無盡）
  level: null,      // 目前關卡定義（LEVELS 之一；無盡固定用 classic）
  blocked: [],      // blocked[row][col] = true 表示巨石格不能種植
  paused: false,    // 暫停中（僅 playing 階段有意義）
  time: 0,          // 遊戲內累計秒數（不用 Date.now，切頁暫停不會跳波）

  lux: 0,           // 目前光能

  grid: [],         // grid[row][col] = unit 或 null
  units: [],        // 所有場上防禦單位
  enemies: [],      // 所有場上敵人
  projectiles: [],  // 所有投射物
  orbs: [],         // 所有光珠
  floaters: [],     // 「+25」之類的漂浮字
  bursts: [],       // 爆裂特效 { x, y, r, color, age }

  selectedType: null,   // 目前選中的卡牌 typeId；'shovel' = 鏟子模式
  cardReadyAt: {},      // typeId -> 遊戲時間幾秒後可再放置
  rowBombs: [],         // 每列一顆星光炸彈（最後防線），用掉變 false

  perks: null,          // 無盡增益累計效果（resetGame 建立）
  perkChoice: null,     // 非 null = 三選一進行中，遊戲凍結

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

/** 重置為一場新遊戲（開始 / 再玩一次都走這裡）；levelId 只對戰役有意義 */
function resetGame(mode = 'campaign', levelId = 'classic') {
  G.mode = mode;
  G.level = (mode === 'campaign' && LEVELS.find(l => l.id === levelId)) || LEVELS[0];
  G.time = 0;
  G.lux = CONFIG.START_LUX;

  G.grid = [];
  G.blocked = [];
  for (let r = 0; r < CONFIG.ROWS; r++) {
    G.grid.push(new Array(CONFIG.COLS).fill(null));
    G.blocked.push(new Array(CONFIG.COLS).fill(false));
  }
  for (const [r, c] of G.level.mods.blockedCells || []) {
    G.blocked[r][c] = true;
  }

  G.units = [];
  G.enemies = [];
  G.projectiles = [];
  G.orbs = [];
  G.floaters = [];
  G.bursts = [];

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

  G.perks = {
    fireRateMult: 1,   // 射擊間隔倍率（<1 = 更快）
    damageMult: 1,     // 傷害倍率
    orbBonus: 0,       // 光珠加值
    cooldownMult: 1,   // 卡牌冷卻倍率
    unitHpMult: 1,     // 單位血量倍率
    slowBonus: 0,      // 減速延長秒數
    taken: [],         // 已取得的增益 id
  };
  G.perkChoice = null;

  G.skyOrbTimer = 0;
  G.paused = false;
  G.phase = 'playing';
}
