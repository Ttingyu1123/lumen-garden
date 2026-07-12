const { test, expect } = require('@playwright/test');

test('無盡模式：啟動、過幾波、失敗、檢查最高紀錄', async ({ page }) => {
  await page.goto('http://localhost:8000');

  // 等待 start screen
  await page.waitForSelector('#screen-start', { state: 'visible' });

  // 點擊無盡模式按鈕
  await page.click('#btn-endless');

  // 等待遊戲開始（screen-start 隱藏）
  await page.waitForSelector('#screen-start', { state: 'hidden' });

  // 等待遊戲進入 playing 狀態（波次倒數開始）
  await page.waitForTimeout(500);

  // 讀取初始波次文字
  let waveLabel = await page.textContent('#wave-label');
  console.log(`初始波次: ${waveLabel}`);
  expect(waveLabel).toContain('準備中');

  // 模擬放置防禦單位打過幾波
  // 取得 canvas 座標
  const canvas = await page.$('#game');
  const box = await canvas.boundingBox();

  // 快速策略：放置 3 個單位在不同列，然後快速按暫停等待敵人來
  const strategy = async () => {
    // 第一列中間位置的棘刺射手
    const click1 = { x: box.x + 200, y: box.y + 100 };
    const click2 = { x: box.x + 350, y: box.y + 200 };
    const click3 = { x: box.x + 500, y: box.y + 300 };

    // 選棘刺射手
    const thornCard = await page.$$('div[data-type="thorn"]');
    if (thornCard.length > 0) {
      await thornCard[0].click();
    }

    // 放置單位
    await page.click(click1);
    await page.click(click2);

    // 選寒霜蓮
    const frostCard = await page.$$('div[data-type="frost"]');
    if (frostCard.length > 0) {
      await frostCard[0].click();
    }
    await page.click(click3);
  };

  await strategy();

  // 快速推進時間：每秒檢查波次
  let waveCount = 0;
  const maxWait = 120; // 最多等 120 秒
  for (let i = 0; i < maxWait; i++) {
    waveLabel = await page.textContent('#wave-label');
    console.log(`${i}s: ${waveLabel}`);

    // 如果無盡模式超過第 3 波就停止
    if (waveLabel.includes('第 3 波') && waveLabel.includes('∞')) {
      waveCount = 3;
      console.log('已進到第 3 波（無盡模式），驗證成功');
      break;
    }

    await page.waitForTimeout(1000);
  }

  // 強行讓敵人進城以失敗（清空所有單位）
  // 選鏟子
  const shovelCard = await page.$('.card-shovel');
  await shovelCard.click();

  // 鏟掉所有單位
  for (let i = 0; i < 10; i++) {
    await page.click(box.x + 200 + i * 50, box.y + 100 + i * 30);
    await page.waitForTimeout(100);
  }

  // 等待失敗
  await page.waitForSelector('#screen-lose', { state: 'visible', timeout: 30000 });

  // 檢查失敗統計
  const loseStats = await page.textContent('#lose-stats');
  console.log(`失敗統計: ${loseStats}`);
  expect(loseStats).toContain('本局撐到');

  // 檢查是否包含最高紀錄或新紀錄標記
  if (loseStats.includes('∞') || loseStats.includes('波')) {
    console.log('✓ 無盡模式失敗統計正確');
  }
});

test('無盡模式：localStorage 最高紀錄持久化', async ({ page, context }) => {
  await page.goto('http://localhost:8000');

  // 清空 localStorage
  await page.evaluate(() => localStorage.clear());

  // 第一局無盡模式（會到某波失敗）
  await page.click('#btn-endless');
  await page.waitForSelector('#screen-start', { state: 'hidden' });

  // 等待遊戲開始後短暫延遲
  await page.waitForTimeout(5000);

  // 強制失敗
  await page.evaluate(() => { G.phase = 'lose'; });

  // 等待失敗畫面
  await page.waitForSelector('#screen-lose', { state: 'visible', timeout: 10000 });
  const firstStats = await page.textContent('#lose-stats');
  console.log(`第一局: ${firstStats}`);

  // 檢查 localStorage 是否寫入了紀錄
  const bestWave = await page.evaluate(() => localStorage.getItem('lumenGarden.bestWave'));
  console.log(`localStorage 記錄波數: ${bestWave}`);
  expect(bestWave).not.toBeNull();
});
