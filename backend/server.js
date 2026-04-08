const express = require('express');
const path = require('path');

const app = express();

app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/login.html'));
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});