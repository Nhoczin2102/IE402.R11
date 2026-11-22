const express = require('express');
const openApiSpec = require('./openapi.spec');

const router = express.Router();

router.get('/openapi.json', (req, res) => {
  res.status(200).json(openApiSpec);
});

router.get('/docs', (req, res) => {
  // Cho phép tải script giao diện Scalar API Reference tại trang /docs
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net; connect-src 'self' http://localhost:* https://cdn.jsdelivr.net;"
  );
  res.status(200).type('html').send(`<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>API Docs — WebGIS 3D Nghĩa trang Đô thị (IE402.R11)</title>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/openapi.json"
      data-configuration='{"theme":"purple","layout":"modern"}'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`);
});

module.exports = router;
