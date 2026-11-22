const routingService = require('../services/routingService');
const asyncHandler = require('../utils/asyncHandler');

// Giữ nguyên cấu trúc phẳng (routePath, distanceMeters...) để tương thích trực tiếp Frontend
const findShortestRoute3D = asyncHandler(async (req, res) => {
  const result = await routingService.calculateShortestRoute3D(req.query);
  return res.status(200).json(result);
});

const getRoadNetwork = asyncHandler(async (req, res) => {
  const network = await routingService.getRoadNetworkGeoJson();
  return res.status(200).json(network);
});

module.exports = {
  findShortestRoute3D,
  getRoadNetwork,
};
