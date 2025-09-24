const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables from .env file
const path = require('path');
const fs = require('fs').promises; // Using promises version of fs for async operations
const cheerio = require('cheerio'); // HTML parser
const glob = require('glob'); // To find files matching a pattern

const app = express();
const PORT = 3000;

// --- Database Connection ---
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI, { dbName: 'exam-prep-hub', tls: true })
    .then(() => console.log('Successfully connected to MongoDB Atlas!'))
    .catch(error => console.error('Error connecting to MongoDB:', error));

// --- User Schema and Model ---
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// --- Content Schema and Model ---
const contentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    type: { type: String, required: true, enum: ['book', 'video'] }, // e.g., book, video
    exam: { type: String, required: true }, // e.g., upsc, cds
    url: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Content = mongoose.model('Content', contentSchema);

// --- One-Time Database Seeding from HTML files ---
const seedDatabase = async () => {
    try {
        // Check if content already exists to prevent re-seeding
        const existingContentCount = await Content.countDocuments();
        if (existingContentCount > 0) {
            console.log('Content collection is not empty. Skipping seeding.');
            return;
        }

        console.log('Starting database seeding from HTML files...');
        let contentToInsert = [];

        // 1. Parse Resource Pages for Books
        const resourceFiles = [
            'upsc-resources.html',
            'cds-resources.html',
            'ssc-resources.html',
            'capf-resources.html'
        ];

        for (const fileName of resourceFiles) {
            const filePath = path.join(__dirname, fileName);
            const html = await fs.readFile(filePath, 'utf-8');
            const $ = cheerio.load(html);
            const exam = $('body').attr('id'); // e.g., 'upsc'

            $('#books .doc-link').each((i, el) => {
                const url = $(el).data('doc-url');
                // Skip placeholder links
                if (url && !url.startsWith('path/to/')) {
                    const title = $(el).find('h3').text().trim();
                    const author = $(el).find('p').text().trim();
                    contentToInsert.push({
                        title: `${title} - ${author}`,
                        type: 'book',
                        exam: exam,
                        url: url
                    });
                }
            });
        }

        // 2. Parse Video Pages
        const videoPageFiles = glob.sync(path.join(__dirname, '*-videos.html').replace(/\\/g, '/'));

        for (const filePath of videoPageFiles) {
            const fileName = path.basename(filePath);
            // Extract exam and subject from filename like 'upsc-polity-videos.html'
            const parts = fileName.replace('-videos.html', '').split('-');
            const exam = parts[0];
            const subject = parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

            const html = await fs.readFile(filePath, 'utf-8');
            const $ = cheerio.load(html);

            $('.video-grid .doc-link').each((i, el) => {
                const url = $(el).data('doc-url');
                if (url) {
                    const videoTitle = $(el).find('p').text().trim(); // "Video 1"
                    contentToInsert.push({
                        title: `${subject} - ${videoTitle}`,
                        type: 'video',
                        exam: exam,
                        url: url
                    });
                }
            });
        }

        // Remove duplicates based on URL
        const uniqueContent = Array.from(new Map(contentToInsert.map(item => [item['url'], item])).values());

        if (uniqueContent.length > 0) {
            await Content.insertMany(uniqueContent);
            console.log(`Successfully seeded ${uniqueContent.length} content items into the database.`);
        } else {
            console.log('No new content found to seed.');
        }

    } catch (error) {
        console.error('Error during database seeding:', error);
    }
};

// Run seeding after DB connection is established
mongoose.connection.once('open', () => {
    // We need to install cheerio and glob first.
    // I'll assume they are installed for this script to work.
    // You can install them with: npm install cheerio glob
    try {
        require.resolve('cheerio');
        require.resolve('glob');
        seedDatabase();
    } catch (e) {
        console.warn('Skipping DB seeding. Please run "npm install cheerio glob" to enable it.');
    }
});

// Middleware to parse JSON bodies and serve static files
app.use(express.json());
app.use(express.static(path.join(__dirname, ''))); // Serve your HTML, CSS, JS files

// --- Root Route to serve index.html ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API Endpoint for Registration
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // --- Basic Server-Side Validation ---
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please provide all required fields.' });
        }

        // Check if user already exists in the database
        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
            return res.status(409).json({ message: 'User with this email already exists.' });
        }
        // --- Securely Hash the Password ---
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // --- Store the New User in the Database ---
        const newUser = new User({
            name,
            email,
            password: hashedPassword, // Store the hashed password, NOT the original
        });
        await newUser.save();

        console.log('New user registered and saved to DB:', { id: newUser._id, name: newUser.name, email: newUser.email });

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

        // --- Find User in Database ---
        const user = await User.findOne({ email });
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

// API Endpoint to get all users (for Admin)
app.get('/api/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const searchQuery = req.query.search || '';

        const filter = {};
        if (searchQuery) {
            // Create a filter that searches name OR email case-insensitively
            filter.$or = [
                { name: { $regex: searchQuery, $options: 'i' } },
                { email: { $regex: searchQuery, $options: 'i' } }
            ];
        }

        let query = User.find(filter, '_id name email createdAt').sort({ createdAt: -1 });

        // If limit is not 0, apply pagination. Otherwise, fetch all.
        if (limit !== 0) {
            query = query.skip(skip).limit(limit);
        }

        const users = await query;
        const totalUsers = await User.countDocuments(filter); // Count only filtered users

        res.status(200).json({
            users,
            totalPages: Math.ceil(totalUsers / limit)
        });
    } catch (error) {
        console.error('Server error fetching users:', error);
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

        const user = await User.findOne({ email }, '_id name email'); // Find user by email
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

// API Endpoint to update a user (for Admin)
app.put('/api/users/:id', async (req, res) => {
    try {
        const { name, email } = req.body;
        const userId = req.params.id;

        if (!name || !email) {
            return res.status(400).json({ message: 'Name and email are required.' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { name, email },
            { new: true } // Return the updated document
        );

        if (!updatedUser) return res.status(404).json({ message: 'User not found.' });

        res.status(200).json({ message: 'User updated successfully!', user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

// API Endpoint to delete a user (for Admin)
app.delete('/api/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const deletedUser = await User.findByIdAndDelete(userId);

        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json({ message: 'User deleted successfully!' });
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

        // Find the user by email
        const user = await User.findOne({ email });
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
        await user.save();

        res.status(200).json({ message: 'Password changed successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

// API Endpoint for Admin Login
app.post('/api/admin-login', async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ message: 'Password is required.' });
        }

        const configPath = path.join(__dirname, 'admin-config.json');
        const configData = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configData);

        if (password === config.adminPassword) {
            res.status(200).json({ message: 'Admin login successful!' });
        } else {
            res.status(401).json({ message: 'Incorrect admin password.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

// API Endpoint to change the admin password
app.put('/api/admin/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Read the current admin password from the config file
        const configPath = path.join(__dirname, 'admin-config.json');
        const configData = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configData);

        // Verify the current password
        if (currentPassword !== config.adminPassword) {
            return res.status(401).json({ message: 'Incorrect current password.' });
        }

        // Update the password in the config object and write it back to the file
        config.adminPassword = newPassword;
        await fs.writeFile(configPath, JSON.stringify(config, null, 4), 'utf8');

        res.status(200).json({ message: 'Admin password changed successfully!' });

    } catch (error) {
        console.error('Error changing admin password:', error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

// API Endpoint to get dashboard statistics
app.get('/api/stats', async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        // Get the count of distinct 'exam' fields from the Content collection
        const distinctExams = await Content.distinct('exam');
        const examCount = distinctExams.length;
        const contentCount = await Content.countDocuments();

        res.status(200).json({
            totalUsers: userCount,
            activeExams: examCount,
            contentUploads: contentCount
        });
    } catch (error) {
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

// --- Content API Endpoints ---

// GET all content
app.get('/api/content', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        const searchQuery = req.query.search || '';

        const sortOptions = {};
        if (sortBy) {
            sortOptions[sortBy] = sortOrder;
        }

        const filter = {};
        if (searchQuery) {
            // Case-insensitive search on the 'title' field
            filter.title = { $regex: searchQuery, $options: 'i' };
        }

        let query = Content.find(filter).sort(sortOptions);

        if (limit !== 0) {
            query = query.skip(skip).limit(limit);
        }

        const contentItems = await query;
        const totalContent = await Content.countDocuments(filter);
        res.status(200).json({
            content: contentItems,
            totalPages: Math.ceil(totalContent / limit)
        });
    } catch (error) {
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

// GET single content item by ID
app.get('/api/content/:id', async (req, res) => {
    try {
        const contentItem = await Content.findById(req.params.id);
        if (!contentItem) {
            return res.status(404).json({ message: 'Content not found.' });
        }
        res.status(200).json(contentItem);
    } catch (error) {
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

// POST new content
app.post('/api/content', async (req, res) => {
    try {
        const { title, type, exam, url } = req.body;
        if (!title || !type || !exam || !url) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
        const newContent = new Content({ title, type, exam, url });
        await newContent.save();
        res.status(201).json({ message: 'Content added successfully!', content: newContent });
    } catch (error) {
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

// POST bulk content
app.post('/api/content/bulk', async (req, res) => {
    try {
        const { content } = req.body;

        if (!content || !Array.isArray(content) || content.length === 0) {
            return res.status(400).json({ message: 'Content array is required and cannot be empty.' });
        }

        // Optional: Add more robust validation for each item in the array
        const validatedContent = content.filter(item => item.title && item.type && item.exam && item.url);

        if (validatedContent.length !== content.length) {
            return res.status(400).json({ message: 'One or more content items are missing required fields (title, type, exam, url).' });
        }

        const insertedContent = await Content.insertMany(validatedContent, { ordered: false }); // ordered:false attempts to insert all valid documents, even if some fail.

        res.status(201).json({
            message: `Successfully added ${insertedContent.length} content items.`
        });

    } catch (error) {
        console.error('Error during bulk content insertion:', error);
        // Handle potential duplicate key errors if URLs must be unique
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Bulk operation failed due to duplicate content (e.g., URL already exists).' });
        }
        res.status(500).json({ message: 'An internal server error occurred during bulk insertion.' });
    }
});

// PUT (update) content
app.put('/api/content/:id', async (req, res) => {
    try {
        const { title, type, exam, url } = req.body;
        const updatedContent = await Content.findByIdAndUpdate(
            req.params.id,
            { title, type, exam, url },
            { new: true, runValidators: true }
        );

        if (!updatedContent) {
            return res.status(404).json({ message: 'Content not found.' });
        }

        res.status(200).json({ message: 'Content updated successfully!', content: updatedContent });
    } catch (error) {
        console.error('Error updating content:', error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

// DELETE content
app.delete('/api/content/:id', async (req, res) => {
    try {
        const contentId = req.params.id;
        const deletedContent = await Content.findByIdAndDelete(contentId);

        if (!deletedContent) {
            return res.status(404).json({ message: 'Content not found.' });
        }

        res.status(200).json({ message: 'Content deleted successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
