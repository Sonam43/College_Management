const { sendVerificationEmail } = require('../config/email');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { User, EmailVerification, Complaint, PasswordReset, Feedback, Contact } = require('../models');
const { sendPasswordResetEmail } = require('../config/email');

// Basic controller stubs to prevent route errors
exports.home = async (req, res) => {
  // Check if user is logged in
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  try {
    const user = req.session.user;
    
    // Get user's recent activities if needed
    const userComplaints = await Complaint.findAll({
      where: { userId: user.id },
      limit: 5,
      order: [['createdAt', 'DESC']]
    });
    
    res.render("home", { 
      title: "Dashboard - College Management System",
      currentUser: user,
      user: user,
      recentComplaints: userComplaints
    });
  } catch (error) {
    console.error('Error loading home page:', error.message);
    res.render("home", { 
      title: "Dashboard - College Management System",
      currentUser: req.session.user,
      user: req.session.user
    });
  }
};

exports.about = (req, res) => {
  res.render("about", { 
    title: "About Us",
    currentUser: req.session.user || null
  });
};

exports.redressal = (req, res) => {
  res.render("redressal", { 
    title: "Redressal",
    currentUser: req.session.user || null,
    message: req.query.message,
    error: req.query.error
  });
};

exports.contact = (req, res) => {
  res.render("contact", { 
    title: "Contact Us",
    currentUser: req.session.user || null,
    message: req.query.message,
    error: req.query.error
  });
};

exports.help = (req, res) => {
  res.render("help", { title: "Help" });
};

exports.feedback = (req, res) => {
  res.render('feedback', { 
    title: 'Feedback',
    currentUser: req.session.user || null,
    message: req.query.message,
    error: req.query.error
  });
};

// File upload configuration for redressal attachments
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || '';
    cb(null, `redressal_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  }
});

// Expose middleware for route to use
exports.uploadRedressalAttachment = upload.single('attachment');

// Handle redressal submission
exports.submitRedressal = (req, res) => {
  // At this point, upload middleware has run if attached in route
  const { name, email, category, location, subject, description } = req.body;

  if (!name || !email || !category || !location || !subject || !description) {
    return res.status(400).render('redressal', { 
      title: 'Redressal', 
      currentUser: req.session.user || null,
      error: 'Please fill all required fields.' 
    });
  }

  // Build a simple payload; in future, persist to DB
  const attachmentPath = req.file ? `/uploads/${path.basename(req.file.path)}` : null;

  // Persist complaint
  Complaint.create({
    userId: req.session.user ? req.session.user.id : null,
    name,
    email,
    category,
    location,
    subject,
    description,
    attachmentUrl: attachmentPath
  }).then(() => {
    return res.status(200).render('redressal', {
      title: 'Redressal',
      currentUser: req.session.user || null,
      message: 'Your complaint has been submitted successfully.',
      attachmentPath
    });
  }).catch((err) => {
    console.error('Failed to save complaint:', err.message);
    return res.status(500).render('redressal', { 
      title: 'Redressal', 
      currentUser: req.session.user || null,
      error: 'Failed to save complaint. Please try again.' 
    });
  });
};

exports.submitFeedback = async (req, res) => {
  const { name, email, rating, comments } = req.body;
  if (!name || !email || !rating || !comments) {
    return res.status(400).render('feedback', { 
      title: 'Feedback', 
      currentUser: req.session.user || null,
      error: 'Please fill all required fields.' 
    });
  }
  
  try {
    await Feedback.create({
      userId: req.session.user ? req.session.user.id : null,
      name,
      email,
      rating: parseInt(rating),
      comments
    });
    return res.status(200).render('feedback', { 
      title: 'Feedback', 
      currentUser: req.session.user || null,
      message: 'Thank you for your feedback! We appreciate your input.' 
    });
  } catch (error) {
    console.error('Failed to save feedback:', error.message);
    return res.status(500).render('feedback', { 
      title: 'Feedback', 
      currentUser: req.session.user || null,
      error: 'Failed to submit feedback. Please try again.' 
    });
  }
};

exports.submitContact = async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message) {
    return res.status(400).render('contact', { 
      title: 'Contact Us', 
      currentUser: req.session.user || null,
      error: 'Please fill all required fields.' 
    });
  }
  
  try {
    await Contact.create({
      userId: req.session.user ? req.session.user.id : null,
      name,
      email,
      subject,
      message
    });
    return res.status(200).render('contact', { 
      title: 'Contact Us', 
      currentUser: req.session.user || null,
      message: 'Your message has been sent successfully. We will get back to you within 1-2 business days. Thank you!' 
    });
  } catch (error) {
    console.error('Failed to save contact message:', error.message);
    return res.status(500).render('contact', { 
      title: 'Contact Us', 
      currentUser: req.session.user || null,
      error: 'Failed to send message. Please try again.' 
    });
  }
};

// Auth handlers
exports.login = async (req, res) => {
  const { email, password, role } = req.body;
  
  if (!email || !password) {
    return res.redirect('/login?error=Please fill all fields');
  }

  try {
    // Global admin bypass using ENV (works even if role not selected)
    const adminEmailEnv = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const adminPassEnv = (process.env.ADMIN_PASSWORD || '').trim();
    const inputEmail = (email || '').trim().toLowerCase();
    const inputPassword = (password || '').trim();

    if (adminEmailEnv && adminPassEnv && inputEmail === adminEmailEnv && inputPassword === adminPassEnv) {
      let adminUser = await User.findOne({ where: { email: adminEmailEnv } });
      if (!adminUser) {
        adminUser = await User.create({ name: 'Administrator', email: adminEmailEnv, password: adminPassEnv, role: 'admin', isVerified: true });
      } else {
        const updates = {};
        if (adminUser.role !== 'admin') updates.role = 'admin';
        if (!adminUser.isVerified) updates.isVerified = true;
        if (Object.keys(updates).length) await adminUser.update(updates);
      }
      req.session.user = { id: adminUser.id, name: adminUser.name, email: adminUser.email, role: 'admin' };
      return res.redirect('/admin');
    }
    // If admin role selected, validate against ENV and bypass verification
    if (role === 'admin') {

      // Accept if password matches ENV, and email matches ENV or a common alias; if ENV email missing, still allow using provided email
      const emailMatches = !adminEmailEnv || inputEmail === adminEmailEnv || inputEmail === 'admin' || inputEmail === 'admin@123' || inputEmail === 'admin@123.com' || inputEmail === 'admin@gmail.com';
      if (adminPassEnv && inputPassword === adminPassEnv && emailMatches) {
        const effectiveEmail = adminEmailEnv || (inputEmail || 'admin@system.local');
        let user = await User.findOne({ where: { email: effectiveEmail } });
        if (!user) {
          user = await User.create({ name: 'Administrator', email: effectiveEmail, password: adminPassEnv, role: 'admin', isVerified: true });
        } else {
          const updates = {};
          if (user.role !== 'admin') updates.role = 'admin';
          if (!user.isVerified) updates.isVerified = true;
          if (Object.keys(updates).length) {
            await user.update(updates);
          }
        }
        req.session.user = { id: user.id, name: user.name, email: user.email, role: 'admin' };
        return res.redirect('/admin');
      }
      return res.redirect('/login?error=Invalid admin credentials');
    }

    // Find user in database for normal user login
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      // Auto-bootstrap admin on first login attempt using ENV creds
      if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
        const admin = await User.create({
          name: 'Administrator',
          email,
          password,
          isVerified: true,
          role: 'admin'
        });
        req.session.user = {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role
        };
        return res.redirect('/home');
      }
      return res.redirect('/login?error=User not found. Please sign up first.');
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.redirect('/login?error=Please verify your email before logging in. Check your inbox for the verification link.');
    }

    // Verify password (in production, use bcrypt.compare)
    if (user.password !== password) {
      return res.redirect('/login?error=Invalid password');
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    // Create user session
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    return res.redirect('/home');
  } catch (error) {
    console.error('Login error:', error);
    return res.redirect('/login?error=An error occurred. Please try again.');
  }
};

exports.signup = async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
  
  if (!name || !email || !password || !confirmPassword) {
    return res.redirect('/signup?error=Please fill all fields');
  }

  if (password !== confirmPassword) {
    return res.redirect('/signup?error=Passwords do not match');
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.redirect('/signup?error=User with this email already exists');
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password, // In production, hash with bcrypt
      isVerified: false
    });

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store verification token in database
    await EmailVerification.create({
      userId: user.id,
      token: verificationToken,
      expiresAt
    });

    // Send verification email
    const emailResult = await sendVerificationEmail(email, verificationToken, name);
    if (emailResult.success) {
      return res.redirect('/login?message=Account created! Please check your email and click the verification link to complete registration.');
    } else {
      return res.redirect('/signup?error=Failed to send verification email. Please try again.');
    }
  } catch (error) {
    console.error('Signup error:', error);
    return res.redirect('/signup?error=An error occurred. Please try again.');
  }
};

// Email verification handler
exports.verifyEmail = async (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.render('verify-email', { 
      verified: false, 
      message: 'Invalid verification link.' 
    });
  }

  try {
    // Find verification token in database
    const verification = await EmailVerification.findOne({
      where: { token },
      include: [{ model: User, as: 'user' }]
    });

    if (!verification) {
      return res.render('verify-email', { 
        verified: false, 
        message: 'Invalid verification link.' 
      });
    }

    // Check if token is expired
    if (new Date() > verification.expiresAt) {
      return res.render('verify-email', { 
        verified: false, 
        message: 'Verification link has expired. Please sign up again.' 
      });
    }

    // Check if token is already used
    if (verification.isUsed) {
      return res.render('verify-email', { 
        verified: false, 
        message: 'This verification link has already been used.' 
      });
    }

    // Mark verification as used
    await verification.update({ isUsed: true });

    // Mark user as verified
    await verification.user.update({ isVerified: true });

    return res.render('verify-email', { 
      verified: true,
      message: 'Your email has been verified successfully!' 
    });
  } catch (error) {
    console.error('Verification error:', error);
    return res.render('verify-email', { 
      verified: false, 
      message: 'An error occurred during verification. Please try again.' 
    });
  }
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    }
    res.redirect('/');
  });
};

// Forgot Password - render page
exports.forgotPasswordPage = (req, res) => {
  res.render('forgot-password', { message: req.query.message, error: req.query.error });
};

// Forgot Password - handle submit
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.redirect('/forgot-password?error=Please enter your email');
  }
  try {
    const user = await User.findOne({ where: { email } });
    // Always respond the same to avoid disclosure
    if (!user) {
      return res.redirect('/forgot-password?message=If that email exists, we sent a reset link.');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await PasswordReset.create({ userId: user.id, token, expiresAt });
    await sendPasswordResetEmail(user.email, token, user.name);

    return res.redirect('/forgot-password?message=If that email exists, we sent a reset link.');
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.redirect('/forgot-password?error=Something went wrong. Try again.');
  }
};

// Reset Password - render page
exports.resetPasswordPage = (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.render('reset-password', { token: null, error: 'Invalid reset link', message: null });
  }
  return res.render('reset-password', { token, error: null, message: null });
};

// Reset Password - handle submit
exports.resetPassword = async (req, res) => {
  const { token, password, confirmPassword } = req.body;
  if (!token) {
    return res.render('reset-password', { token: null, error: 'Missing token', message: null });
  }
  if (!password || !confirmPassword) {
    return res.render('reset-password', { token, error: 'Please fill all fields', message: null });
  }
  if (password !== confirmPassword) {
    return res.render('reset-password', { token, error: 'Passwords do not match', message: null });
  }
  try {
    const pr = await PasswordReset.findOne({ where: { token }, include: [{ model: User, as: 'user' }] });
    if (!pr) {
      return res.render('reset-password', { token: null, error: 'Invalid reset token', message: null });
    }
    if (pr.isUsed || new Date() > pr.expiresAt) {
      return res.render('reset-password', { token: null, error: 'Reset link expired or used', message: null });
    }

    // Update user password (plain text as current system; recommend bcrypt in future)
    await pr.user.update({ password });
    await pr.update({ isUsed: true });

    return res.render('reset-password', { token: null, error: null, message: 'Your password has been reset. You may now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.render('reset-password', { token, error: 'Something went wrong. Try again.', message: null });
  }
};
   