/* ============================================================
   units.js — 防禦單位系統
   放置、行為（生產 / 射擊 / 純擋路）、受擊與死亡。
   射手（thorn / frost）共用 shooter 路徑，差異全在
   config 的 projectile 規格。
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
    if (G.blocked[row][col]) {
      return { ok: false, reason: '巨石上不能種植' };
    }
    if (Grid.isOccupied(row, col)) {
      return { ok: false, reason: '這格已經有單位了' };
    }

    // 資源檢查
    if (!Resources.spend(def.cost)) {
      return { ok: false, reason: `光能不足（需要 ${def.cost}）` };
    }

    const baseHp = Math.round(def.hp * G.perks.unitHpMult);
    const unit = {
      typeId,
      def,
      row,
      col,
      hp: baseHp,
      maxHp: baseHp,
      level: 1,           // 升級等級（點擊場上單位升級，最高 UPGRADE.MAX_LEVEL）
      invested: def.cost, // 累計投資（含升級費），鏟除退款以此計算
      timer: 0,   // 生產 / 射擊共用計時器
      age: 0,     // 放置後經過秒數（供彈出動畫）
    };
    G.grid[row][col] = unit;
    G.units.push(unit);
    G.cardReadyAt[typeId] = G.time + def.cooldown * G.perks.cooldownMult;
    Sfx.play('place');
    return { ok: true };
  },

  /** 升到 L+1 的費用；已滿級回傳 null */
  upgradeCost(unit) {
    if (unit.level >= CONFIG.UPGRADE.MAX_LEVEL) return null;
    return Math.round(unit.def.cost * unit.level * CONFIG.UPGRADE.COST_FACTOR);
  },

  /**
   * 嘗試升級 (row, col) 的單位：血量上限 ×HP_MULT 並回滿，
   * 射手傷害 ×DAMAGE_MULT、生產間隔 ×PRODUCE_FACTOR（見等級加成 getters）。
   */
  tryUpgrade(row, col) {
    const unit = G.grid[row][col];
    if (!unit) return { ok: false, reason: '這格沒有單位' };
    const cost = this.upgradeCost(unit);
    if (cost === null) return { ok: false, reason: `${unit.def.name} 已是最高等級` };
    if (!Resources.spend(cost)) {
      return { ok: false, reason: `升級需要 ${cost} 光能` };
    }
    unit.level += 1;
    unit.invested += cost;
    unit.maxHp = Math.round(
      unit.def.hp * Math.pow(CONFIG.UPGRADE.HP_MULT, unit.level - 1) * G.perks.unitHpMult
    );
    unit.hp = unit.maxHp;   // 升級回滿血
    unit.age = 0;           // 重播彈出動畫當升級回饋
    const c = Grid.cellCenter(row, col);
    G.floaters.push({ x: c.x, y: c.y - 20, text: `⬆ Lv${unit.level}`, age: 0 });
    Sfx.play('place');
    if (unit.level >= CONFIG.UPGRADE.MAX_LEVEL) Progress.unlock('max_unit');
    return { ok: true, level: unit.level };
  },

  /** 射手的等級傷害倍率 / 生產者的等級間隔倍率 */
  damageMult(unit) {
    return Math.pow(CONFIG.UPGRADE.DAMAGE_MULT, unit.level - 1);
  },
  produceInterval(unit) {
    return unit.def.produceInterval * Math.pow(CONFIG.UPGRADE.PRODUCE_FACTOR, unit.level - 1);
  },

  update(dt) {
    for (const u of G.units) {
      u.age += dt;

      if (u.def.type === 'producer') {
        // 定期生產光珠
        u.timer += dt;
        if (u.timer >= this.produceInterval(u)) {
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
          if (u.timer >= u.def.fireInterval * G.perks.fireRateMult) {
            u.timer = 0;
            // 等級與增益加成套在投射物規格上（不動 def 原本資料）
            const base = u.def.projectile;
            const mult = this.damageMult(u) * G.perks.damageMult;
            const spec = {
              ...base,
              damage: Math.round(base.damage * mult),
              splashDamage: Math.round((base.splashDamage || 0) * mult),
              slow: base.slow ? base.slow + G.perks.slowBonus : 0,
            };
            Projectiles.spawn(u.row, c.x + 20, c.y - 10, spec);
            Sfx.play(u.def.sfx || 'shoot');
          }
        } else {
          u.timer = Math.min(u.timer, u.def.fireInterval); // 沒目標時保持蓄力上限
        }
      } else if (u.def.type === 'mine') {
        // 佈署倒數 → 警戒；地面敵人踩進觸發範圍就引爆（一次性）
        u.timer += dt;
        if (u.timer >= u.def.mine.armTime) {
          const c = Grid.cellCenter(u.row, u.col);
          // 觸發距離隨敵人體型：確保停下啃咬前一定先踩到（reach = 26 + size/2）
          const tripped = G.enemies.some(e =>
            !e.def.flying && e.row === u.row &&
            Math.abs(e.x - c.x) <= e.def.size / 2 + 30
          );
          if (tripped) this.explodeMine(u);
        }
      }
      // 'wall' 型不做事，站著就是貢獻
    }
  },

  /** 引爆地雷：同列半徑內地面敵人全吃傷害，地雷消失（無退款） */
  explodeMine(u) {
    const c = Grid.cellCenter(u.row, u.col);
    const dmg = Math.round(u.def.mine.damage * this.damageMult(u) * G.perks.damageMult);
    const victims = G.enemies.filter(e =>
      !e.def.flying && e.row === u.row && Math.abs(e.x - c.x) <= u.def.mine.radius
    );
    G.bursts.push({ x: c.x, y: c.y, r: u.def.mine.radius, color: '#ffb35a', age: 0 });
    G.grid[u.row][u.col] = null;
    const i = G.units.indexOf(u);
    if (i !== -1) G.units.splice(i, 1);
    Sfx.play('bomb');
    const hadBoss = victims.some(e => e.typeId === 'boss');
    for (const e of victims) Enemies.damage(e, dmg);
    // 地雷擊殺 Boss 成就：炸完場上少了那隻 Boss 才算
    if (hadBoss && !G.enemies.some(e => e.typeId === 'boss' && victims.includes(e))) {
      Progress.unlock('mine_boss');
    }
  },

  /** 鏟除單位：退回 50% 成本。回傳 { ok } 或 { ok:false, reason } */
  remove(row, col) {
    const unit = G.grid[row][col];
    if (!unit) return { ok: false, reason: '這格沒有單位可以鏟' };
    const refund = Math.floor(unit.invested * CONFIG.SHOVEL_REFUND);
    G.lux += refund;
    const c = Grid.cellCenter(row, col);
    G.floaters.push({ x: c.x, y: c.y, text: `+${refund}`, age: 0 });
    G.grid[row][col] = null;
    const i = G.units.indexOf(unit);
    if (i !== -1) G.units.splice(i, 1);
    Sfx.play('dig');
    return { ok: true };
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
