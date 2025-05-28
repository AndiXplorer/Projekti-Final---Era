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


//Contact Schema
const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  interest: String,
  message: String,
  newsletter: Boolean,
  createdAt: { type: Date, default: Date.now }
});

const Contact = mongoose.model('Contact', contactSchema);

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

// Middleware to authenticate JWT
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'SECRET_KEY');
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.post('/contact', async (req, res) => {
  try {
    const { name, email, interest, message, newsletter } = req.body;
    const newMessage = new Contact({ name, email, interest, message, newsletter });
    await newMessage.save();
    res.status(201).json({ message: 'Contact message received successfully' });
  } catch (err) {
    console.error('Error saving contact message:', err);
    res.status(500).json({ error: 'Failed to save message' });
  }
});


// Pet interaction endpoint
app.post('/pet-interaction', authenticate, async (req, res) => {
  try {
    const { action } = req.body;
    const userId = req.userId;

    // Validate action type
    if (!['feed', 'play', 'care'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action type' });
    }

    // Find user and populate pet
    const user = await User.findById(userId).populate('pet');
    if (!user || !user.pet) {
      return res.status(404).json({ error: 'User or pet not found' });
    }

    const pet = user.pet;
    const now = new Date();
    const lastInteraction = pet.lastInteraction || now;
    const hoursSinceLastInteraction = (now - lastInteraction) / (1000 * 60 * 60);

    // Apply natural decay first
    pet.hunger = Math.max(0, pet.hunger - (5 * hoursSinceLastInteraction));
    pet.happiness = Math.max(0, pet.happiness - (3 * hoursSinceLastInteraction));
    pet.energy = Math.max(0, pet.energy - (2 * hoursSinceLastInteraction));

    // Apply action effects
    switch (action) {
      case 'feed':
        pet.hunger = Math.min(100, pet.hunger + 30);
        pet.energy = Math.min(100, pet.energy + 10);
        break;
      case 'play':
        pet.happiness = Math.min(100, pet.happiness + 25);
        pet.energy = Math.max(0, pet.energy - 15);
        pet.hunger = Math.max(0, pet.hunger - 10);
        break;
      case 'care':
        pet.happiness = Math.min(100, pet.happiness + 15);
        pet.energy = Math.min(100, pet.energy + 5);
        pet.hunger = Math.max(0, pet.hunger - 5);
        break;
    }

    // Update last interaction time
    pet.lastInteraction = now;

    // Save updated pet
    await pet.save();

    res.json({
      message: `${action} action successful`,
      hunger: Math.round(pet.hunger),
      happiness: Math.round(pet.happiness),
      energy: Math.round(pet.energy),
      lastInteraction: pet.lastInteraction
    });

  } catch (error) {
    console.error('Pet interaction error:', error);
    res.status(500).json({ error: 'Server error processing interaction' });
  }
});

// Get current pet stats
app.get('/pet-stats', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('pet');
    if (!user || !user.pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    const pet = user.pet;
    const now = new Date();
    const lastInteraction = pet.lastInteraction || now;
    const hoursSinceLastInteraction = (now - lastInteraction) / (1000 * 60 * 60);

    // Only apply decay if it's been more than 1 hour
    if (hoursSinceLastInteraction > 1) {
      pet.hunger = Math.max(0, pet.hunger - (5 * hoursSinceLastInteraction));
      pet.happiness = Math.max(0, pet.happiness - (3 * hoursSinceLastInteraction));
      pet.energy = Math.max(0, pet.energy - (2 * hoursSinceLastInteraction));

      // Update in DB if significant decay occurred
      if (hoursSinceLastInteraction > 3) {
        pet.lastInteraction = now;
        await pet.save();
      }
    }

    res.json({
      hunger: Math.round(pet.hunger),
      happiness: Math.round(pet.happiness),
      energy: Math.round(pet.energy),
      lastInteraction: pet.lastInteraction,
      type: pet.type,
      photo: pet.photo
    });

  } catch (error) {
    console.error('Get pet stats error:', error);
    res.status(500).json({ error: 'Server error fetching pet stats' });
  }
});


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
