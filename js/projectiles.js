/* ============================================================
   projectiles.js — 投射物
   由射手發射，向右直飛，命中同列第一個接觸到的敵人。
   spec 由單位資料表的 projectile 欄位提供：
   { damage, speed, color, slow? }
   ============================================================ */

const Projectiles = {

  /** 從某格中心發射一發 */
  spawn(row, x, y, spec) {
    G.projectiles.push({
      row, x, y,
      damage: spec.damage,
      speed: spec.speed,
      slow: spec.slow || 0,
      splash: spec.splash || 0,           // 濺射半徑（px），0 = 無
      splashDamage: spec.splashDamage || 0,
      color: spec.color || '#b6ff7a',
      age: 0,               // 供渲染做飄浮動畫
    });
  },

  update(dt) {
    for (let i = G.projectiles.length - 1; i >= 0; i--) {
      const p = G.projectiles[i];
      p.x += p.speed * dt;
      p.age += dt;

      // 飛出畫面就移除
      if (p.x > CONFIG.CANVAS_W + 40) {
        G.projectiles.splice(i, 1);
        continue;
      }

      // 命中判定：同列、且投射物進入敵人身體範圍（半寬 = size/2，Boss 更大）
      let hit = null;
      for (const e of G.enemies) {
        if (e.row !== p.row) continue;
        const half = e.def.size / 2;
        if (p.x >= e.x - half && p.x <= e.x + half) {
          // 取最靠左（最先被打到）的那隻
          if (!hit || e.x < hit.x) hit = e;
        }
      }

      if (hit) {
        Enemies.damage(hit, p.damage, { slow: p.slow });
        // 濺射：同列、命中點半徑內的其他敵人吃濺射傷害
        if (p.splash) {
          G.bursts.push({ x: p.x, y: p.y, r: 40, color: '#ff9a5a', age: 0 });
          const others = G.enemies.filter(
            e => e !== hit && e.row === p.row && Math.abs(e.x - p.x) <= p.splash
          );
          for (const e of others) Enemies.damage(e, p.splashDamage);
        }
        G.projectiles.splice(i, 1);
      }
    }
  },
};
