// config/database.js
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: "postgres",
  dialectOptions: {
    ssl: { rejectUnauthorized: false } // required for some cloud DBs like Neon
  }
});

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected ✅");
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error.message);
    throw error;
  }
};

module.exports = { sequelize, testConnection };
