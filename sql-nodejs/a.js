const express = require('express');
const mysql = require('mysql');
const path = require('path');
const app = express();
const port = 3000;

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'nodejs',
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', function (req, res) {
  const indexPath = path.join(__dirname, 'index.html');
  res.sendFile(indexPath);
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL: ', err);
  } else {
    console.log('Connected to MySQL');
  }
});

app.post('/submit', (req, res) => {
  const formData = req.body;
  console.log('Request Body:', formData);

  connection.beginTransaction((err) => {
    if (err) {
      console.error('Error starting transaction:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if ('username' in formData) {
      const { name, email, password, age, gender, username } = formData;
      const userSql = 'INSERT INTO user_details (name, email, password, age, gender, username) VALUES (?, ?, ?, ?, ?, ?)';
      
      connection.query(userSql, [name, email, password, age, gender, username], (err, userResult) => {
        if (err) {
          console.error('Error creating user record: ', err);
          return connection.rollback(() => {
            res.status(500).json({ error: 'Internal Server Error' });
          });
        }

        console.log("userResult.insertId ----------- ",userResult.insertId);

        const { fatherName, motherName, fatherAge, motherAge } = formData;
        const parentSql = 'INSERT INTO parent_details (user_id, fatherName, motherName, fatherAge, motherAge) VALUES (?, ?, ?, ?, ?)';
        
        connection.query(parentSql, [userResult.insertId, fatherName, motherName, fatherAge, motherAge], (err, parentResult) => {

          console.log("parentResult ------ ",parentResult);
          if (err) {
            console.log("error",err);
            console.error('Error creating parent record: ', err);
            return connection.rollback(() => {
              res.status(500).json({ error: 'Internal Server Error' });
            });
          }
          console.log("userResult.insertId ----------- ",userResult.insertId);

    

          const { houseNumber, pincode, city, state, country } = formData;
          const addressSql = 'INSERT INTO address_details (user_id, houseNumber, pincode, city, state, country) VALUES (?, ?, ?, ?, ?, ?)';
          
          connection.query(addressSql, [userResult.insertId, houseNumber, pincode, city, state, country], (err, addressResult) => {

            console.log("addressResult =--------- ",addressResult);
            if (err) {
              console.log("errsdsdor",err);

              console.error('Error creating address record: ', err);
              return connection.rollback(() => {
                res.status(500).json({ error: 'Internal Server Error' });
              });
            }

            connection.commit((err) => {
              if (err) {
                console.error('Error committing transaction:', err);
                return connection.rollback(() => {
                  res.status(500).json({ error: 'Internal Server Error' });
                });
              }

              res.status(200).json({ message: 'All records created successfully' });
            });
          });
        });
      });
    } else {
      connection.rollback(() => {
        res.status(400).json({ error: 'Unknown form type' });
      });
    }
  });
});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
