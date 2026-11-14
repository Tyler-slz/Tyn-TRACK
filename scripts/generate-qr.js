const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

/**
 * Load key=value pairs from local .env files without requiring external dependencies.
 */
function loadLocalEnv() {
  const rootDir = path.join(__dirname, '..');
  for (const fileName of ['.env.local', '.env']) {
    const filePath = path.join(rootDir, fileName);
    if (!fs.existsSync(filePath)) continue;
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIndex = line.indexOf('=');
      if (eqIndex <= 0) continue;
      const key = line.slice(0, eqIndex).trim();
      let val = line.slice(eqIndex + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = val;
      }
    }
  }
}

loadLocalEnv();

const url = process.env.TYN_DEV_URL || 'http://localhost:3000';
const customOutputDir = process.env.TYN_QR_OUTPUT_DIR;
const publicDir = path.join(__dirname, '..', 'public');

const qrOptions = {
  color: {
    dark: '#274E3C', // Forest green modules
    light: '#FAF8F5', // Off-white background
  },
  width: 400,
  margin: 2,
};

if (customOutputDir) {
  if (!fs.existsSync(customOutputDir)) {
    fs.mkdirSync(customOutputDir, { recursive: true });
  }
  const artifactPath = path.join(customOutputDir, 'qr-code.png');
  QRCode.toFile(artifactPath, url, qrOptions, (err) => {
    if (err) console.error('Error generating custom QR:', err);
    else console.log('QR Code generated at:', artifactPath);
  });
}

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
const publicPath = path.join(publicDir, 'qr-code.png');
QRCode.toFile(publicPath, url, qrOptions, (err) => {
  if (err) console.error('Error generating public QR:', err);
  else console.log('QR Code generated at:', publicPath);
});
