/* ============================================================
   perks.js — 無盡模式 Roguelike 增益
   每清完 PERKS.EVERY 波（頭目波）跳三選一，效果持續整場。
   數值全掛在 G.perks，套用點散在 units / resources / enemies。
   ============================================================ */

const PERK_POOL = [
  {
    id: 'rapid', emoji: '⚡', name: '疾光射擊',
    desc: '所有射手射速 +15%',
    apply() { G.perks.fireRateMult *= 0.85; },
  },
  {
    id: 'power', emoji: '💪', name: '星辰之力',
    desc: '所有傷害 +20%（射手、地雷）',
    apply() { G.perks.damageMult *= 1.2; },
  },
  {
    id: 'rich', emoji: '💰', name: '豐收月光',
    desc: '每顆光珠價值 +10',
    apply() { G.perks.orbBonus += 10; },
  },
  {
    id: 'windfall', emoji: '🎁', name: '星光橫財',
    desc: '立即獲得 200 光能',
    apply() { G.lux += 200; },
  },
  {
    id: 'cheap', emoji: '⏱️', name: '迅捷佈署',
    desc: '卡牌冷卻 -20%',
    apply() { G.perks.cooldownMult *= 0.8; },
  },
  {
    id: 'rebomb', emoji: '🌟', name: '防線重鑄',
    desc: '補回一列星光炸彈（全滿則改 +100 光能）',
    apply() {
      const i = G.rowBombs.indexOf(false);
      if (i !== -1) G.rowBombs[i] = true;
      else G.lux += 100;
    },
  },
  {
    id: 'tough', emoji: '🛡️', name: '磐石意志',
    desc: '所有單位血量 +25%（場上單位同步強化）',
    apply() {
      G.perks.unitHpMult *= 1.25;
      for (const u of G.units) {
        u.maxHp = Math.round(u.maxHp * 1.25);
        u.hp = Math.round(u.hp * 1.25);
      }
    },
  },
  {
    id: 'chill', emoji: '❄️', name: '徹骨寒霜',
    desc: '減速持續時間 +1.5 秒',
    apply() { G.perks.slowBonus += 1.5; },
  },
];

const Perks = {
  /** 隨機抽 n 個不重複的增益選項 */
  roll(n) {
    const pool = [...PERK_POOL];
    const picks = [];
    while (picks.length < n && pool.length > 0) {
      const i = Math.floor(Math.random() * pool.length);
      picks.push(pool.splice(i, 1)[0]);
    }
    return picks;
  },

  /** 套用選中的增益並解除選擇凍結 */
  take(perk) {
    perk.apply();
    G.perks.taken.push(perk.id);
    G.perkChoice = null;
    UI.hidePerkChoice();
    UI.toast(`${perk.emoji} 獲得增益：${perk.name}`);
    Sfx.play('collect');
  },
};
