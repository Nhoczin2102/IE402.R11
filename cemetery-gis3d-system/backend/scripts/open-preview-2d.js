const { exec } = require('child_process');
require('dotenv').config();

const port = process.env.PORT || 5001;
const url = `http://localhost:${port}/preview-2d`;

console.log(`[WebGIS 2D Preview] Đang mở bản đồ kiểm thử dữ liệu thật tại: ${url}`);
console.log('[Lưu ý] Đảm bảo server Backend đang chạy bằng lệnh "npm run dev" ở terminal khác.');

const cmd =
  process.platform === 'win32'
    ? `start "" "${url}"`
    : process.platform === 'darwin'
    ? `open "${url}"`
    : `xdg-open "${url}"`;

exec(cmd, (err) => {
  if (err) {
    console.log(`Không thể tự mở trình duyệt. Bạn hãy mở trực tiếp đường dẫn: ${url}`);
  }
});
