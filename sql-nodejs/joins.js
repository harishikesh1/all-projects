const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');

const app = express();
const port = 4000;

// Create a connection to the database
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'nodejs',
});

// Use body-parser middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to the database
connection.connect();

// Create a route to handle the database query
app.get('/joins', (req, res) => {
    const sqlQuery = `
        SELECT user_details.id, user_details.name, parent_details.fatherName, parent_details.motherName, address_details.houseNumber, address_details.city
        FROM user_details
        INNER JOIN parent_details ON user_details.id = parent_details.user_id
        INNER JOIN address_details ON user_details.id = address_details.user_id;
    `;

    connection.query(sqlQuery, (error, results, fields) => {
        if (error) throw error;

        // Build HTML string with database details
        let htmlString = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Database Details</title>
            </head>
            <body>
                <h1>Database Details</h1>
                <table>  
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Father Name</th>
                            <th>Mother Name</th>
                            <th>House Number</th>
                            <th>City</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>`;

        results.forEach(result => {
            htmlString += `
                <tr>
                    <td>${result.name}</td>
                    <td>${result.fatherName}</td>
                    <td>${result.motherName}</td>
                    <td>${result.houseNumber}</td>
                    <td>${result.city}</td>
                    <td>
                        <a href="/update/${result.id}">Update Details</a>
                    </td>
                </tr>`;
        });

        htmlString += `
                    </tbody>
                </table>
            </body>
            </html>`;

        // Send the HTML as the response
        res.send(htmlString);
    });
});

// Create a route to handle the update operation
app.get('/update/:id', (req, res) => {
    const userId = req.params.id;

    // Assuming you have a form for updating all details
    // For simplicity, let's assume you have input fields for name, fatherName, motherName, houseNumber, and city

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Update Details</title>
        </head>
        <body>
            <h1>Update Details</h1>
            <form action="/update/${userId}" method="post">
                <label for="name">Name:</label>
                <input type="text" id="name" name="name" value="" >
                <br>
                <label for="fatherName">Father Name:</label>
                <input type="text" id="fatherName" name="fatherName" value="" >
                <br>
                <label for="motherName">Mother Name:</label>
                <input type="text" id="motherName" name="motherName" value="" >
                <br>
                <label for="houseNumber">House Number:</label>
                <input type="text" id="houseNumber" name="houseNumber" value="" >
                <br>
                <label for="city">City:</label>
                <input type="text" id="city" name="city" value="" >
                <br>
                <button type="submit">Update</button>
            </form>
        </body>
        </html>
    `);
});

// Handle the POST request to update all details
// Handle the POST request to update all details
app.post('/update/:id', (req, res) => {
    const userId = req.params.id;
    const { name, fatherName, motherName, houseNumber, city } = req.body;

    const updateQueries = [
        "UPDATE user_details SET name = ? WHERE id = ?;",
        "UPDATE parent_details SET fatherName = ?, motherName = ? WHERE user_id = ?;",
        "UPDATE address_details SET houseNumber = ?, city = ? WHERE user_id = ?;"
    ];

    // Execute each query separately
    updateQueries.forEach((query, index) => {
        connection.query(query, [name, fatherName, motherName, houseNumber, city, userId], (error, results, fields) => {
            if (error) throw error;

            // If it's the last query, redirect to the main page after updating
            if (index === updateQueries.length - 1) {
                res.redirect('/joins');
            }
        });
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
