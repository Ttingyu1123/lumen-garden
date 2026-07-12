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

      // 命中判定：同列、且投射物進入敵人身體範圍（半寬 26px）
      let hit = null;
      for (const e of G.enemies) {
        if (e.row !== p.row) continue;
        if (p.x >= e.x - 26 && p.x <= e.x + 26) {
          // 取最靠左（最先被打到）的那隻
          if (!hit || e.x < hit.x) hit = e;
        }
      }

      if (hit) {
        Enemies.damage(hit, p.damage, { slow: p.slow });
        G.projectiles.splice(i, 1);
      }
    }
  },
};
