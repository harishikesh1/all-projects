const express = require('express');
const mysql = require('mysql');
const path = require('path');
const bodyParser = require('body-parser');
const ejs = require('ejs');

const app = express();
const port = 3000;

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'nodejs',
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.render('index');
});


 

app.get('/users', (req, res) => {
  // Execute the SQL query
  connection.query('SELECT * FROM user_details', (err, results) => {
    if (err) {
      console.error('Error executing SQL query:', err);
      res.status(500).send('Internal Server Error');
    } else {
      // Render the 'users' view and pass the query results to it
      res.render('users', {results });
    }
  });
});

app.get('/delete/:id', (req, res) => {
  const userId = req.params.id;

  // SQL query to delete a row based on the id
  const deleteQuery = `

DELETE user_details, parent_details, address_details
FROM user_details
INNER JOIN parent_details ON user_details.id = parent_details.user_id
INNER JOIN address_details ON user_details.id = address_details.user_id
WHERE user_details.id =?

  
  
  
  
  `;

  connection.query(deleteQuery, [userId], (error, results, fields) => {
      if (error) {
          console.error(error);
          res.status(500).send('Error deleting user.');
      } 
      else {
          res.redirect('/users'); // Redirect to the joins page after deletion
      }
  });
});


connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
  } else {
    console.log('Connected to MySQL');
  }
});

app.post('/submit', (req, res) => {
  const formData = req.body;

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
          console.error('Error creating user record:', err);
          return connection.rollback(() => {
            res.status(500).json({ error: 'Internal Server Error' });
          });
        }

        const userId = userResult.insertId;

        const { fatherName, motherName, fatherAge, motherAge } = formData;
        const parentSql = 'INSERT INTO parent_details (user_id, fatherName, motherName, fatherAge, motherAge) VALUES (?, ?, ?, ?, ?)';

        connection.query(parentSql, [userId, fatherName, motherName, fatherAge, motherAge], (err, parentResult) => {
          if (err) {
            console.error('Error creating parent record:', err);
            return connection.rollback(() => {
              res.status(500).json({ error: 'Internal Server Error' });
            });
          }

          const { houseNumber, pincode, city, state, country } = formData;
          const addressSql = 'INSERT INTO address_details (user_id, houseNumber, pincode, city, state, country) VALUES (?, ?, ?, ?, ?, ?)';

          connection.query(addressSql, [userId, houseNumber, pincode, city, state, country], (err, addressResult) => {
            if (err) {
              console.error('Error creating address record:', err);
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

app.get('/joins', (req, res) => {
  const sqlQuery = `
      SELECT user_details.id, user_details.name, parent_details.fatherName, parent_details.motherName, address_details.houseNumber, address_details.city
      FROM user_details
      INNER JOIN parent_details ON user_details.id = parent_details.user_id
      INNER JOIN address_details ON user_details.id = address_details.user_id;
  `;

  connection.query(sqlQuery, (error, results, fields) => {
    if (error) throw error;

    res.render('joins', { results });
  });
});

app.get('/update/:id', (req, res) => {
  const userId = req.params.id;

   
  const selectQuery = `
    SELECT user_details.name, parent_details.fatherName, parent_details.motherName,
           address_details.houseNumber, address_details.city
    FROM user_details
    INNER JOIN parent_details ON user_details.id = parent_details.user_id
    INNER JOIN address_details ON user_details.id = address_details.user_id
    WHERE user_details.id = ?;
  `;

  connection.query(selectQuery, [userId], (error, results, fields) => {
    if (error) throw error;

    // Render the 'update' view with pre-filled data
    res.render('update', { userId, userDetails: results[0] });
    
  });
});

 
app.post('/update/:id', async (req, res) => {
  const userId = req.params.id;
  const { name, fatherName, motherName, houseNumber, city } = req.body;

  try {
    // Update user details
    await executeQuery("UPDATE user_details SET name = ? WHERE id = ?", [name, userId]);

    // Update parent details
    await executeQuery("UPDATE parent_details SET fatherName = ?, motherName = ? WHERE user_id = ?", [fatherName, motherName, userId]);

    // Update address details
    await executeQuery("UPDATE address_details SET houseNumber = ?, city = ? WHERE user_id = ?", [houseNumber, city, userId]);

    res.redirect('/joins');
  } catch (error) {
    console.error('Error updating details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Helper function to execute a query with a promise
function executeQuery(sql, values) {
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (error, results, fields) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
