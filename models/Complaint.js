const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Complaint = sequelize.define('Complaint', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: { isEmail: true }
  },
  category: {
    type: DataTypes.ENUM('classroom', 'hostels', 'library', 'labs', 'sports', 'others'),
    allowNull: false
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  subject: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  attachmentUrl: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('open', 'in_progress', 'resolved'),
    defaultValue: 'open'
  }
}, {
  tableName: 'complaints',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = Complaint;


