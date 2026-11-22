const sendSuccess = (res, data, statusCode = 200, meta = undefined) => {
  const payload = { success: true, data };
  if (meta !== undefined) {
    payload.meta = meta;
  }
  return res.status(statusCode).json(payload);
};

const toGeoJsonFeatureCollection = (rows, geometryKey = 'geojson', idKey = null) => ({
  type: 'FeatureCollection',
  features: rows.map((row) => {
    const { [geometryKey]: rawGeometry, ...properties } = row;
    const geometry = typeof rawGeometry === 'string' ? JSON.parse(rawGeometry) : rawGeometry;
    const feature = {
      type: 'Feature',
      geometry,
      properties,
    };
    if (idKey && row[idKey] !== undefined) {
      feature.id = row[idKey];
    }
    return feature;
  }),
});

module.exports = {
  sendSuccess,
  toGeoJsonFeatureCollection,
};
