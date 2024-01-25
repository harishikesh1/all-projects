const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs'); // Set EJS as the view engine
app.use(bodyParser.json());
app.use(express.static('./public'));

const storage = multer.diskStorage({
    destination: (req, file, callBack) => {
        callBack(null, './public/images/'); // Destination folder for profile images
    },
    filename: (req, file, callBack) => {
        callBack(null, 'profileImage-' + Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage: storage });

// Database connection setup
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'coachconnectr',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});


const isPasswordValid = (password) => {
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};

app.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!password || typeof password !== 'string' || !isPasswordValid(password)) {
            return res.status(400).json({ error: 'Invalid password. It must contain at least 8 characters, including an uppercase letter, a number, and a special character.' });
        }
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const connection = await pool.getConnection();
        try {
            const [results] = await connection.query('SELECT * FROM user_details WHERE email = ?', [email]);
            if (results.length > 0) {
                res.status(409).json({ error: 'Email already exists' });
            } else {
                await connection.query('INSERT INTO user_details (Email, Password) VALUES (?, ?)', [email, hashedPassword]);
                res.status(201).json({ message: 'User created successfully' });
            }
        } catch (error) {
            console.error('Error querying/inserting into database:', error);
            res.status(500).json({ error: 'Internal server error' });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error hashing password:', error);
        res.status(500).json({ error: error.message });
    }
});





app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const connection = await pool.getConnection();

        try {
            // Retrieve user information based on the provided email
            const [results] = await connection.query('SELECT * FROM user_details WHERE email = ?', [email]);

            if (results.length === 0) {
                return res.status(404).json({ error: 'Invalid credentials' });
            }

            // Compare the provided password with the hashed password from the database
            const user = results[0];
            const passwordMatch = await bcrypt.compare(password, user.Password);

            if (!passwordMatch) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Successful login
            res.status(200).json({ message: 'Login successful', user: { email: user.Email } });
        } catch (error) {
            console.error('Error querying database:', error);
            res.status(500).json({ error: 'Internal server error' });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error connecting to database:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/profileSetup', upload.single('profileImage'), async (req, res) => {
    if (!req.file) {
        console.log("No file upload");
        return res.status(400).json({ error: "No file uploaded" });
    } else {
        console.log(req.file.filename)
        var imgsrc = 'http://127.0.0.1:3000/images/' + req.file.filename
        var insertData = "INSERT INTO user_details(UserImg)VALUES(?)"
        pool.query(insertData, [imgsrc], (err, result) => {
            if (err) throw err
            console.log("file uploaded")
            res.status(200).json(imgsrc);
        })
    }
    const {
        FirstName,
        LastName,
        PhoneNumber,
        TextArea,
        Gender,
        DateOfBirth,
        Height,
        City,
        UtrRating,
        NtprRating,
        DrivingDistance,
        DesiredPartner,
        YourGame,
        PlayingStyle,
        Handed,
        
    } = req.body;

    try {
        const connection = await pool.getConnection();

        try {
            const profileImageData = req.file ? req.file.filename : null;
            await connection.query(
                `INSERT INTO user_details (
                    FirstName,
                    LastName,
                    PhoneNumber,
                    TextArea,
                    Gender,
                    DateOfBirth,
                    Height,
                    City,
                    UtrRating,
                    NtprRating,
                    DrivingDistance,
                    DesiredPartner,
                    YourGame,
                    PlayingStyle,
                    Handed,
                    UserImg
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    FirstName,
                    LastName,
                    PhoneNumber,
                    TextArea,
                    Gender,
                    DateOfBirth,
                    Height,
                    City,
                    UtrRating,
                    NtprRating,
                    DrivingDistance,
                    DesiredPartner,
                    YourGame,
                    PlayingStyle,
                    Handed,
                    profileImageData // Assuming a column named "UserImg" for image storage
                ]
            );

            res.status(200).json({ message: 'Profile information inserted successfully' });
        } catch (error) {
            console.error('Error inserting profile information:', error);
            res.status(500).json({ error: 'Internal server error' });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error connecting to database:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



app.get('/images', async (req, res) => {
    try {
        const connection = await pool.getConnection();

        try {
            const [results] = await connection.query('SELECT UserImg FROM user_details');
            console.log('Retrieved images:', results);
            res.render('images', { images: results });
        } catch (error) {
            console.error('Error querying database:', error);
            res.status(500).json({ error: 'Internal server error' });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error connecting to database:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});




app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});