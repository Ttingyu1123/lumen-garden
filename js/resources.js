/* ============================================================
   resources.js — 光能系統
   兩種來源：天上定時掉落、聚光菇生產。
   光珠要用滑鼠點擊收集，落地一段時間後淡出消失。
   ============================================================ */

const Resources = {

  /** 天降光珠：隨機挑一格的位置，從畫面上方落下 */
  spawnSkyOrb() {
    const col = Math.floor(Math.random() * CONFIG.COLS);
    const row = Math.floor(Math.random() * CONFIG.ROWS);
    const c = Grid.cellCenter(row, col);
    G.orbs.push({
      x: c.x + (Math.random() * 30 - 15),
      y: -20,
      targetY: c.y,       // 落到目標列的中心
      landed: false,
      age: 0,             // 落地後開始計時
      value: CONFIG.ORB_VALUE,
    });
  },

  /** 單位生產的光珠：拋到格子右下角落地，避免疊在生產者身上看不見 */
  spawnOrbAt(x, y) {
    G.orbs.push({
      x: x + 26 + (Math.random() * 12 - 6),
      y: y - 20,
      targetY: y + 26 + (Math.random() * 8 - 4),
      landed: false,
      age: 0,
      value: CONFIG.ORB_VALUE,
    });
  },

  /** 每幀更新：天降計時、下落、落地老化 */
  update(dt) {
    // 定時天降
    G.skyOrbTimer += dt;
    if (G.skyOrbTimer >= CONFIG.SKY_ORB_INTERVAL) {
      G.skyOrbTimer = 0;
      this.spawnSkyOrb();
    }

    for (const orb of G.orbs) {
      if (!orb.landed) {
        orb.y += CONFIG.ORB_FALL_SPEED * dt;
        if (orb.y >= orb.targetY) {
          orb.y = orb.targetY;
          orb.landed = true;
        }
      } else {
        orb.age += dt;
      }
    }

    // 過期移除
    G.orbs = G.orbs.filter(o => o.age < CONFIG.ORB_LIFETIME);
  },

  /** 嘗試收集點擊位置的光珠；收到回傳 true */
  tryCollect(x, y) {
    for (let i = G.orbs.length - 1; i >= 0; i--) {
      const o = G.orbs[i];
      const dx = o.x - x, dy = o.y - y;
      if (dx * dx + dy * dy <= 28 * 28) {   // 點擊半徑 28px
        G.lux += o.value;
        G.floaters.push({ x: o.x, y: o.y, text: `+${o.value}`, age: 0 });
        G.orbs.splice(i, 1);
        Sfx.play('collect');
        return true;
      }
    }
    return false;
  },

  /** 扣資源；不足回傳 false */
  spend(amount) {
    if (G.lux < amount) return false;
    G.lux -= amount;
    return true;
  },
};
