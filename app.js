const express = require("express");
const path = require("path");
require('dotenv').config({ path: path.join(__dirname, '.env') });
const session = require('express-session');

const PORT = process.env.PORT || 5000;
const app = express();

// Import database
const { testConnection } = require('./config/database');
const { syncDatabase, User } = require('./models');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: 'my_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Setup EJS as view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Expose user to templates for conditional nav items
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

// Routes
const mainRoutes = require("./routes/mainRoutes");
const adminRoutes = require("./routes/adminRoutes");
app.use("/", mainRoutes);
app.use('/admin', adminRoutes);

// Basic error handler to prevent crashes (e.g., multer errors)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  if (err.message && err.message.includes('image files')) {
    return res.status(400).render('redressal', { title: 'Redressal', error: 'Only image files are allowed (JPG, PNG, GIF, WEBP).' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).render('redressal', { title: 'Redressal', error: 'File too large. Max size is 5MB.' });
  }
  res.status(500).send('An unexpected error occurred. Please try again.');
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Sync database tables
    await syncDatabase();
    // Bootstrap admin user from ENV if provided
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminEmail && adminPassword) {
      const [admin, created] = await User.findOrCreate({
        where: { email: adminEmail },
        defaults: { name: 'Administrator', email: adminEmail, password: adminPassword, isVerified: true, role: 'admin' }
      });
      if (!created) {
        await admin.update({ role: 'admin', isVerified: true, password: adminPassword });
      }
      console.log(`👑 Admin ${created ? 'created' : 'updated'}: ${adminEmail}`);
    } else {
      console.log(`ℹ️ ADMIN_EMAIL/ADMIN_PASSWORD not set; skipping admin bootstrap (ADMIN_EMAIL read: ${process.env.ADMIN_EMAIL || 'N/A'})`);
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Database connected successfully`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
