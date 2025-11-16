const express = require("express");
const router = express.Router();
const mainController = require('../controllers/mainController');

// Landing page
router.get("/", (req, res) => {
  res.render("landing");
});

// Auth pages
router.get("/login", (req, res) => {
  res.render("login", { 
    message: req.query.message,
    error: req.query.error 
  });
});

router.get("/signup", (req, res) => {
  res.render("signup", { 
    error: req.query.error 
  });
});

// Informational pages
router.get('/about', mainController.about);
router.get('/redressal', mainController.redressal);
router.get('/contact', mainController.contact);
router.get('/help', mainController.help);
router.get('/feedback', mainController.feedback);

// Auth actions
router.post('/login', mainController.login);
router.post('/signup', mainController.signup);

// Home page (after login)
router.get('/home', mainController.home);

// Email verification
router.get('/verify-email', mainController.verifyEmail);

// Password reset
router.get('/forgot-password', mainController.forgotPasswordPage);
router.post('/forgot-password', mainController.forgotPassword);
router.get('/reset-password', mainController.resetPasswordPage);
router.post('/reset-password', mainController.resetPassword);

// Logout
router.get('/logout', mainController.logout);

// Redressal submit with image upload
router.post('/redressal', mainController.uploadRedressalAttachment, mainController.submitRedressal);

// Feedback submit
router.post('/feedback', mainController.submitFeedback);

// Contact submit
router.post('/contact', mainController.submitContact);

module.exports = router;
