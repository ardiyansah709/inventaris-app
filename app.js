require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const session = require('express-session');
const User = require('./models/User');
const Item = require('./models/Item');

const app = express();

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB Connection Error:", err));

// --- View Engine & Middleware ---
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// --- Session Config ---
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3 * 60 * 60 * 1000 } // 3 jam
}));

// --- Multer Config (upload image) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// --- Auth Middleware ---
function isAuthenticated(req, res, next) {
    if (req.session.isLogin) return next();
    res.redirect('/login');
}

// --- ROUTES ---

// Login Page
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

// Login Action
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
      const user = await User.findOne({ username, password });
      if(user) {
          req.session.isLogin = true;
          req.session.user = user;
          res.redirect('/');
      } else {
          res.render('login', { error: 'Username atau password salah!' });
      }
    } catch (err) {
      res.render('login', { error: 'Terjadi error pada server!' });
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

// Dashboard
app.get('/', isAuthenticated, async (req, res) => {
  const q = req.query.q || '';
  const filter = q ? { name: { $regex: q, $options: 'i' } } : {};
  try {
    const items = await Item.find(filter).sort({ updated: -1 });
    const kategori = await Item.distinct('category');
    const total = await Item.countDocuments();
    const totalStock = await Item.aggregate([{ $group: { _id: null, total: { $sum: "$stock" }}}]);
    res.render('index', {
      items, kategori, q, total,
      totalStock: totalStock[0] ? totalStock[0].total : 0,
      user: req.session.user
    });
  } catch (err) {
    res.send("Terjadi error pada server.");
  }
});

// Form Tambah Barang
app.get('/add', isAuthenticated, (req, res) => res.render('add'));

// Proses Tambah Barang
app.post('/add', isAuthenticated, upload.single('photo'), async (req, res) => {
  const { name, category, stock, price, desc } = req.body;
  const photo = req.file ? req.file.filename : '';
  try {
    await Item.create({ name, category, stock, price, desc, photo });
    res.redirect('/');
  } catch (err) {
    res.send("Gagal menambah barang.");
  }
});

// Form Edit Barang
app.get('/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.redirect('/');
    res.render('edit', { item });
  } catch (err) {
    res.redirect('/');
  }
});

// Proses Edit Barang
app.post('/edit/:id', isAuthenticated, upload.single('photo'), async (req, res) => {
  const { name, category, stock, price, desc } = req.body;
  const updateData = { name, category, stock, price, desc, updated: new Date() };
  if (req.file) updateData.photo = req.file.filename;
  try {
    await Item.findByIdAndUpdate(req.params.id, updateData);
    res.redirect('/');
  } catch (err) {
    res.send("Gagal update data.");
  }
});

// Hapus Barang
app.get('/delete/:id', isAuthenticated, async (req, res) => {
  try {
    await Item.findByIdAndDelete(req.params.id);
    res.redirect('/');
  } catch (err) {
    res.send("Gagal menghapus data.");
  }
});
app.get('/statistik', isAuthenticated, async (req, res) => {
  const items = await Item.find();
  const totalBarang = items.length;
  const totalStok = items.reduce((sum, i) => sum + (i.stock || 0), 0);
  const totalNilai = items.reduce((sum, i) => sum + (i.price || 0) * (i.stock || 0), 0);
  // Hitung per kategori
  const kategoriStat = {};
  items.forEach(i => {
    if (!kategoriStat[i.category]) kategoriStat[i.category] = 0;
    kategoriStat[i.category] += (i.stock || 0);
  });
  res.render('statistik', {
    totalBarang,
    totalStok,
    totalNilai,
    kategoriStat
  });
});



// Pengaturan
app.get('/pengaturan', isAuthenticated, (req, res) => {
    res.render('pengaturan', { user: req.session.user, msg: null, err: null });
});

app.post('/pengaturan', isAuthenticated, async (req, res) => {
    const { nama, password } = req.body;
    const update = { nama };
    if (password) update.password = password; // Untuk produksi, hash password!
    try {
        await User.findByIdAndUpdate(req.session.user._id, update);
        req.session.user = await User.findById(req.session.user._id); // update session user
        res.render('pengaturan', { user: req.session.user, msg: 'Profil berhasil diupdate!', err: null });
    } catch (e) {
        res.render('pengaturan', { user: req.session.user, msg: null, err: 'Gagal update profil.' });
    }
});


// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
