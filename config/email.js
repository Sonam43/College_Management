const nodemailer = require('nodemailer');

// Email configuration
const transporter = nodemailer.createTransport({
  service: process.env.MAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.MAIL_USER || '07230043.sherubtse@rub.edu.bt',
    pass: process.env.MAIL_PASS || 'laqq xrfd zblc srde'
  }
});

// Send verification email
const sendVerificationEmail = async (email, verificationToken, name) => {
  const verificationUrl = `http://localhost:5000/verify-email?token=${verificationToken}`;
  
  const mailOptions = {
    from: process.env.MAIL_FROM || (process.env.MAIL_USER || '07230043.sherubtse@rub.edu.bt'),
    to: email,
    subject: 'Verify Your Email - College Management System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 20px; text-align: center;">
          <h1>College Management System</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc;">
          <h2 style="color: #4f46e5;">Hello ${name}!</h2>
          <p>Thank you for signing up with College Management System. To complete your registration, please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${verificationUrl}" style="color: #4f46e5;">${verificationUrl}</a>
          </p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            This verification link will expire in 24 hours. If you didn't create an account, please ignore this email.
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
          <p>&copy; 2025 College Management System. All rights reserved.</p>
        </div>
      </div>
    `
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, name) => {
  const resetUrl = `http://localhost:5000/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.MAIL_FROM || (process.env.MAIL_USER || '07230043.sherubtse@rub.edu.bt'),
    to: email,
    subject: 'Reset Your Password - College Management System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 20px; text-align: center;">
          <h1>College Management System</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc;">
          <h2 style="color: #4f46e5;">Hello ${name || ''}</h2>
          <p>We received a request to reset your password. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${resetUrl}" style="color: #4f46e5;">${resetUrl}</a>
          </p>
          <p style="color: #6b7280; font-size: 14px;">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        </div>
        <div style="background: #f1f5f9; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
          <p>&copy; 2025 College Management System. All rights reserved.</p>
        </div>
      </div>
    `
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
