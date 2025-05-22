const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors'); // Import CORS


const app = express();

// Use CORS middleware
app.use(cors()); // Enable all CORS requests
app.use(express.json()); // Enable JSON parsing

mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/authDB")
  .then(() => console.log('Database is connected'))
  .catch((err) => console.log(`Database cannot connect because of ${err}`));



app.listen(3000, () => console.log('Server is running on port 3000'));
