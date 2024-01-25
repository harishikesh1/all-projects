const express = require('express');
const mysql = require('mysql');
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');
const ejs = require('ejs');

const app = express();
const port = 3000;
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
 

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'nodejs',
});


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images'); // Set the destination folder for uploaded files
  },
  filename: function (req, file, cb) {
    // Set the filename to be unique (you can use a library like uuid)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });




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

const fs = require('fs');

app.get('/delete/:id', (req, res) => {
  const userId = req.params.id;

  // Fetch the image path before deleting the user details
  const selectImageQuery = 'SELECT userimg FROM user_details WHERE id = ?';

  connection.query(selectImageQuery, [userId], (selectImageError, selectImageResults) => {
    if (selectImageError) {
      console.error('Error fetching image path:', selectImageError);
      return res.status(500).send('Internal Server Error');
    }

    let imagePath = selectImageResults[0] ? selectImageResults[0].userimg : null;
    // imagePath=`public/${imagePath}`
    // SQL query to delete a row based on the id
    const deleteQuery = `
      DELETE user_details, parent_details, address_details
      FROM user_details
      INNER JOIN parent_details ON user_details.id = parent_details.user_id
      INNER JOIN address_details ON user_details.id = address_details.user_id
      WHERE user_details.id = ?;
    `;

    connection.query(deleteQuery, [userId], (error, results, fields) => {
      if (error) {
        console.error(error);
        res.status(500).send('Error deleting user.');
      } else {
        // Delete the image file from the folder
        if (imagePath) {
          fs.unlink(path.join(__dirname, 'public', imagePath.replace('http://127.0.0.1:3000', '')), (unlinkError) => {
            if (unlinkError) {
              console.error('Error deleting image file:', unlinkError);
            }
            console.log('Image file deleted successfully');
          });
        }

        res.redirect('/joins'); // Redirect to the joins page after deletion
      }
    });
  });
});



connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
  } else {
    console.log('Connected to MySQL');
  }
});

app.post('/submit', upload.single('userimg'), (req, res) => {
  const formData = req.body;
  let imagePath = req.file ? req.file.path : null;
  if (imagePath!=null) {
    
    imagePath ='http://127.0.0.1:3000/images/' + req.file.filename;
  }

  // console.log('Request Body:', req);
  // console.log('Request File Path:', req.file.path);

  connection.beginTransaction((err) => {
    if (err) {
      console.error('Error starting transaction:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if ('username' in formData) {
      const { name, email, password, age, gender, username } = formData;
      const userSql = 'INSERT INTO user_details (name, email, password, age, gender, username,userimg) VALUES (?, ?, ?, ?, ?, ?,?)';

      connection.query(userSql, [name, email, password, age, gender, username, imagePath], (err, userResult) => {
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
      SELECT user_details.id,user_details.userimg, user_details.name, parent_details.fatherName, parent_details.motherName, address_details.houseNumber, address_details.city
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
    SELECT user_details.name, user_details.userimg, parent_details.fatherName, parent_details.motherName,
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

 
app.post('/update/:id', upload.single('newUserImg'), async (req, res) => {
  const userId = req.params.id;
  const { name, fatherName, motherName, houseNumber, city } = req.body;
  let newUserImgPath = req.file ? req.file.path : null;
  if (newUserImgPath!=null) {
    newUserImgPath=
    'http://127.0.0.1:3000/images/' + req.file.filename;
  }
  // console.log('Request Body:', req);
  // console.log('Request File:', req.file);
   // Check this log

  try {
    // Fetch existing user details
    const existingUserImgQuery = 'SELECT userimg FROM user_details WHERE id = ?';
    const [existingUserImgResult] = await executeQuery(existingUserImgQuery, [userId]);
    const existingUserImgPath = existingUserImgResult ? existingUserImgResult.userimg : null;

    // Update user details including the new image path only if a new image is provided
    const updateUserQuery = 'UPDATE user_details SET name = ?, userimg = ? WHERE id = ?';
    const updateValues = [name, newUserImgPath || existingUserImgPath, userId];
    await executeQuery(updateUserQuery, updateValues);

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


















// const { log } = require('console');
// const express = require('express');
// const mysql = require('mysql');
// const path = require('path');
// const multer = require('multer');
// const bodyParser = require('body-parser');
// const app = express();
// const port = 3000;

// app.use(express.static("./public"))
// const storage = multer.diskStorage({
//   destination: (req, file, callBack) => {
//       callBack(null, './public/images/');  
//   },
//   filename: (req, file, callBack) => {
//       callBack(null, 'profileImage-' + Date.now() + path.extname(file.originalname));
//   },
// });

// const upload = multer({ storage: storage });

// const connection = mysql.createConnection({
//   host: 'localhost',
//   user: 'root',
//   password: '',
//   database: 'nodejs',
// });
// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());
 
// app.use(bodyParser.urlencoded({ extended: true }));

// app.use(express.urlencoded({ extended: true }));
// app.use(express.json()); 
// app.get('/', function (req, res) {
//   const indexPath = path.join(__dirname, 'index.html');
//   res.sendFile(indexPath);
// });



// connection.connect((err) => {
//   if (err) {
//     console.error('Error connecting to MySQL: ', err);
//   } else {
//     console.log('Connected to MySQL');
//   }
// });

// app.post('/submit', upload.single('userimg'), async (req, res) => {
//   const formData = req.body;
//   // console.log('Request Body:', formData);

//   console.log(req.file.filename);
//   var imgsrc = 'http://127.0.0.1:3000/images/' + req.file.filename;

//   connection.beginTransaction((err) => {
//     if (err) {
//       console.error('Error starting transaction:', err);
//       return res.status(500).json({ error: 'Internal Server Error' });
//     }

//     if ('username' in formData) {
//       const { name, email, password, age, gender, username } = formData;
//       const userSql = 'INSERT INTO user_details (name, email, password, age, gender, username, userimg) VALUES (?, ?, ?, ?, ?, ?, ?)';

//       console.log(imgsrc);
//       connection.query(userSql, [name, email, password, age, gender, username, imgsrc], (err, userResult) => {
//         if (err) {
//           console.error('Error creating user record: ', err);
//           return connection.rollback(() => {
//             res.status(500).json({ error: 'Internal Server Error' });
//           });
//         }

//         const user_id = userResult.insertId;
//         console.log('User record created successfully. UserID:', user_id);

//         const { fatherName, motherName, fatherAge, motherAge } = formData;
//         const parentSql = 'INSERT INTO parent_details (user_id, fatherName, motherName, fatherAge, motherAge) VALUES (?, ?, ?, ?, ?)';

//         connection.query(parentSql, [user_id, fatherName, motherName, fatherAge, motherAge], (err, parentResult) => {
//           if (err) {
//             console.error('Error creating parent record: ', err);
//             return connection.rollback(() => {
//               res.status(500).json({ error: 'Internal Server Error' });
//             });
//           }

//           const { houseNumber, pincode, city, state, country } = formData;
//           const addressSql = 'INSERT INTO address_details (user_id, houseNumber, pincode, city, state, country) VALUES (?, ?, ?, ?, ?, ?)';

//           connection.query(addressSql, [user_id, houseNumber, pincode, city, state, country], (err, addressResult) => {
//             if (err) {
//               console.error('Error creating address record: ', err);
//               return connection.rollback(() => {
//                 res.status(500).json({ error: 'Internal Server Error' });
//               });
//             }

//             connection.commit((err) => {
//               if (err) {
//                 console.error('Error committing transaction:', err);
//                 return connection.rollback(() => {
//                   res.status(500).json({ error: 'Internal Server Error' });
//                 });
//               }

//               console.log("file uploaded");
//               res.status(200).json(imgsrc);
//             });
//           });
//         });
//       });
//     } else {
//       connection.rollback(() => {
//         res.status(400).json({ error: 'Unknown form type' });
//       });
//     }
//   });
// });



// // Create a route to handle the database query
// app.get('/joins', (req, res) => {
//   const sqlQuery = `
//       SELECT user_details.id, user_details.userimg, user_details.name, parent_details.fatherName, parent_details.motherName, address_details.houseNumber, address_details.city
//       FROM user_details
//       INNER JOIN parent_details ON user_details.id = parent_details.user_id
//       INNER JOIN address_details ON user_details.id = address_details.user_id;
//   `;

//   connection.query(sqlQuery, (error, results, fields) => {
//       if (error) throw error;

//       // Build HTML string with database details
//       let htmlString = `
//           <!DOCTYPE html>
//           <html lang="en">
//           <head>
//               <meta charset="UTF-8">
//               <meta name="viewport" content="width=device-width, initial-scale=1.0">
//               <title>Database Details</title>
//           </head>
//           <body>
//               <h1>Database Details</h1>
//               <table>  
//                   <thead>
//                       <tr>
//                           <th>Name</th>
//                           <th>Father Name</th>
//                           <th>Mother Name</th>
//                           <th>House Number</th>
//                           <th>City</th>
//                           <th>img</th>
//                           <th>Action</th>
//                       </tr>
//                   </thead>
//                   <tbody>`;

//       results.forEach(result => {
//         htmlString += `
//   <tr>
//     <td>${result.name}</td>
//     <td>${result.fatherName}</td>
//     <td>${result.motherName}</td>
//     <td>${result.houseNumber}</td>
//     <td>${result.city}</td>
//     <td>`;

// // Check if result.userimg is present before adding the image tag
// if (result.userimg) {
//   htmlString += `<img src="${result.userimg}" alt="User Image" style="width:150px;">`;
// }

// htmlString += `
//     </td>
//     <td>
//       <a href="/update/${result.id}">Update Details</a>
//       <a href="/delete/${result.id}">Delete  Details</a>
//     </td>
//   </tr>`;
//       });

//       htmlString += `
//                   </tbody>
//               </table>
//           </body>
//           </html>`;

//       // Send the HTML as the response
//       res.send(htmlString);
//   });
// });

// // Create a route to handle the update operation
// app.get('/update/:id', (req, res) => {
//   const userId = req.params.id;

//   // Assuming you have a form for updating all details
//   // For simplicity, let's assume you have input fields for name, fatherName, motherName, houseNumber, and city

//   res.send(`
//       <!DOCTYPE html>
//       <html lang="en">
//       <head>
//           <meta charset="UTF-8">
//           <meta name="viewport" content="width=device-width, initial-scale=1.0">
//           <title>Update Details</title>
//       </head>
//       <body>
//           <h1>Update Details</h1>
//           <form action="/update" method="post"  enctype="multipart/form-data">
//               <label for="name">Name:</label>
//               <input type="hidden" id="userId" name="userId"  value="${userId}">

//               <input type="text" id="name" name="name" value="" >
//               <br>
//               <label for="fatherName">Father Name:</label>
//               <input type="text" id="fatherName" name="fatherName" value="" >
//               <br>
//               <label for="motherName">Mother Name:</label>
//               <input type="text" id="motherName" name="motherName" value="" >
//               <br>
//               <label for="houseNumber">House Number:</label>
//               <input type="text" id="houseNumber" name="houseNumber" value="" >
//               <br>
//               <label for="city">City:</label>
//               <input type="text" id="city" name="city" value="" >
//               <br>
//               <strong>  Picture:</strong>
//               <input type="file" id="userimg" name="userimg" accept="image/*">
//               <br>
//               <button type="submit">Update</button>
//           </form>
//       </body>
//       </html>
//   `);
// });

// // Handle the POST request to update all details
// // Handle the POST request to update all details
// // app.post('/update/:id', (req, res) => {
 
// app.post('/update', upload.single('userimg'), (req, res) => {
//   const { name, fatherName, motherName, houseNumber, city, userId } = req.body;

//   // Check if any data is provided for update
//   if (!name && !fatherName && !motherName && !houseNumber && !city && !req.file) {
//     return res.status(400).send('No data provided for update');
//   }

//   // Use a transaction to ensure atomicity of updates
//   connection.beginTransaction((transactionError) => {
//     if (transactionError) {
//       console.error('Transaction begin error:', transactionError);
//       return res.status(500).send('Internal Server Error');
//     }

//     // Construct the imgsrc only if a new image is uploaded
//     const imgsrc = req.file ? 'http://127.0.0.1:3000/images/' + req.file.filename : null;

//     // Check which field is provided and update accordingly
//     if (name) {
//       const userUpdateQuery = "UPDATE user_details SET name = ? WHERE id = ?";
//       const userUpdateParams = [name, userId];

//       connection.query(userUpdateQuery, userUpdateParams, (userUpdateError) => {
//         if (userUpdateError) {
//           return connection.rollback(() => {
//             console.error('User details update error:', userUpdateError);
//             res.status(500).send('Internal Server Error');
//           });
//         }

//         commitAndRedirect();
//       });
//     } 
//     if (imgsrc) {
//       const imgUpdateQuery = "UPDATE user_details SET userimg = ? WHERE id = ?";
//       const imgUpdateParams = [imgsrc, userId];

//       connection.query(imgUpdateQuery, imgUpdateParams, (imgUpdateError) => {
//         if (imgUpdateError) {
//           return connection.rollback(() => {
//             console.error('User image update error:', imgUpdateError);
//             res.status(500).send('Internal Server Error');
//           });
//         }

//         commitAndRedirect();
//       });
//     }  
//     if (fatherName || motherName) {
//       const parentUpdateQuery = "UPDATE parent_details SET fatherName = ?, motherName = ? WHERE user_id = ?";
//       const parentUpdateParams = [fatherName, motherName, userId];

//       connection.query(parentUpdateQuery, parentUpdateParams, (parentUpdateError) => {
//         if (parentUpdateError) {
//           return connection.rollback(() => {
//             console.error('Parent details update error:', parentUpdateError);
//             res.status(500).send('Internal Server Error');
//           });
//         }

//         commitAndRedirect();
//       });
//     }  
//     if (houseNumber || city) {
//       const addressUpdateQuery = "UPDATE address_details SET houseNumber = ?, city = ? WHERE user_id = ?";
//       const addressUpdateParams = [houseNumber, city, userId];

//       connection.query(addressUpdateQuery, addressUpdateParams, (addressUpdateError) => {
//         if (addressUpdateError) {
//           return connection.rollback(() => {
//             console.error('Address details update error:', addressUpdateError);
//             res.status(500).send('Internal Server Error');
//           });
//         }

//         commitAndRedirect();
//       });
//     } else {
//       // No valid field provided for update
//       res.status(400).send('Invalid update field');
//       connection.rollback();
//     }
//   });

//   // Function to commit the transaction and redirect
//   function commitAndRedirect() {
//     connection.commit((commitError) => {
//       if (commitError) {
//         console.error('Transaction commit error:', commitError);
//         return connection.rollback(() => {
//           res.status(500).send('Internal Server Error');
//         });
//       }
  
//       // Redirect to the main page after updating
//       return res.redirect('/joins');
//     });
//   }
  
// });




// app.get('/delete/:id', (req, res) => {
//   const userId = req.params.id;

//   // Ensure userId is a valid integer (to prevent SQL injection)
//   if (isNaN(userId)) {
//     return res.status(400).send('Invalid user ID');
//   }

//   // Start a transaction
//   connection.beginTransaction((error) => {
//     if (error) {
//       console.error('Error starting transaction:', error);
//       return res.status(500).send('Internal Server Error');
//     }

//     // Construct the DELETE queries for each table
//     const deleteQueries = [
//       'DELETE FROM user_details WHERE id = ?',
//             'DELETE FROM parent_details WHERE user_id = ?',
//             'DELETE FROM address_details WHERE user_id = ?',
//     ];

//     // Execute each DELETE query in the transaction
//     deleteQueries.forEach((deleteQuery, index) => {
//       connection.query(deleteQuery, [userId], (error, results, fields) => {
//         if (error) {
//           console.error('Error deleting rows:', error);
//           return connection.rollback(() => {
//             res.status(500).send('Internal Server Error');
//           });
//         }

//         // If it's the last query, commit the transaction and send the response
//         if (index === deleteQueries.length - 1) {
//           connection.commit((commitError) => {
//             if (commitError) {
//               console.error('Error committing transaction:', commitError);
//               return connection.rollback(() => {
//                 res.status(500).send('Internal Server Error');
//               });
//             }
//             res.redirect('/joins');

//             // res.status(200).send('Rows deleted successfully');
//           });
//         }
//       });
//     });
//   });
// });









// app.listen(port, () => {
//   console.log(`Server is running on http://localhost:${port}`);
// });
