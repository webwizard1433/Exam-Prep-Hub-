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
        return { users: [], content: [], admin: { password: process.env.ADMIN_PASSWORD } };
    }
};

const writeDb = async (data) => {
    // NOTE: This simple write operation is not safe for concurrent requests.
    // In a high-traffic environment, this could lead to data loss or corruption.
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 4), 'utf-8');
};

// --- One-Time Database Seeding from HTML files ---
const seedDatabase = async () => {
    try {
        const db = await readDb();
        // Check if content already exists to prevent re-seeding
        if (db.content.length > 0) {
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
                        id: uuidv4(),
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
                        id: uuidv4(),
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
            db.content = uniqueContent;
            await writeDb(db);
            console.log(`Successfully seeded ${uniqueContent.length} content items into the database.`);
        } else {
            console.log('No new content found to seed.');
        }

    } catch (error) {
        console.error('Error during database seeding:', error);
    }
};

// Run seeding after DB connection and sync is established
try {
    require.resolve('cheerio');
    require.resolve('glob');
    seedDatabase();
} catch (e) {
    console.warn('Skipping DB seeding. Please run "npm install cheerio glob" to enable it.');
}

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

// API Endpoint to get all users (for Admin)
app.get('/api/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const searchQuery = req.query.search || '';

        const db = await readDb();
        let filteredUsers = db.users;

        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            filteredUsers = db.users.filter(user =>
                user.name.toLowerCase().includes(lowercasedQuery) ||
                user.email.toLowerCase().includes(lowercasedQuery)
            );
        }

        const totalUsers = filteredUsers.length;
        const paginatedUsers = limit === 0 ? filteredUsers : filteredUsers.slice(skip, skip + limit);

        res.status(200).json({
            users: paginatedUsers.map(({ password, ...user }) => user), // Exclude password from response
            totalPages: limit === 0 ? 1 : Math.ceil(totalUsers / limit)
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

// API Endpoint to update a user (for Admin)
app.put('/api/users/:id', async (req, res) => {
    try {
        const { name, email } = req.body;
        const userId = req.params.id;

        if (!name || !email) {
            return res.status(400).json({ message: 'Name and email are required.' });
        }

        const db = await readDb();
        const userIndex = db.users.findIndex(u => u.id === userId);

        if (userIndex === -1) {
            return res.status(404).json({ message: 'User not found.' });
        }

        db.users[userIndex] = { ...db.users[userIndex], name, email };
        await writeDb(db);

        const { password, ...userToReturn } = db.users[userIndex];
        res.status(200).json({ message: 'User updated successfully!', user: userToReturn });
    } catch (error) {
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

// API Endpoint to delete a user (for Admin)
app.delete('/api/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const db = await readDb();
        const initialLength = db.users.length;

        db.users = db.users.filter(u => u.id !== userId);

        if (db.users.length === initialLength) {
            return res.status(404).json({ message: 'User not found.' });
        }

        await writeDb(db);
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

// API Endpoint for Admin Login
app.post('/api/admin-login', async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ message: 'Password is required.' });
        }

        const db = await readDb();
        const adminPassword = db.admin.password || process.env.ADMIN_PASSWORD;

        if (!adminPassword) {
            console.error('Admin password is not set in database.json or ADMIN_PASSWORD environment variable.');
            return res.status(500).json({ message: 'Admin password not configured on server.' });
        }

        // For simplicity, this example uses a plain text password comparison for the admin.
        if (password === adminPassword) {
            res.status(200).json({ message: 'Admin login successful!' });
        } else {
            res.status(401).json({ message: 'Incorrect admin password.' });
        }
    } catch (error) {
        console.error('Error during admin login:', error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

// API Endpoint to change the admin password
app.put('/api/admin/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const db = await readDb();
        const adminPassword = db.admin.password || process.env.ADMIN_PASSWORD;

        if (!adminPassword) {
            console.error('Admin password is not set in database.json or ADMIN_PASSWORD environment variable.');
            return res.status(500).json({ message: 'Admin password not configured on server.' });
        }

        // Verify the current password against the environment variable
        if (currentPassword !== adminPassword) {
            return res.status(401).json({ message: 'Incorrect current password.' });
        }

        // Update the password in the JSON file
        db.admin.password = newPassword;
        await writeDb(db);

        res.status(200).json({ message: 'Admin password changed successfully!' });

    } catch (error) {
        console.error('Error changing admin password:', error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

// API Endpoint to get dashboard statistics
app.get('/api/stats', async (req, res) => {
    try {
        const db = await readDb();
        const userCount = db.users.length;
        const contentCount = db.content.length;
        const examCount = new Set(db.content.map(item => item.exam)).size;
        
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
        const sortOrder = req.query.sortOrder || 'desc';
        const searchQuery = req.query.search || '';
        const type = req.query.type || '';
        const exam = req.query.exam || '';

        const db = await readDb();
        let filteredContent = db.content;

        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            filteredContent = filteredContent.filter(item => item.title.toLowerCase().includes(lowercasedQuery));
        }
        if (type) {
            filteredContent = filteredContent.filter(item => item.type === type);
        }
        if (exam) {
            filteredContent = filteredContent.filter(item => item.exam === exam);
        }

        const totalContent = filteredContent.length;
        const paginatedContent = limit === 0 ? filteredContent : filteredContent.slice(skip, skip + limit);

        res.status(200).json({
            content: paginatedContent,
            totalPages: limit === 0 ? 1 : Math.ceil(totalContent / limit)
        });
    } catch (error) {
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

// GET single content item by ID
app.get('/api/content/:id', async (req, res) => {
    try {
        const db = await readDb();
        const contentItem = db.content.find(item => item.id === req.params.id);
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
        const db = await readDb();
        const newContent = { id: uuidv4(), title, type, exam, url };
        db.content.push(newContent);
        await writeDb(db);
        res.status(201).json({ message: 'Content added successfully!', content: newContent });
    } catch (error) {
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

// POST bulk content
app.post('/api/content/bulk', async (req, res) => {
    try {
        const db = await readDb();
        const { content } = req.body;

        if (!content || !Array.isArray(content) || content.length === 0) {
            return res.status(400).json({ message: 'Content array is required and cannot be empty.' });
        }

        // Optional: Add more robust validation for each item in the array
        const newContentItems = content.map(item => {
            if (!item.title || !item.type || !item.exam || !item.url) {
                return null;
            }
            // Add a unique ID to each new item
            return { ...item, id: uuidv4() };
        }).filter(Boolean); // Filter out any null items from failed validation

        if (newContentItems.length !== content.length) {
            return res.status(400).json({ message: 'One or more content items are missing required fields (title, type, exam, url).' });
        }

        db.content.push(...newContentItems);
        await writeDb(db);

        res.status(201).json({
            message: `Successfully added ${newContentItems.length} content items.`
        });

    } catch (error) {
        console.error('Error during bulk content insertion:', error);
        res.status(500).json({ message: 'An internal server error occurred during bulk insertion.' });
    }
});

// PUT (update) content
app.put('/api/content/:id', async (req, res) => {
    try {
        const { title, type, exam, url } = req.body;
        const db = await readDb();
        const contentIndex = db.content.findIndex(item => item.id === req.params.id);

        if (contentIndex === -1) {
            return res.status(404).json({ message: 'Content not found.' });
        }

        const updatedItem = { ...db.content[contentIndex], title, type, exam, url };
        db.content[contentIndex] = updatedItem;
        await writeDb(db);

        res.status(200).json({ message: 'Content updated successfully!', content: updatedItem });
    } catch (error) {
        console.error('Error updating content:', error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

// DELETE content
app.delete('/api/content/:id', async (req, res) => {
    try {
        const contentId = req.params.id;
        const db = await readDb();
        const initialLength = db.content.length;

        db.content = db.content.filter(item => item.id !== contentId);

        if (db.content.length === initialLength) {
            return res.status(404).json({ message: 'Content not found.' });
        }

        await writeDb(db);
        res.status(200).json({ message: 'Content deleted successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
