const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
 
const app = express();
const port = 3002;
 
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
 
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});
 

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Admin@1234',
    database: 'shop'
});
 
db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('Please check your MySQL username and password');
        } else if (err.code === 'ECONNREFUSED') {
            console.error('MySQL server is not running');
        }
        return;
    }
    console.log('Connected to MySQL database');
});
 
db.on('error', (err) => {
    console.error('MySQL connection error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        handleDisconnect();
    } else {
        throw err;
    }
});
 
function handleDisconnect() {
    db.connect((err) => {
        if (err) {
            console.error('Error reconnecting:', err);
            setTimeout(handleDisconnect, 2000);
        }
    });
}
 
db.query(`
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL
    )
`);
 
db.query(`
    CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        image_data LONGBLOB NOT NULL,
        image_name VARCHAR(255) NOT NULL
    )
`);
 
db.query(`
    CREATE TABLE IF NOT EXISTS testimonials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        author VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`);
 
// Routes
app.post('/views/signup', async (req, res) => {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
 
    db.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hashedPassword],
        (err, result) => {
            if (err) {
                res.status(500).json({ error: 'Error creating user' });
                return;
            }
            res.json({ message: 'User created successfully' });
        });
});
 
app.post('/views/login', async (req, res) => {
    const { email, password } = req.body;
 
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err || results.length === 0) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
 
        const match = await bcrypt.compare(password, results[0].password);
        if (!match) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
 
        res.json({ message: 'Login successful' });
    });
});
 
app.get('/views/products', (req, res) => {
    db.query('SELECT * FROM products', (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Error fetching products' });
            return;
        }
        res.json(results);
    });
});
 
app.post('/views/testimonials', (req, res) => {
    const { author, content } = req.body;
   
    db.query('INSERT INTO testimonials (author, content) VALUES (?, ?)',
        [author, content],
        (err, result) => {
            if (err) {
                res.status(500).json({ error: 'Error saving testimonial' });
                return;
            }
            res.json({ message: 'Testimonial added successfully' });
        });
});
 
app.get('/views/testimonials', (req, res) => {
    db.query('SELECT * FROM testimonials ORDER BY created_at DESC', (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Error fetching testimonials' });
            return;
        }
        res.json(results);
    });
});
 
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});