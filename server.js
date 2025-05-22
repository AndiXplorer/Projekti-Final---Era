const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/PetGame', {})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));


// =======================
// Schema Definitions
// =======================

// Pet Schema
const petSchema = new mongoose.Schema({
  type: String,
  photo: String,
  hunger: { type: Number, default: 100 },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true }
});
const Pet = mongoose.model('Pet', petSchema);

// User Schema
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  pet: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', default: null }
});
const User = mongoose.model('User', userSchema);


// =======================
// Static Pet Types
// =======================
const PREDEFINED_PETS = {
  pet1: { type: 'Dog', photo: 'dog.jpg' },
  pet2: { type: 'Cat', photo: 'cat.jpg'},
  pet3: { type: 'Bird', photo: 'bird.jpg'}
};


// =======================
// Auth Routes
// =======================

// Signup
app.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'User created', user: newUser });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: 'Email or password is wrong' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Password is incorrect' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'SECRET_KEY', { expiresIn: '1h' });

    res.status(200).json({ message: 'Login successful', token, userId: user._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// =======================
// Pet Assignment
// =======================

// Assign one of three pets to a user
app.post('/assign-pet', async (req, res) => {
  const { userId, petChoice } = req.body;

  if (!PREDEFINED_PETS[petChoice]) {
    return res.status(400).json({ error: 'Invalid pet choice' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.pet) return res.status(400).json({ error: 'User already has a pet' });

    const petData = PREDEFINED_PETS[petChoice];
    const pet = new Pet({ ...petData, user: user._id });
    await pet.save();

    user.pet = pet._id;
    await user.save();

    res.status(201).json({ message: 'Pet assigned successfully', pet });
  } catch (error) {
    console.error('Error assigning pet:', error);
    res.status(500).json({ error: 'Failed to assign pet' });
  }
});


// =======================
// Data Fetching Routes
// =======================

// Get all pets (optional, for testing)
app.get('/pets', async (req, res) => {
  try {
    const pets = await Pet.find().populate('user', 'username email');
    res.status(200).json(pets);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching pets' });
  }
});

// Get a user and their pet
app.get('/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('pet');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching user' });
  }
});


// =======================
// Start Server
// =======================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
