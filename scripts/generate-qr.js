const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const url = 'http://192.168.18.5:3000';
const artifactDir = 'C:\\Users\\justine\\.gemini\\antigravity\\brain\\8e1280fe-6188-4cb3-b4c9-80f20c7b0ced';
const publicDir = path.join(__dirname, '..', 'public');

if (!fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true });
}

const artifactPath = path.join(artifactDir, 'qr-code.png');
const publicPath = path.join(publicDir, 'qr-code.png');

QRCode.toFile(artifactPath, url, {
  color: {
    dark: '#274E3C',  // Forest green modules
    light: '#FAF8F5'  // Off-white background
  },
  width: 400,
  margin: 2
}, (err) => {
  if (err) console.error('Error generating artifact QR:', err);
  else console.log('QR Code generated at:', artifactPath);
});

QRCode.toFile(publicPath, url, {
  color: {
    dark: '#274E3C',
    light: '#FAF8F5'
  },
  width: 400,
  margin: 2
}, (err) => {
  if (err) console.error('Error generating public QR:', err);
  else console.log('QR Code generated at:', publicPath);
});

