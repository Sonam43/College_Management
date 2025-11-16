const express = require("express");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const session = require("express-session");

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Database
const { sequelize, testConnection } = require("./config/database");
const { syncDatabase, User } = require("./models"); // make sure your models/index.js exports these

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "my_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// View engine
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
app.use("/admin", adminRoutes);

// Error handling (multer, file size, unexpected errors)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);

  if (err.message && err.message.includes("image files")) {
    return res
      .status(400)
      .render("redressal", {
        title: "Redressal",
        error: "Only image files are allowed (JPG, PNG, GIF, WEBP).",
      });
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res
      .status(413)
      .render("redressal", {
        title: "Redressal",
        error: "File too large. Max size is 5MB.",
      });
  }

  res.status(500).send("An unexpected error occurred. Please try again.");
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Test DB connection
    await testConnection();

    // Sync DB tables
    await syncDatabase();

    // Bootstrap admin user
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminEmail && adminPassword) {
      const [admin, created] = await User.findOrCreate({
        where: { email: adminEmail },
        defaults: {
          name: "Administrator",
          email: adminEmail,
          password: adminPassword,
          isVerified: true,
          role: "admin",
        },
      });

      if (!created) {
        await admin.update({
          role: "admin",
          isVerified: true,
          password: adminPassword,
        });
      }

      console.log(`👑 Admin ${created ? "created" : "updated"}: ${adminEmail}`);
    } else {
      console.log(
        `ℹ️ ADMIN_EMAIL/ADMIN_PASSWORD not set; skipping admin bootstrap`
      );
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log("📊 Database connected successfully");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
