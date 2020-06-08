// Require Libraries
const express = require('express');

// App Setup
const app = express();

// Middleware

// Routes
app.get('/sms', (req, res) => {
    res.send('Hello User');
  });
// Start Server

app.listen(3000, () => {
  console.log('Mediconnect listening on port localhost:3000!');
});


