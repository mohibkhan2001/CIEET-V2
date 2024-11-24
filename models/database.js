const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',         // Default XAMPP MySQL username
    password: '',         // Default XAMPP MySQL password is empty
    database: 'exam_app'  // Name of your database
});

connection.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to MySQL database!');
});

module.exports = connection;
