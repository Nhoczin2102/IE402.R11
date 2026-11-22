const { checkDatabaseHealth } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

const getLiveness = (req, res) =>
  res.status(200).json({
    status: 'OK',
    service: 'WebGIS 3D Cemetery Planning Backend',
    timestamp: new Date().toISOString(),
  });

const getReadiness = asyncHandler(async (req, res) => {
  const dbInfo = await checkDatabaseHealth();
  return res.status(200).json({
    status: 'READY',
    service: 'WebGIS 3D Cemetery Planning Backend',
    database: {
      connected: true,
      serverTime: dbInfo.server_time,
      postgisVersion: dbInfo.postgis_version,
    },
  });
});

module.exports = {
  getLiveness,
  getReadiness,
};
