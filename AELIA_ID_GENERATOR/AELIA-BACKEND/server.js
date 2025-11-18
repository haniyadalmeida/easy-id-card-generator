// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bwipjs = require('bwip-js');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 4000;

// -----------------------------------------------------
//  Ensure Storage Folders
// -----------------------------------------------------
const STORAGE = path.join(__dirname, 'storage');
const UPLOADS = path.join(STORAGE, 'uploads');
const DB_FILE = path.join(STORAGE, 'cards.json');

if (!fs.existsSync(STORAGE)) fs.mkdirSync(STORAGE);
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS);
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));

// -----------------------------------------------------
//  Middleware
// -----------------------------------------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads folder as static
app.use('/static/uploads', express.static(UPLOADS));

// Multer file upload configuration
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }  // 8MB
});

// -----------------------------------------------------
//  Helper Functions
// -----------------------------------------------------
function readDB() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// -----------------------------------------------------
//  HEALTH CHECK
// -----------------------------------------------------
app.get('/', (_, res) => res.send('Aelia backend running ✔'));

// -----------------------------------------------------
//  CREATE CARD (POST /api/cards)
// -----------------------------------------------------
app.post('/api/cards', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'signature', maxCount: 1 },
  { name: 'logo', maxCount: 1 },
  { name: 'scanner', maxCount: 1 }
]), async (req, res) => {
  try {
    const body = req.body || {};
    const files = req.files || {};

    const cardId = uuidv4();

    // Process file uploads
    const photo     = files.photo?.[0]     ? `/static/uploads/${path.basename(files.photo[0].path)}` : '';
    const signature = files.signature?.[0] ? `/static/uploads/${path.basename(files.signature[0].path)}` : '';
    const logo      = files.logo?.[0]      ? `/static/uploads/${path.basename(files.logo[0].path)}` : '';
    const scanner   = files.scanner?.[0]   ? `/static/uploads/${path.basename(files.scanner[0].path)}` : '';

    // Generate barcode
    const idForBarcode = body.idnum || `AEL-${cardId}`;
    const barcodeBuffer = await bwipjs.toBuffer({
      bcid: 'code128',
      text: idForBarcode,
      scale: 3,
      height: 12,
      includetext: true,
      textxalign: 'center'
    });

    const barcodeFilename = `${Date.now()}-${cardId}-barcode.png`;
    fs.writeFileSync(path.join(UPLOADS, barcodeFilename), barcodeBuffer);
    const barcodeUrl = `/static/uploads/${barcodeFilename}`;

    // Build card object
    const card = {
      id: cardId,
      name: body.name || '',
      position: body.position || '',
      idnum: body.idnum || '',
      dob: body.dob || '',
      phone: body.phone || '',
      email: body.email || '',
      issuedate: body.issuedate || '',
      expirydate: body.expirydate || '',
      photo,
      signature,
      logo,
      scanner,
      barcode: barcodeUrl,
      createdAt: new Date().toISOString()
    };

    // Save to DB
    const db = readDB();
    db.push(card);
    writeDB(db);

    const base = process.env.BASE_URL || `http://localhost:${PORT}`;
    res.json({
      ok: true,
      card,
      urls: {
        photo: photo ? base + photo : '',
        signature: signature ? base + signature : '',
        logo: logo ? base + logo : '',
        scanner: scanner ? base + scanner : '',
        barcode: base + barcodeUrl
      }
    });

  } catch (err) {
    console.error("Create card error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// -----------------------------------------------------
//  GET ALL CARDS
// -----------------------------------------------------
app.get('/api/cards', (_, res) => {
  res.json(readDB());
});

// -----------------------------------------------------
//  GET ONE CARD
// -----------------------------------------------------
app.get('/api/cards/:id', (req, res) => {
  const db = readDB();
  const card = db.find(c => c.id === req.params.id);

  if (!card) return res.status(404).json({ error: "Card not found" });

  const base = process.env.BASE_URL || `http://localhost:${PORT}`;
  res.json({
    ...card,
    photo: card.photo ? base + card.photo : '',
    signature: card.signature ? base + card.signature : '',
    logo: card.logo ? base + card.logo : '',
    scanner: card.scanner ? base + card.scanner : '',
    barcode: card.barcode ? base + card.barcode : ''
  });
});

// -----------------------------------------------------
//  DELETE CARD  (NEW API)
// -----------------------------------------------------
app.delete('/api/cards/:id', (req, res) => {
  const db = readDB();
  const index = db.findIndex(c => c.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ ok: false, error: "Card not found" });
  }

  const removed = db.splice(index, 1);
  writeDB(db);

  res.json({ ok: true, deleted: removed[0] });
});

// -----------------------------------------------------
//  START SERVER
// -----------------------------------------------------
app.listen(PORT, () => {
  console.log(`Aelia backend running on http://localhost:${PORT}`);
});
