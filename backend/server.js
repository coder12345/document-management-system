//ENV stuff

require('dotenv').config();

const conString = process.env.DATABASE_URL;
const secret = process.env.JWT_SECRET;
const authenticateToken = require('./middleware/authMiddleware');

const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const app = express();

const pg = require('pg');
const bcrypt = require('bcrypt');

const client = new pg.Client({
  connectionString: conString,
  ssl: {
    rejectUnauthorized: false
  }
});
client.connect();
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, '../frontend')));


app.get('/register', (req, res) => { 
    res.sendFile(path.join(__dirname, '../frontend/pages/register.html'));
});
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/login.html'));
});
// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/login.html'));
});

// Dashboard route
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/dashboard.html'));
});

app.get('/api/dashboard', authenticateToken, (req, res) => {
    let username = req.user.username;

    client.query('SELECT * FROM users WHERE username = $1', [username], (err, result) => {
        if (err) {
            console.error('Error querying user:', err);
            res.status(500).json({ success: false, message: 'Error fetching user data' });
        } else if (result.rows.length === 0) {
            res.status(404).json({ success: false, message: 'User not found' });
        } else {
            let user = result.rows[0];
            let fname = user.fname;
            let lname = user.lname;
            let usertype = user.usertype;
            res.json({
                success: true,
                fname: fname,
                lname: lname,
                usertype: usertype
            });
        }
    });
});
//login route
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    console.log(username, password);

   client.query('SELECT * FROM users WHERE username = $1', [username], (err, result) => {
        if (err) { 
            console.error('Error querying user:', err);
            res.status(500).json({ success: false, message: 'Error logging in' });
        } else if (result.rows.length === 0) {
            res.status(401).json({ success: false, message: 'Invalid username or password' });
        } else {
            (async () => {
                console.log(result.rows);
                console.log(result.rows[0].passwordhash);
                const isMatch = bcrypt.compareSync(password, result.rows[0].passwordhash);
                if (isMatch) {
                    const token = jwt.sign({ username: result.rows[0].username, role: result.rows[0].usertype }, secret, { expiresIn: '1h' });
                    res.json({ success: true, message: 'Login successful', token: token });
                    
                } else {
                    res.status(401).json({ success: false, message: 'Invalid username or password' });
                }
            })();
        }
    });
});
// register route
app.post('/api/register', (req, res) => {
    const { username, password, usertype, fname, lname } = req.body;
    let hashedpassword = bcrypt.hashSync(password, 10);
    console.log(username, hashedpassword, fname, lname, usertype);

    client.query('INSERT INTO users (username, passwordhash, usertype, fname, lname) VALUES ($1, $2, $3, $4, $5)', [username, hashedpassword, usertype, fname, lname], (err, result) => {
        if (err) {
            console.error('Error registering user:', err);
            res.status(500).json({ success: false, message: 'Error registering user' });
        } else {
            res.json({ success: true, message: 'User registered successfully' });
        }

    });
});
app.listen(3000, () => {
  console.log('Server running on port 3000');
});
