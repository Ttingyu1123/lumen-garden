/* ============================================================
   grid.js — 5×9 格子系統與座標換算
   ============================================================ */

const Grid = {

  /** 該格左上角的 canvas 座標 */
  cellOrigin(row, col) {
    return {
      x: CONFIG.GRID_X + col * CONFIG.CELL_W,
      y: CONFIG.GRID_Y + row * CONFIG.CELL_H,
    };
  },

  /** 該格中心點的 canvas 座標 */
  cellCenter(row, col) {
    const o = this.cellOrigin(row, col);
    return { x: o.x + CONFIG.CELL_W / 2, y: o.y + CONFIG.CELL_H / 2 };
  },

  /** canvas 座標 → 格子；不在格子範圍內回傳 null */
  cellAt(x, y) {
    const col = Math.floor((x - CONFIG.GRID_X) / CONFIG.CELL_W);
    const row = Math.floor((y - CONFIG.GRID_Y) / CONFIG.CELL_H);
    if (row < 0 || row >= CONFIG.ROWS || col < 0 || col >= CONFIG.COLS) return null;
    return { row, col };
  },

  /** 該格是否已有單位 */
  isOccupied(row, col) {
    return G.grid[row][col] !== null;
  },

  /** 某一列 y 中心（給敵人與投射物用） */
  rowCenterY(row) {
    return CONFIG.GRID_Y + row * CONFIG.CELL_H + CONFIG.CELL_H / 2;
  },

  /** 敵人的進場 x（畫布右緣外一點） */
  spawnX() {
    return CONFIG.CANVAS_W + 30;
  },

  /** 防線 x：敵人中心走過這條線就輸了 */
  defeatX() {
    return CONFIG.GRID_X - 6;
  },
};
