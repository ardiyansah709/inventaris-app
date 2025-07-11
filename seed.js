const mongoose = require('mongoose');
const Item = require('./models/Item');

mongoose.connect('mongodb://localhost:27017/inventarisdb', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Data awal (isi sesuai keinginan)
const seedItems = [
  { name: 'Mouse Logitech', category: 'Elektronik', stock: 10, price: 120000 },
  { name: 'Kursi Kantor', category: 'Furniture', stock: 5, price: 450000 },
  { name: 'Meja Meeting', category: 'Furniture', stock: 2, price: 1250000 },
  { name: 'Kabel LAN', category: 'Aksesoris', stock: 15, price: 30000 },
  { name: 'Printer Canon', category: 'Elektronik', stock: 3, price: 950000 }
];

Item.insertMany(seedItems)
  .then(() => {
    console.log('Sukses tambah data!');
    mongoose.connection.close();
  })
  .catch(e => {
    console.log('Gagal:', e);
    mongoose.connection.close();
  });
