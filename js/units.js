/* ============================================================
   units.js — 防禦單位系統
   放置、行為（生產 / 射擊 / 純擋路）、受擊與死亡。
   ============================================================ */

const Units = {

  /**
   * 嘗試在 (row, col) 放置 typeId 單位。
   * 回傳 { ok: true } 或 { ok: false, reason: '提示文字' }
   */
  tryPlace(typeId, row, col) {
    const def = UNIT_TYPES[typeId];
    if (!def) return { ok: false, reason: '未知單位' };

    // 冷卻檢查
    const readyAt = G.cardReadyAt[typeId] || 0;
    if (G.time < readyAt) {
      return { ok: false, reason: `${def.name} 冷卻中（${Math.ceil(readyAt - G.time)} 秒）` };
    }

    // 格子檢查
    if (Grid.isOccupied(row, col)) {
      return { ok: false, reason: '這格已經有單位了' };
    }

    // 資源檢查
    if (!Resources.spend(def.cost)) {
      return { ok: false, reason: `光能不足（需要 ${def.cost}）` };
    }

    const unit = {
      typeId,
      def,
      row,
      col,
      hp: def.hp,
      maxHp: def.hp,
      timer: 0,   // 生產 / 射擊共用計時器
    };
    G.grid[row][col] = unit;
    G.units.push(unit);
    G.cardReadyAt[typeId] = G.time + def.cooldown;
    return { ok: true };
  },

  update(dt) {
    for (const u of G.units) {
      if (u.def.type === 'producer') {
        // 定期生產光珠
        u.timer += dt;
        if (u.timer >= u.def.produceInterval) {
          u.timer = 0;
          const c = Grid.cellCenter(u.row, u.col);
          Resources.spawnOrbAt(c.x, c.y);
        }
      } else if (u.def.type === 'shooter') {
        // 同列前方（右側）有敵人才充能射擊
        const c = Grid.cellCenter(u.row, u.col);
        const hasTarget = G.enemies.some(
          e => e.row === u.row && e.x > c.x && e.x < CONFIG.CANVAS_W + 40
        );
        if (hasTarget) {
          u.timer += dt;
          if (u.timer >= u.def.fireInterval) {
            u.timer = 0;
            Projectiles.spawn(u.row, c.x + 20, c.y - 10, u.def.damage, u.def.projectileSpeed);
          }
        } else {
          u.timer = Math.min(u.timer, u.def.fireInterval); // 沒目標時保持蓄力上限
        }
      }
      // 'wall' 型不做事，站著就是貢獻
    }
  },

  /** 單位受擊；死亡時從格子與清單移除 */
  damage(unit, amount) {
    unit.hp -= amount;
    if (unit.hp <= 0) {
      G.grid[unit.row][unit.col] = null;
      const i = G.units.indexOf(unit);
      if (i !== -1) G.units.splice(i, 1);
    }
  },
};
