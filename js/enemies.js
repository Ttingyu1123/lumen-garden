/* ============================================================
   enemies.js — 敵人系統（暗影族）
   從右往左走；碰到防禦單位就停下持續攻擊；
   護甲先吸收傷害；可被減速；血量歸零死亡；
   任一隻走過防線 → 遊戲失敗。
   ============================================================ */

const Enemies = {

  /** 在指定列生成一隻敵人（row 省略則隨機）；血量隨波次成長 */
  spawn(typeId, row) {
    const def = ENEMY_TYPES[typeId];
    if (row === undefined) row = Math.floor(Math.random() * CONFIG.ROWS);

    // 難度曲線：第 N 波（0-based）血量與護甲 ×(1 + N×WAVE_HP_GROWTH)
    const mult = 1 + Math.max(0, G.wave.index) * CONFIG.WAVE_HP_GROWTH;
    const hp = Math.round(def.hp * mult);
    const armor = Math.round((def.armor || 0) * mult);

    G.enemies.push({
      typeId,
      def,
      row,
      x: Grid.spawnX(),        // 敵人中心 x
      hp,
      maxHp: hp,
      armor,
      maxArmor: armor,
      attackTimer: 0,
      target: null,            // 正在啃的單位
      slowT: 0,                // 減速剩餘秒數
      flashT: 0,               // 受傷閃爍剩餘秒數
    });
  },

  update(dt) {
    for (const e of G.enemies) {
      // 狀態計時器
      if (e.slowT > 0) e.slowT -= dt;
      if (e.flashT > 0) e.flashT -= dt;

      // 1) 找攻擊目標：同列、在敵人前方（左側）、距離夠近的最近單位
      //    敵人身體半寬約 26px，單位佔一格；貼近門檻取 52px（半格多一點）
      let target = null;
      for (const u of G.units) {
        if (u.row !== e.row) continue;
        const ux = Grid.cellCenter(u.row, u.col).x;
        if (ux > e.x) continue;                 // 只啃前進方向的單位
        if (e.x - ux > 52) continue;            // 還沒貼到
        if (!target || ux > Grid.cellCenter(target.row, target.col).x) {
          target = u;                           // 取最靠近自己的那個
        }
      }
      e.target = target;

      if (target) {
        // 2a) 攻擊模式：停下，按間隔咬一口
        e.attackTimer += dt;
        if (e.attackTimer >= e.def.attackInterval) {
          e.attackTimer = 0;
          Units.damage(target, e.def.damage);
        }
      } else {
        // 2b) 行走模式（減速中打對折）
        e.attackTimer = e.def.attackInterval;   // 一貼上就能咬第一口
        const factor = e.slowT > 0 ? CONFIG.SLOW_FACTOR : 1;
        e.x -= e.def.speed * factor * dt;
      }

      // 3) 破防判定
      if (e.x <= Grid.defeatX()) {
        G.phase = 'lose';
      }
    }
  },

  /**
   * 敵人受擊。opts.slow = 命中附帶的減速秒數。
   * 護甲先吸收傷害；減速不受護甲影響。
   */
  damage(enemy, amount, opts = {}) {
    if (enemy.armor > 0) {
      const absorbed = Math.min(enemy.armor, amount);
      enemy.armor -= absorbed;
      amount -= absorbed;
    }
    enemy.hp -= amount;
    enemy.flashT = 0.15;   // 受傷閃白
    if (opts.slow) enemy.slowT = Math.max(enemy.slowT, opts.slow);
    Sfx.play('hit');

    if (enemy.hp <= 0) {
      const i = G.enemies.indexOf(enemy);
      if (i !== -1) G.enemies.splice(i, 1);
      const y = Grid.rowCenterY(enemy.row);
      G.floaters.push({ x: enemy.x, y: y - 10, text: '💥', age: 0 });
      Sfx.play('death');
    }
  },
};
