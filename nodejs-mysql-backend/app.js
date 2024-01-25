const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const path = require('path');
const {error} = require('console');

const app = express();
const port = 3001;

// MySQL connection configuration
const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'nodejs'
});

// Middleware to handle URL-encoded data and JSON data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve the HTML form on a GET request to '/form'
app.get('/form', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle form submissions via POST request to '/submit'
app.post('/submit', (req, res) => {
    // Check if req.body is defined before destructuring
    if (!req.body) {
        console.error('Error: Request body is undefined');
        return res.status(400).send('Bad request');
    }
console.log(req.body);
    const { name, email, gender, skills, comments } = req.body;

    // If skills is an array, join it; otherwise, use the original value
    const formattedSkills = Array.isArray(skills) ? skills.join(', ') : skills;

    // Insert data into MySQL using a placeholder to prevent SQL injection
    const sql = 'INSERT INTO users (name, email, gender, skills, comments) VALUES (?, ?, ?, ?, ?)';
    pool.query(sql, [name, email, gender, formattedSkills, comments], (err, result) => {
       if (err) {
            console.error('Error inserting into MySQL:', err.message);
            res.status(500).send(`Error submitting the form: ${err.message}`);
            return;
        }
        console.log('Form submitted successfully');
        res.status(200).send('Form submitted successfully');
    });
});

// Start the Express server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
