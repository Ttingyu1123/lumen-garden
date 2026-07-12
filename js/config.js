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

  // --- 波次節奏與難度曲線 ---
  FIRST_WAVE_DELAY: 15,  // 開場準備時間（秒），畫面會顯示倒數
  NEXT_WAVE_DELAY: 5,    // 清完一波後幾秒下一波
  WAVE_HP_GROWTH: 0.06,  // 每波敵人血量成長率：第 N 波 = 基礎 ×(1 + N×0.06)

  // --- 狀態效果 ---
  SLOW_FACTOR: 0.5,      // 減速時的移動速度倍率

  // --- 鏟子 ---
  SHOVEL_REFUND: 0.5,    // 鏟除單位退回成本比例

  // --- 無盡模式：第 11 波起用公式生波 ---
  ENDLESS: {
    COUNT_BASE: 10,      // 第 11 波的敵人數
    COUNT_PER_WAVE: 2,   // 之後每波 +2 隻
    COUNT_MAX: 30,       // 單波數量上限
    BRUTE_BASE: 0.15,    // 重甲兵占比起點
    BRUTE_PER_WAVE: 0.03,
    BRUTE_MAX: 0.4,
    SPRINT_P: 0.3,       // 疾走者固定占比
    GAP_BASE: 2.2,       // 進場間隔（秒），逐波縮短
    GAP_DECAY: 0.1,
    GAP_MIN: 0.8,
    BOSS_EVERY: 5,       // 無盡模式每 N 波出一隻暗影君王
  },
};

// canvas 尺寸由格子推導，index.html 的 canvas 由 main.js 設定
CONFIG.CANVAS_W = CONFIG.GRID_X * 2 + CONFIG.COLS * CONFIG.CELL_W; // 912
CONFIG.CANVAS_H = CONFIG.GRID_Y * 2 + CONFIG.ROWS * CONFIG.CELL_H; // 528

/* ------------------------------------------------------------
   防禦單位資料表（全部原創命名；美術為 assets.js 的同名 SVG）
   type 欄位決定行為：producer / shooter / wall
   shooter 的投射物規格集中在 projectile 欄位
   ------------------------------------------------------------ */
const UNIT_TYPES = {
  bloom: {
    id: 'bloom',
    name: '聚光菇',
    type: 'producer',
    cost: 50,
    cooldown: 7,          // 卡牌冷卻（秒）
    hp: 80,
    produceInterval: 8,   // 每 8 秒生產一顆光珠
    desc: '每 8 秒生產一顆光珠（+25 光能）',
  },
  thorn: {
    id: 'thorn',
    name: '棘刺射手',
    type: 'shooter',
    cost: 100,
    cooldown: 7,
    hp: 120,
    fireInterval: 1.4,    // 射擊間隔（秒）
    projectile: { damage: 20, speed: 320, color: '#b6ff7a' },
    sfx: 'shoot',
    desc: '朝同列敵人發射棘刺（20 傷害）',
  },
  frost: {
    id: 'frost',
    name: '寒霜蓮',
    type: 'shooter',
    cost: 75,
    cooldown: 9,
    hp: 100,
    fireInterval: 2.0,
    // slow: 命中後敵人減速（秒）
    projectile: { damage: 10, speed: 300, slow: 3, color: '#9adcff' },
    sfx: 'frost',
    desc: '霜彈傷害低，但使敵人減速 50%（3 秒）',
  },
  blaze: {
    id: 'blaze',
    name: '爆炎花',
    type: 'shooter',
    cost: 150,
    cooldown: 10,
    hp: 100,
    fireInterval: 2.2,
    // splash: 命中點半徑內的同列其他敵人也吃 splashDamage
    projectile: { damage: 26, speed: 280, splash: 70, splashDamage: 13, color: '#ff9a5a' },
    sfx: 'shoot',
    desc: '火彈爆裂，濺射同列附近敵人 — 剋制無盡後期的密集大軍',
  },
  boulder: {
    id: 'boulder',
    name: '磐石守衛',
    type: 'wall',
    cost: 50,
    cooldown: 15,
    hp: 500,              // 高血量，純擋路
    desc: '500 血肉盾，站著就是貢獻',
  },
};

/* ------------------------------------------------------------
   敵人資料表（暗影族）
   armor：護甲值，先吸收傷害，打完才扣血
   ------------------------------------------------------------ */
const ENEMY_TYPES = {
  shambler: {
    id: 'shambler',
    name: '暗影慢行者',
    hp: 200,
    armor: 0,
    speed: 13,            // 移動速度 px/s
    damage: 20,           // 每次攻擊傷害
    attackInterval: 1.0,  // 攻擊間隔（秒）
    size: 52,             // 身體尺寸 px（碰撞半寬 = size/2）
    desc: '慢速主力，遇單位停下啃咬',
  },
  sprinter: {
    id: 'sprinter',
    name: '暗影疾走者',
    hp: 130,
    armor: 0,
    speed: 34,            // 快速型：血少跑快
    damage: 20,
    attackInterval: 1.0,
    size: 52,
    desc: '快速型，血少跑快 — 用寒霜蓮剋制',
  },
  brute: {
    id: 'brute',
    name: '暗影重甲兵',
    hp: 180,
    armor: 150,           // 護甲先扛 150 傷害
    speed: 11,
    damage: 25,
    attackInterval: 1.0,
    size: 52,
    desc: '披甲重裝，護甲打破前不掉血',
  },
  boss: {
    id: 'boss',
    name: '暗影君王',
    hp: 1800,
    armor: 400,
    speed: 8,             // 巨體緩行
    damage: 60,           // 一口咬掉大半單位
    attackInterval: 1.2,
    size: 88,             // 巨型：碰撞與繪製都更大
    desc: 'Boss：戰役最終波與無盡每 5 波現身，集全列火力速殺',
  },
};

/* ------------------------------------------------------------
   波次表：共 10 波
   spawnList 把 [進場秒數, 敵種] 壓成 { type, delay }
   後期靠三件事加壓：數量、重甲比例、WAVE_HP_GROWTH 血量成長
   ------------------------------------------------------------ */
function spawnList(pairs) {
  return pairs.map(([delay, type]) => ({ type, delay }));
}

const WAVES = [
  { // 第 1 波：3 隻慢行者，熟悉節奏
    spawns: spawnList([[0, 'shambler'], [7, 'shambler'], [14, 'shambler']]),
  },
  { // 第 2 波：5 隻
    spawns: spawnList([
      [0, 'shambler'], [4, 'shambler'], [8, 'shambler'],
      [12, 'shambler'], [16, 'shambler'],
    ]),
  },
  { // 第 3 波：疾走者登場
    spawns: spawnList([
      [0, 'shambler'], [3, 'sprinter'], [6, 'shambler'],
      [10, 'shambler'], [13, 'sprinter'], [16, 'shambler'],
    ]),
  },
  { // 第 4 波：混合加壓
    spawns: spawnList([
      [0, 'shambler'], [2, 'shambler'], [5, 'sprinter'], [8, 'shambler'],
      [10, 'sprinter'], [13, 'shambler'], [15, 'shambler'], [18, 'sprinter'],
    ]),
  },
  { // 第 5 波：重甲兵登場
    spawns: spawnList([
      [0, 'brute'], [2, 'shambler'], [5, 'shambler'], [8, 'sprinter'],
      [11, 'shambler'], [14, 'sprinter'], [17, 'shambler'],
    ]),
  },
  { // 第 6 波
    spawns: spawnList([
      [0, 'shambler'], [2, 'brute'], [4, 'shambler'], [6, 'sprinter'],
      [9, 'shambler'], [11, 'brute'], [13, 'sprinter'], [15, 'shambler'],
      [17, 'sprinter'], [19, 'shambler'],
    ]),
  },
  { // 第 7 波
    spawns: spawnList([
      [0, 'brute'], [2, 'shambler'], [4, 'shambler'], [6, 'sprinter'],
      [8, 'shambler'], [10, 'brute'], [12, 'sprinter'], [14, 'shambler'],
      [16, 'shambler'], [18, 'sprinter'], [20, 'shambler'],
    ]),
  },
  { // 第 8 波
    spawns: spawnList([
      [0, 'shambler'], [1.5, 'brute'], [3, 'shambler'], [5, 'sprinter'],
      [6.5, 'shambler'], [8, 'brute'], [10, 'sprinter'], [12, 'shambler'],
      [13.5, 'brute'], [15, 'sprinter'], [17, 'shambler'], [19, 'shambler'],
      [20, 'sprinter'],
    ]),
  },
  { // 第 9 波
    spawns: spawnList([
      [0, 'brute'], [1.5, 'shambler'], [3, 'sprinter'], [4.5, 'shambler'],
      [6, 'brute'], [7.5, 'sprinter'], [9, 'shambler'], [10.5, 'shambler'],
      [12, 'brute'], [13.5, 'sprinter'], [15, 'shambler'], [16.5, 'brute'],
      [18, 'sprinter'], [19.5, 'shambler'], [21, 'shambler'],
    ]),
  },
  { // 第 10 波：最終大浪 + 暗影君王壓軸
    spawns: spawnList([
      [0, 'brute'], [1, 'shambler'], [2, 'sprinter'], [3.5, 'shambler'],
      [5, 'brute'], [6, 'sprinter'], [7.5, 'shambler'], [9, 'brute'],
      [10, 'shambler'], [11, 'sprinter'], [12, 'boss'], [12.5, 'shambler'],
      [14, 'brute'], [15, 'sprinter'], [16.5, 'shambler'], [18, 'brute'],
      [19, 'sprinter'], [20.5, 'shambler'], [22, 'shambler'],
    ]),
  },
];
