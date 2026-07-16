# Napkin Runbook

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

## Execution & Validation (Highest Priority)
- (2026-07-16) 驗證流程：`python -m http.server <冷門埠>` + `PYTHONUTF8=1 python <playwright腳本>`。不加 PYTHONUTF8 會在 zh-TW 主控台 cp950 crash。腳本用 `page.evaluate` 直接操作 `G` 加速，但行為要走真實遊戲迴圈。
- (2026-07-13) 測試假陽性主因：在 evaluate 裡繞過主迴圈（直接呼叫 `Enemies.update()`、改 `G.phase`）。Do instead：改狀態後等下一幀，讓 loop() 統一處理 phase 轉換。
- (2026-07-16) 測試裡連放兩個同種單位會撞卡牌冷卻（`G.cardReadyAt`）。Do instead：evaluate 先 `G.cardReadyAt = {}`。
- (2026-07-16) PWA 離線測試：`context.set_offline()` 攔不到 SW 請求。Do instead：腳本自帶 HTTP server thread，`server.shutdown()` 後 reload 驗證。
- (2026-07-16) 整場 smoke：滿級陣容 + `Waves.startWave(5)` 從第 6 波實時打到 win，全程掛 pageerror listener（約 3 分鐘）。

## Domain Behavior Guardrails
- (2026-07-16) **新增 js 檔要同步三處**：index.html `<script>` 順序（依賴在前）、sw.js `ASSETS` 清單、（新 UI 時）style.css。漏 sw.js = 離線版缺檔。
- (2026-07-13) 刻意不用 ES modules（file:// 雙擊即玩）；全域物件依 script 順序互相依賴。
- (2026-07-12) canvas 畫 emoji 只能走 `Renderer.emoji()`（強制不透明 fillStyle + emoji 字型堆疊），否則褪色/單色（見 git 歷史兩個 v1 渲染 bug）。
- (2026-07-16) 數值/資料表全在 config.js（UNIT_TYPES/ENEMY_TYPES/WAVES/LEVELS）+ perks.js `PERK_POOL`；卡牌列與說明表由資料表自動生成，加內容不用動 UI。
- (2026-07-16) 地雷觸發距離必須隨敵人體型（`size/2+30` ≥ 接敵距離 `26+size/2`），固定值會被大體型敵人從射程外啃掉。
- (2026-07-16) sw.js 是 stale-while-revalidate：日常改版不用動 CACHE 版號；要強制全員立即換版才 +1。

## User Directives
- (2026-07-13) 美術維持 emoji（自繪 SVG 小尺寸辨識度較差，已試過並回退，git `955ab6d`）。
- (2026-07-16) 手機真機（iPhone Safari）尚未實測觸控手感——模擬全綠不等於真機 OK，改動觸控相關程式後提醒用戶自驗。
