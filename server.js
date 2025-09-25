const express = require('express');
const bcrypt = require('bcryptjs');
require('dotenv').config(); // Load environment variables from .env file
const { v4: uuidv4 } = require('uuid'); // To generate unique IDs
const path = require('path');
const fs = require('fs').promises; // Using promises version of fs for async operations
const cheerio = require('cheerio'); // HTML parser
const glob = require('glob'); // To find files matching a pattern

const app = express();
const PORT = process.env.PORT || 3000; // Use port from environment variable or default to 3000

// --- Database Connection ---
const DB_PATH = path.join(__dirname, 'database.json');

// --- JSON Database Helper Functions ---
const readDb = async () => {
    try {
        const data = await fs.readFile(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // If the file doesn't exist or is invalid, return a default structure
        console.error("Could not read database.json, returning default structure.", error);
        return { users: [], content: [] };
    }
};

const writeDb = async (data) => {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 4), 'utf-8');
};

// Middleware to parse JSON bodies and serve static files
app.use(express.json());

// --- Root Route to serve index.html ---
app.get('/', (req, res) => { 
    res.redirect('/login.html');
});

app.use(express.static(path.join(__dirname, ''))); // Serve all other static files like CSS, JS, and other HTML files

// API Endpoint for Registration
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // --- Basic Server-Side Validation ---
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please provide all required fields.' });
        }

        const db = await readDb();

        // Check if user already exists in the database
        const existingUser = db.users.find(user => user.email === email);
        if (existingUser) {
            return res.status(409).json({ message: 'User with this email already exists.' });
        }
        // --- Securely Hash the Password ---
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // --- Store the New User in the Database ---
        const newUser = {
            id: uuidv4(),
            name,
            email,
            password: hashedPassword, // Store the hashed password, NOT the original
            createdAt: new Date().toISOString()
        };
        db.users.push(newUser);
        await writeDb(db);

        console.log('New user registered and saved to DB:', { id: newUser.id, name: newUser.name, email: newUser.email });
        // Send a success response
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        console.error('Server registration error:', error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

// API Endpoint for Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // --- Basic Validation ---
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password.' });
        }

        const db = await readDb();
        // --- Find User in Database ---
        const user = db.users.find(u => u.email === email);
        if (!user) {
            // Use a generic message to prevent email enumeration
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // --- Compare Passwords ---
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // --- Login Successful ---
        // In a real app, you would create a session or JWT here.
        res.status(200).json({ message: 'Login successful!', user: { name: user.name, email: user.email } });

    } catch (error) {
        console.error('Server login error:', error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

// API Endpoint to get a single user's data (for profile page)
app.get('/api/user', async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({ message: 'Email query parameter is required.' });
        }

        const db = await readDb();
        const user = db.users.find(u => u.email === email);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.status(200).json({ id: user.id, name: user.name, email: user.email });
    } catch (error) {
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

// API Endpoint to change a user's password
app.put('/api/user/change-password', async (req, res) => {
    try {
        const { email, oldPassword, newPassword } = req.body;

        if (!email || !oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Email, old password, and new password are required.' });
        }

        const db = await readDb();
        // Find the user by email
        const user = db.users.find(u => u.email === email);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Verify the old password
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect old password.' });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update the user's password
        user.password = hashedPassword;
        await writeDb(db);

        res.status(200).json({ message: 'Password changed successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
