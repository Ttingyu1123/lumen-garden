/* ============================================================
   assets.js — 原創 SVG 美術（取代 emoji placeholder）
   全部向量手繪、內嵌字串、零圖檔依賴：
   - canvas 透過 data URI 轉 Image 後 drawImage
   - 卡牌列 / 說明表用同一套 dataUri() 放進 <img>
   viewBox 統一 0 0 64 64；敵人面朝左（行進方向）。
   ============================================================ */

const Assets = {

  svg: {
    /* ---------- 防禦單位 ---------- */

    // 聚光菇：發光蕈傘 + 笑臉
    bloom: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><radialGradient id="a" cx=".5" cy=".35" r=".8">
        <stop offset="0" stop-color="#ffedb0"/><stop offset="1" stop-color="#f2a53c"/>
      </radialGradient></defs>
      <circle cx="32" cy="26" r="21" fill="#ffdf8a" opacity=".22"/>
      <ellipse cx="32" cy="49" rx="9" ry="10" fill="#f4e3c4"/>
      <path d="M9 33 Q32 2 55 33 Q32 43 9 33Z" fill="url(#a)"/>
      <circle cx="21" cy="25" r="3.4" fill="#fff4d4" opacity=".95"/>
      <circle cx="37" cy="17" r="2.8" fill="#fff4d4" opacity=".95"/>
      <circle cx="45" cy="27" r="2.4" fill="#fff4d4" opacity=".95"/>
      <circle cx="28" cy="47" r="1.9" fill="#5a4632"/>
      <circle cx="36" cy="47" r="1.9" fill="#5a4632"/>
      <path d="M28 52 Q32 55 36 52" stroke="#5a4632" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    </svg>`,

    // 棘刺射手：帶刺仙人掌，眼神鎖定右方
    thorn: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect x="24" y="12" width="16" height="42" rx="8" fill="#3f9e4d"/>
      <rect x="9" y="22" width="9" height="17" rx="4.5" fill="#3f9e4d"/>
      <rect x="14" y="31" width="13" height="7" rx="3.5" fill="#3f9e4d"/>
      <rect x="46" y="17" width="9" height="15" rx="4.5" fill="#3f9e4d"/>
      <rect x="38" y="26" width="12" height="7" rx="3.5" fill="#3f9e4d"/>
      <rect x="27" y="15" width="4" height="36" rx="2" fill="#4db35c" opacity=".6"/>
      <g stroke="#c8ecce" stroke-width="1.6" stroke-linecap="round">
        <path d="M27 19l-3-3"/><path d="M37 23l3-3"/><path d="M27 31l-3-2"/>
        <path d="M37 37l3 2"/><path d="M27 45l-3 2"/><path d="M13 24l-3-2"/><path d="M51 20l3-2"/>
      </g>
      <circle cx="31" cy="25" r="2.2" fill="#1d3b22"/>
      <circle cx="38" cy="25" r="2.2" fill="#1d3b22"/>
      <path d="M32 32h6" stroke="#1d3b22" stroke-width="1.7" stroke-linecap="round"/>
    </svg>`,

    // 寒霜蓮：冰晶蓮花
    frost: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><radialGradient id="a" cx=".5" cy=".5" r=".65">
        <stop offset="0" stop-color="#eefaff"/><stop offset="1" stop-color="#7cc7f2"/>
      </radialGradient></defs>
      <g fill="url(#a)" stroke="#cdeeff" stroke-width="1">
        <ellipse cx="32" cy="15" rx="8" ry="13"/><ellipse cx="32" cy="49" rx="8" ry="13"/>
        <ellipse cx="15" cy="32" rx="13" ry="8"/><ellipse cx="49" cy="32" rx="13" ry="8"/>
        <g transform="rotate(45 32 32)">
          <ellipse cx="32" cy="16" rx="6.5" ry="11"/><ellipse cx="32" cy="48" rx="6.5" ry="11"/>
          <ellipse cx="16" cy="32" rx="11" ry="6.5"/><ellipse cx="48" cy="32" rx="11" ry="6.5"/>
        </g>
      </g>
      <circle cx="32" cy="32" r="10" fill="#e8f8ff"/>
      <g stroke="#5fb7e8" stroke-width="1.7" stroke-linecap="round">
        <path d="M32 24v16"/><path d="M24 32h16"/><path d="M27 27l10 10"/><path d="M37 27L27 37"/>
      </g>
    </svg>`,

    // 爆炎花：火瓣 + 焰心
    blaze: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><radialGradient id="a" cx=".5" cy=".5" r=".65">
        <stop offset="0" stop-color="#ffd27a"/><stop offset="1" stop-color="#f4623a"/>
      </radialGradient></defs>
      <g fill="url(#a)" stroke="#ffb27a" stroke-width="1">
        <ellipse cx="32" cy="15" rx="8" ry="13"/><ellipse cx="32" cy="49" rx="8" ry="13"/>
        <ellipse cx="15" cy="32" rx="13" ry="8"/><ellipse cx="49" cy="32" rx="13" ry="8"/>
        <g transform="rotate(45 32 32)">
          <ellipse cx="32" cy="16" rx="6.5" ry="11"/><ellipse cx="32" cy="48" rx="6.5" ry="11"/>
          <ellipse cx="16" cy="32" rx="11" ry="6.5"/><ellipse cx="48" cy="32" rx="11" ry="6.5"/>
        </g>
      </g>
      <circle cx="32" cy="32" r="10.5" fill="#8a2f1b"/>
      <path d="M32 23q4 5 1.5 9 q5.5-1 5 5 q-.7 6-6.5 6 q-7 0-7.5-6.5 q-.4-5 3.5-7 q3-2 4-6.5Z" fill="#ffca5f"/>
      <path d="M32 29q2 3 .8 5.4 q3-.4 2.7 2.8 q-.4 3.2-3.5 3.2 q-3.8 0-4-3.4 q-.2-2.6 1.8-3.8 q1.6-1 2.2-4.2Z" fill="#fff1c2"/>
    </svg>`,

    // 磐石守衛：厚重岩石 + 淡定臉
    boulder: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <path d="M13 52q-7-13 3-24 q5-15 22-13 q15 2 17 17 q4 12-4 20 q-4 6-18 6 q-14 0-20-6Z" fill="#8d99ab"/>
      <path d="M18 26q6-9 17-8 l-3 9 q-9-2-14-1Z" fill="#a6b2c4" opacity=".8"/>
      <path d="M44 40q5-6 3-14 l6 5 q1 6-4 11Z" fill="#77839a" opacity=".7"/>
      <path d="M20 44l6 4M40 20l4-3" stroke="#6c7787" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M25 34q1.5-2 4-1M35 34q1.5-2 4-1" stroke="#4a5568" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M29 43h7" stroke="#4a5568" stroke-width="2" stroke-linecap="round"/>
    </svg>`,

    /* ---------- 敵人（面朝左） ---------- */

    // 暗影慢行者：紫袍拖行影
    shambler: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <path d="M48 58q7-20-1-36 q-6-14-21-12 q-15 2-15 19 l-1 29 q10 4 19 1 q5 3 19-1Z" fill="#5b4a86"/>
      <path d="M10 58q3-4 4-9l5 5 4-6 4 7 4-5 3 8" stroke="#453768" stroke-width="3" fill="none"/>
      <ellipse cx="27" cy="26" rx="12" ry="13" fill="#2c2347"/>
      <circle cx="21" cy="24" r="3.2" fill="#c9f24b"/>
      <circle cx="31" cy="25" r="2.6" fill="#c9f24b"/>
      <path d="M20 33q5 3 10 1" stroke="#c9f24b" stroke-width="1.4" fill="none" opacity=".65"/>
      <rect x="3" y="30" width="17" height="6.5" rx="3.2" fill="#5b4a86"/>
      <circle cx="5.5" cy="33" r="3.4" fill="#453768"/>
    </svg>`,

    // 暗影疾走者：前傾猩紅殘影
    sprinter: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <g stroke="#d98b74" stroke-width="2" stroke-linecap="round" opacity=".55">
        <path d="M46 20h12"/><path d="M50 30h11"/><path d="M48 40h9"/>
      </g>
      <path d="M50 54q5-18-6-32 q-8-10-19-7 q-9 3-7 14 l5 25 q8 4 15 2 q5 2 12-2Z" fill="#a8434f"/>
      <ellipse cx="24" cy="22" rx="10" ry="10.5" fill="#5e2129"/>
      <path d="M15 20l7 2M27 21l6 2" stroke="#ffb84d" stroke-width="3" stroke-linecap="round"/>
      <path d="M18 29q5 2 9 0" stroke="#ffb84d" stroke-width="1.4" fill="none" opacity=".7"/>
      <path d="M20 52l-9 8M34 54l-4 9" stroke="#7c2f38" stroke-width="5" stroke-linecap="round"/>
      <rect x="4" y="32" width="15" height="6" rx="3" fill="#a8434f" transform="rotate(-12 11 35)"/>
    </svg>`,

    // 暗影重甲兵：鋼板胸甲 + 頭盔窄縫紅眼
    brute: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <path d="M52 58q8-24-2-42 q-9-14-25-11 q-16 3-17 21 l-2 32 q12 4 23 1 q6 3 23-1Z" fill="#4a3f63"/>
      <path d="M14 14q9-9 22-7 q9 2 13 10 l-38 3Z" fill="#8b96a8"/>
      <path d="M13 17h38v6q-19 4-38 0Z" fill="#77839a"/>
      <rect x="16" y="21" width="15" height="5" rx="2.5" fill="#1d1830"/>
      <circle cx="21" cy="23.5" r="1.9" fill="#ff5a5a"/>
      <circle cx="27" cy="23.5" r="1.9" fill="#ff5a5a"/>
      <path d="M14 32h30q4 0 4 4v10q0 4-4 4H14q-4 0-4-4V36q0-4 4-4Z" fill="#9aa7b8" stroke="#6c7787" stroke-width="1.5"/>
      <path d="M10 41h38" stroke="#7d8a9c" stroke-width="1.5"/>
      <circle cx="16" cy="36" r="1.6" fill="#6c7787"/><circle cx="42" cy="36" r="1.6" fill="#6c7787"/>
      <circle cx="16" cy="46" r="1.6" fill="#6c7787"/><circle cx="42" cy="46" r="1.6" fill="#6c7787"/>
      <rect x="2" y="34" width="12" height="7" rx="3.5" fill="#4a3f63"/>
    </svg>`,

    // 暗影君王（Boss）：戴冠巨影 + 斗篷 + 雙目如炬
    boss: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <circle cx="32" cy="34" r="29" fill="#7a5cff" opacity=".14"/>
      <path d="M8 58q-3-28 10-43 q13-14 29-4 q13 9 11 31 l1 16 q-13 5-26 2 q-13 3-25-2Z" fill="#3a2f5c"/>
      <path d="M6 58q4-5 5-11l6 6 5-8 5 9 6-7 5 9 6-6 5 8 5-6 2 6" stroke="#2a2145" stroke-width="3" fill="none"/>
      <path d="M19 12l5 9 6-11 6 11 6-9 4 12-27 3Z" fill="#f2c14e"/>
      <circle cx="24" cy="11" r="2" fill="#ffe08a"/><circle cx="36" cy="10" r="2" fill="#ffe08a"/><circle cx="46" cy="12" r="2" fill="#ffe08a"/>
      <ellipse cx="31" cy="30" rx="15" ry="14" fill="#1c1733"/>
      <path d="M20 26l9 3M34 28l9 2" stroke="#b18cff" stroke-width="4" stroke-linecap="round"/>
      <circle cx="24" cy="27.5" r="2" fill="#ffffff" opacity=".9"/>
      <circle cx="39" cy="29" r="2" fill="#ffffff" opacity=".9"/>
      <path d="M23 38l4 3 4-3 4 3 4-3" stroke="#b18cff" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M2 32q7-2 12 2l-2 7q-6-3-10-1Z" fill="#3a2f5c"/>
    </svg>`,

    /* ---------- 場景與道具 ---------- */

    // 光珠：金色光晶
    orb: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><radialGradient id="a" cx=".5" cy=".45" r=".6">
        <stop offset="0" stop-color="#fff8dc"/><stop offset=".55" stop-color="#ffd76a"/><stop offset="1" stop-color="#f09c2c"/>
      </radialGradient></defs>
      <circle cx="32" cy="32" r="17" fill="url(#a)"/>
      <path d="M32 10q2.5 17 5.5 20 q-3 3-5.5 24 q-2.5-21-5.5-24 q3-3 5.5-20Z" fill="#fffbe8" opacity=".95"/>
      <path d="M12 32q13-2 16-4.5 q2.5 2.5 24 4.5 q-21.5 2-24 4.5 q-3-2.5-16-4.5Z" fill="#fffbe8" opacity=".8"/>
      <circle cx="26" cy="24" r="3.5" fill="#ffffff" opacity=".85"/>
    </svg>`,

    // 星光炸彈：五芒金星
    star: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <circle cx="32" cy="33" r="24" fill="#ffd97a" opacity=".2"/>
      <path d="M32 6l7.6 17.3 18.4 1.9-13.9 12.4 4 18.4L32 46.4 15.9 56l4-18.4L6 25.2l18.4-1.9Z"
        fill="#ffd45e" stroke="#f2a53c" stroke-width="2" stroke-linejoin="round"/>
      <path d="M32 15l4.8 11-9.6 0Z" fill="#fff3c9"/>
    </svg>`,

    // 防線小屋
    house: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect x="14" y="30" width="36" height="26" rx="3" fill="#c9a37a"/>
      <path d="M8 32L32 10l24 22Z" fill="#8a5c3b"/>
      <rect x="27" y="40" width="10" height="16" rx="2" fill="#6b4226"/>
      <rect x="18" y="36" width="8" height="8" rx="1.5" fill="#ffe9b0"/>
      <rect x="40" y="14" width="6" height="10" fill="#8a5c3b"/>
    </svg>`,

    // 鏟子
    shovel: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect x="29" y="6" width="6" height="26" rx="3" fill="#a97142"/>
      <rect x="24" y="4" width="16" height="7" rx="3.5" fill="#8a5c3b"/>
      <path d="M22 32h20v10q0 12-10 16 q-10-4-10-16Z" fill="#aab6c6"/>
      <path d="M26 34h5v9q0 8-2.5 11 q-2.5-4-2.5-11Z" fill="#c4cfdd" opacity=".8"/>
    </svg>`,

    // 護甲小盾（重甲兵頭上的指示）
    shield: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <path d="M32 6l22 8v16q0 18-22 28Q10 48 10 30V14Z" fill="#9aa7b8" stroke="#5f6b7d" stroke-width="3"/>
      <path d="M32 12l16 6v12q0 13-16 21Z" fill="#b9c4d4"/>
    </svg>`,
  },

  images: {},   // name -> HTMLImageElement（data URI 載入極快）

  dataUri(name) {
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(this.svg[name]);
  },

  init() {
    for (const name of Object.keys(this.svg)) {
      const img = new Image();
      img.src = this.dataUri(name);
      this.images[name] = img;
    }
  },

  /** 以 (x, y) 為中心畫指定資產；圖未載入完成時靜默跳過（下一幀補上） */
  draw(ctx, name, x, y, w, h) {
    const img = this.images[name];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
    }
  },
};

Assets.init();
