const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    await User.deleteMany({}); 
    const admin = new User({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin123', 
      role: 'admin'
    });
    await admin.save();
    console.log('✅ Admin created');
    process.exit();
  })
  .catch(err => console.error(err));
