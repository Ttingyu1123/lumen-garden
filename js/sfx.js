/* ============================================================
   sfx.js — Web Audio 合成音效（placeholder，零素材依賴）
   每個音效 = 一支 oscillator 的頻率掃描 + 音量包絡。
   之後要換真音檔，只要改 play() 內部實作即可。
   ============================================================ */

const Sfx = {
  ctx: null,
  enabled: true,

  // 音效規格表：波形、起訖頻率、長度、音量
  SPECS: {
    shoot:   { type: 'square',   f0: 880,  f1: 440,  dur: 0.08, vol: 0.05 },
    frost:   { type: 'sine',     f0: 1300, f1: 350,  dur: 0.15, vol: 0.06 },
    place:   { type: 'triangle', f0: 220,  f1: 110,  dur: 0.12, vol: 0.12 },
    collect: { type: 'sine',     f0: 660,  f1: 1320, dur: 0.15, vol: 0.10 },
    hit:     { type: 'square',   f0: 200,  f1: 90,   dur: 0.06, vol: 0.05 },
    death:   { type: 'sawtooth', f0: 300,  f1: 50,   dur: 0.30, vol: 0.09 },
    wave:    { type: 'sawtooth', f0: 110,  f1: 240,  dur: 0.50, vol: 0.10 },
    win:     { type: 'triangle', f0: 440,  f1: 880,  dur: 0.80, vol: 0.14 },
    lose:    { type: 'sawtooth', f0: 220,  f1: 55,   dur: 1.00, vol: 0.14 },
  },

  /** 必須在使用者手勢（點開始按鈕）之後呼叫，瀏覽器才允許出聲 */
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.ctx = null;   // 不支援就靜音跑，不影響遊戲
    }
  },

  /** 切換開關；回傳目前是否開啟 */
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  },

  play(name) {
    if (!this.enabled || !this.ctx) return;
    const spec = this.SPECS[name];
    if (!spec) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, spec.f1), t + spec.dur);
    gain.gain.setValueAtTime(spec.vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + spec.dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + spec.dur + 0.02);
  },
};
