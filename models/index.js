const { sequelize } = require('../config/database');
const User = require('./User');
const EmailVerification = require('./EmailVerification');
const Complaint = require('./Complaint');
const PasswordReset = require('./PasswordReset');
const Feedback = require('./Feedback');
const Contact = require('./Contact');

// Define associations
User.hasMany(EmailVerification, { foreignKey: 'userId', as: 'verifications' });
EmailVerification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Complaint, { foreignKey: 'userId', as: 'complaints' });
Complaint.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(PasswordReset, { foreignKey: 'userId', as: 'passwordResets' });
PasswordReset.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Feedback, { foreignKey: 'userId', as: 'feedbacks' });
Feedback.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Contact, { foreignKey: 'userId', as: 'contacts' });
Contact.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Sync database (create tables if they don't exist)
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true }); // Use { force: true } to drop and recreate tables
    console.log('✅ Database tables synchronized successfully.');
  } catch (error) {
    console.error('❌ Error synchronizing database:', error.message);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  EmailVerification,
  Complaint,
  PasswordReset,
  Feedback,
  Contact,
  syncDatabase
};
