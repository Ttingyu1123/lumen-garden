/* ============================================================
   enemies.js — 敵人系統（暗影族）
   從右往左走；碰到防禦單位就停下持續攻擊；
   護甲先吸收傷害；可被減速；血量歸零死亡；
   任一隻走過防線 → 遊戲失敗。
   ============================================================ */

const Enemies = {

  /**
   * 在指定列生成一隻敵人（row 省略則隨機）；血量隨波次成長。
   * opts.x：出生位置（分裂體用），省略 = 畫布右緣進場。
   */
  spawn(typeId, row, opts = {}) {
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
      x: opts.x !== undefined ? opts.x : Grid.spawnX(),   // 敵人中心 x
      hp,
      maxHp: hp,
      armor,
      maxArmor: armor,
      attackTimer: 0,
      target: null,            // 正在啃的單位
      slowT: 0,                // 減速剩餘秒數
      flashT: 0,               // 受傷閃爍剩餘秒數
      abilityTimer: 0,         // Boss 召喚計時器
    });

    if (typeId === 'boss') {
      UI.showBanner('⚠️ 暗影君王現身！');
      Sfx.play('bomb');
    }
  },

  update(dt) {
    const bombRows = [];   // 本幀被引爆的列，迴圈後統一清場

    for (const e of G.enemies) {
      // 狀態計時器
      if (e.slowT > 0) e.slowT -= dt;
      if (e.flashT > 0) e.flashT -= dt;

      // Boss 特殊技：定期召喚爪牙（場上太多敵人就先不召，防爆量）
      if (e.typeId === 'boss') {
        e.abilityTimer += dt;
        const A = CONFIG.BOSS_ABILITY;
        if (e.abilityTimer >= A.SUMMON_INTERVAL) {
          e.abilityTimer = 0;
          if (G.enemies.length < A.SUMMON_CAP) {
            for (let i = 0; i < A.SUMMON_COUNT; i++) {
              this.spawn(Math.random() < 0.5 ? 'shambler' : 'sprinter');
            }
            G.bursts.push({ x: e.x, y: Grid.rowCenterY(e.row), r: 60, color: '#b18cff', age: 0 });
            UI.showBanner('😈 暗影君王召喚爪牙！');
            Sfx.play('wave');
          }
        }
      }

      // 1) 找攻擊目標：同列、在敵人前方（左側）、距離夠近的最近單位
      //    貼近門檻 = 單位半寬 26 + 敵人身體半寬（Boss 更大所以更早接敵）
      //    飛行型不找目標：飛越一切地面單位直撲防線
      const reach = 26 + e.def.size / 2;
      let target = null;
      if (!e.def.flying) {
        for (const u of G.units) {
          if (u.row !== e.row) continue;
          const ux = Grid.cellCenter(u.row, u.col).x;
          if (ux > e.x) continue;                 // 只啃前進方向的單位
          if (e.x - ux > reach) continue;         // 還沒貼到
          if (!target || ux > Grid.cellCenter(target.row, target.col).x) {
            target = u;                           // 取最靠近自己的那個
          }
        }
      }
      e.target = target;

      if (target) {
        // 2a) 攻擊模式：停下，按間隔咬一口
        e.attackTimer += dt;
        if (e.attackTimer >= e.def.attackInterval) {
          e.attackTimer = 0;
          // Boss 巨口碎石：對 wall 型單位傷害翻倍
          const crush = e.typeId === 'boss' && target.def.type === 'wall'
            ? CONFIG.BOSS_ABILITY.CRUSH_MULT : 1;
          Units.damage(target, e.def.damage * crush);
        }
      } else {
        // 2b) 行走模式（減速中打對折）
        e.attackTimer = e.def.attackInterval;   // 一貼上就能咬第一口
        const factor = e.slowT > 0 ? CONFIG.SLOW_FACTOR : 1;
        e.x -= e.def.speed * factor * dt;
      }

      // 3) 破防判定：該列還有星光炸彈就引爆清場（僅此一次），否則輸
      if (e.x <= Grid.defeatX()) {
        if (G.rowBombs[e.row] || bombRows.includes(e.row)) {
          G.rowBombs[e.row] = false;
          if (!bombRows.includes(e.row)) bombRows.push(e.row);
        } else {
          G.phase = 'lose';
        }
      }
    }

    // 星光炸彈清場（迴圈外處理，避免邊走訪邊刪除）
    for (const row of bombRows) {
      const y = Grid.rowCenterY(row);
      for (const v of G.enemies) {
        if (v.row === row) G.bursts.push({ x: v.x, y, r: 46, color: '#ffd97a', age: 0 });
      }
      G.bursts.push({ x: CONFIG.GRID_X + 30, y, r: 70, color: '#ffd97a', age: 0 });
      G.enemies = G.enemies.filter(en => en.row !== row);
      Sfx.play('bomb');
      UI.toast('🌟 星光炸彈引爆！這列的最後防線已用掉');
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
      // 死亡爆裂：尺寸跟身型走，Boss 有大場面
      G.bursts.push({ x: enemy.x, y, r: enemy.def.size * 0.8, color: '#b18cff', age: 0 });
      Sfx.play('death');

      // 裂變體：死亡時在原地分裂成小體（前後錯開避免完全重疊）
      if (enemy.def.splitInto) {
        for (let k = 0; k < enemy.def.splitCount; k++) {
          this.spawn(enemy.def.splitInto, enemy.row, { x: enemy.x + (k === 0 ? -16 : 16) });
        }
      }
    }
  },
};
