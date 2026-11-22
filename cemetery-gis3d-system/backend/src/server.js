// backend/src/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api', apiRoutes);

app.get('/health', (req, res) => res.json({ status: 'OK', service: 'WebGIS 3D Backend' }));

app.listen(PORT, () => {
  console.log(`Backend WebGIS 3D đang chạy tại http://localhost:${PORT}`);
});