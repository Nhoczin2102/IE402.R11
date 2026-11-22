/**
 * Tính cao độ bề mặt địa hình đồi (mô phỏng bề mặt TIN/DEM liên tục).
 */
const getTerrainHeight = (x, z) =>
  Math.sin(x * 0.05) * 1.8 + Math.cos(z * 0.04) * 1.5 + (x * 0.02 + z * 0.015) * 1.5;

/**
 * Khoảng cách Euclid trong không gian 3 chiều giữa 2 điểm [x, y, z].
 */
const distance3D = (p1, p2) =>
  Math.sqrt((p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2 + (p2[2] - p1[2]) ** 2);

/**
 * Sinh chuỗi WKT POLYGON Z khép kín cho một lô mộ từ tâm (x, z), cao độ y và kích thước chuẩn.
 */
const buildLotPolygonZWkt = (centerX, centerZ, elevationZ, lengthM, widthM) => {
  const halfL = lengthM / 2;
  const halfW = widthM / 2;
  const x1 = Number((centerX - halfL).toFixed(3));
  const x2 = Number((centerX + halfL).toFixed(3));
  const z1 = Number((centerZ - halfW).toFixed(3));
  const z2 = Number((centerZ + halfW).toFixed(3));
  const y = Number(elevationZ.toFixed(2));
  return `POLYGON Z((${x1} ${z1} ${y}, ${x2} ${z1} ${y}, ${x2} ${z2} ${y}, ${x1} ${z2} ${y}, ${x1} ${z1} ${y}))`;
};

module.exports = {
  getTerrainHeight,
  distance3D,
  buildLotPolygonZWkt,
};
