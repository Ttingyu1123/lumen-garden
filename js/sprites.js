/* ============================================================
   sprites.js — 角色圖載入
   圖檔放 img/sprites/，檔名由資料表 id 推導：
     unit-<UNIT_TYPES id>.png / enemy-<ENEMY_TYPES id>.png / <MISC>.png
   任何一張缺檔或還沒載完，get() 回 null，呼叫端退回 emoji——
   所以缺圖不會壞遊戲，只是那個角色暫時是 emoji。
   新增角色圖要同步 sw.js 的 ASSETS（離線快取清單）。
   ============================================================ */

const Sprites = {
  DIR: 'img/sprites/',
  MISC: ['rock', 'shovel', 'star', 'house'],
  images: {},
  tintCache: {},

  init() {
    const keys = [
      ...Object.keys(UNIT_TYPES).map(id => `unit-${id}`),
      ...Object.keys(ENEMY_TYPES).map(id => `enemy-${id}`),
      ...this.MISC,
    ];
    for (const key of keys) {
      const img = new Image();
      img.src = this.src(key);
      this.images[key] = img;
    }
  },

  src(key) {
    return `${this.DIR}${key}.png`;
  },

  /** 已載入完成的圖；否則 null（呼叫端退回 emoji） */
  get(key) {
    const img = this.images[key];
    return img && img.complete && img.naturalWidth > 0 ? img : null;
  },

  /**
   * 同輪廓的純色剪影（受傷閃白、結冰染藍用）。
   * 只做 source-in 合成、不讀像素，所以 file:// 開啟也不會踩 canvas 污染限制。
   */
  tinted(key, color) {
    const cacheKey = `${key}|${color}`;
    if (this.tintCache[cacheKey]) return this.tintCache[cacheKey];
    const img = this.get(key);
    if (!img) return null;
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, c.width, c.height);
    this.tintCache[cacheKey] = c;
    return c;
  },
};
