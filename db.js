// db.js – MySQL connection using mysql2 (compatible with MySQL 8+)
// Owned by: Savon

const mysql = require('mysql2');

const connection = mysql.createConnection({
  host:     'localhost',
  user:     'root',
  password: 'whentheycryss5',
  database: 'task_manager'
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Error connecting to MySQL:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to MySQL (task_manager database)');
});

module.exports = connection;
