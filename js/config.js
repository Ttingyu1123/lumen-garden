/* ============================================================
   config.js — 全部遊戲數值與資料表
   想調平衡（血量、成本、波次…）只需要改這一檔。
   ============================================================ */

const CONFIG = {
  // --- 格子與畫布 ---
  ROWS: 5,
  COLS: 9,
  CELL_W: 96,
  CELL_H: 96,
  GRID_X: 24,          // 格子區在 canvas 內的左上偏移
  GRID_Y: 24,

  // --- 資源（光能）---
  START_LUX: 150,      // 開局光能
  ORB_VALUE: 25,       // 每顆光珠的價值
  SKY_ORB_INTERVAL: 9, // 天上自動掉光珠的間隔（秒）
  ORB_FALL_SPEED: 55,  // 光珠下落速度 px/s
  ORB_LIFETIME: 12,    // 光珠落地後幾秒消失

  // --- 波次節奏 ---
  FIRST_WAVE_DELAY: 8, // 開場幾秒後第一波
  NEXT_WAVE_DELAY: 4,  // 清完一波後幾秒下一波
};

// canvas 尺寸由格子推導，index.html 的 canvas 由 main.js 設定
CONFIG.CANVAS_W = CONFIG.GRID_X * 2 + CONFIG.COLS * CONFIG.CELL_W; // 912
CONFIG.CANVAS_H = CONFIG.GRID_Y * 2 + CONFIG.ROWS * CONFIG.CELL_H; // 528

/* ------------------------------------------------------------
   防禦單位資料表（全部原創命名 + emoji placeholder）
   type 欄位決定行為：producer / shooter / wall
   ------------------------------------------------------------ */
const UNIT_TYPES = {
  bloom: {
    id: 'bloom',
    name: '聚光菇',
    emoji: '🍄',
    type: 'producer',
    cost: 50,
    cooldown: 7,          // 卡牌冷卻（秒）
    hp: 80,
    produceInterval: 8,   // 每 8 秒生產一顆光珠
  },
  thorn: {
    id: 'thorn',
    name: '棘刺射手',
    emoji: '🌵',
    type: 'shooter',
    cost: 100,
    cooldown: 7,
    hp: 120,
    fireInterval: 1.4,    // 射擊間隔（秒）
    damage: 20,           // 每發傷害
    projectileSpeed: 320, // 投射物速度 px/s
  },
  boulder: {
    id: 'boulder',
    name: '磐石守衛',
    emoji: '🪨',
    type: 'wall',
    cost: 50,
    cooldown: 15,
    hp: 500,              // 高血量，純擋路
  },
};

/* ------------------------------------------------------------
   敵人資料表（暗影族）
   ------------------------------------------------------------ */
const ENEMY_TYPES = {
  shambler: {
    id: 'shambler',
    name: '暗影慢行者',
    emoji: '🧟',
    hp: 200,
    speed: 13,            // 移動速度 px/s
    damage: 20,           // 每次攻擊傷害
    attackInterval: 1.0,  // 攻擊間隔（秒）
  },
  sprinter: {
    id: 'sprinter',
    name: '暗影疾走者',
    emoji: '👺',
    hp: 130,
    speed: 34,            // 快速型：血少跑快
    damage: 20,
    attackInterval: 1.0,
  },
};

/* ------------------------------------------------------------
   波次表：每波是一串 { type, delay }
   delay = 該波開始後第幾秒進場；row 於生成時隨機
   ------------------------------------------------------------ */
const WAVES = [
  { // 第 1 波：3 隻慢行者，熟悉節奏
    spawns: [
      { type: 'shambler', delay: 0 },
      { type: 'shambler', delay: 7 },
      { type: 'shambler', delay: 14 },
    ],
  },
  { // 第 2 波：5 隻
    spawns: [
      { type: 'shambler', delay: 0 },
      { type: 'shambler', delay: 4 },
      { type: 'shambler', delay: 8 },
      { type: 'shambler', delay: 12 },
      { type: 'shambler', delay: 16 },
    ],
  },
  { // 第 3 波：疾走者登場
    spawns: [
      { type: 'shambler', delay: 0 },
      { type: 'sprinter', delay: 3 },
      { type: 'shambler', delay: 6 },
      { type: 'shambler', delay: 10 },
      { type: 'sprinter', delay: 13 },
      { type: 'shambler', delay: 16 },
    ],
  },
  { // 第 4 波：混合加壓
    spawns: [
      { type: 'shambler', delay: 0 },
      { type: 'shambler', delay: 2 },
      { type: 'sprinter', delay: 5 },
      { type: 'shambler', delay: 8 },
      { type: 'sprinter', delay: 10 },
      { type: 'shambler', delay: 13 },
      { type: 'shambler', delay: 16 },
      { type: 'sprinter', delay: 18 },
    ],
  },
  { // 第 5 波：最終大浪
    spawns: [
      { type: 'shambler', delay: 0 },
      { type: 'shambler', delay: 1.5 },
      { type: 'sprinter', delay: 3 },
      { type: 'shambler', delay: 5 },
      { type: 'sprinter', delay: 6.5 },
      { type: 'shambler', delay: 8 },
      { type: 'shambler', delay: 9.5 },
      { type: 'sprinter', delay: 11 },
      { type: 'shambler', delay: 13 },
      { type: 'sprinter', delay: 14.5 },
      { type: 'shambler', delay: 16 },
      { type: 'sprinter', delay: 18 },
    ],
  },
];
