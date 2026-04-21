// db.js – MySQL connection configuration
// Owned by: Savon

const mysql = require('mysql');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',       // ← update if your MySQL root password is different
  database: 'task_manager'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to MySQL (task_manager database)');
});

module.exports = connection;
