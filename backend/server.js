import express from 'express';
import cors from 'cors';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const db = new pg.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

db.connect()
    .then(client => {
        console.log("✅ Successfully connected to PostgreSQL Z-Coder Database!");
        client.release();
    })
    .catch(err => console.error("❌ Database connection error:", err.message));

// --- JWT SECURITY MIDDLEWARE ---
// This acts as a bouncer. If the request doesn't have a valid token, it blocks it.
const verifyToken = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

    try {
        const verified = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
        req.user = verified; // Attach the user ID to the request
        next();
    } catch (err) {
        res.status(400).json({ error: "Invalid token." });
    }
};

// --- AUTHENTICATION ROUTES ---
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const hash = await bcrypt.hash(password, 10);
        const result = await db.query(
            "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
            [email, hash]
        );
        const token = jwt.sign({ id: result.rows[0].id }, process.env.JWT_SECRET);
        res.json({ token, email });
    } catch (err) {
        res.status(400).json({ error: "Email already exists or database error" });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (result.rows.length === 0) return res.status(400).json({ error: "Invalid email" });

        const isMatch = await bcrypt.compare(password, result.rows[0].password_hash);
        if (!isMatch) return res.status(400).json({ error: "Invalid password" });

        const token = jwt.sign({ id: result.rows[0].id }, process.env.JWT_SECRET);
        res.json({ token, email });
    } catch (err) {
        res.status(400).json({ error: "Login failed" });
    }
});

// --- BOOKMARK API ROUTES ---
// Get all bookmarks for the logged-in user
app.get('/api/bookmarks', verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM bookmarks WHERE user_id = $1 ORDER BY created_at DESC", 
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch bookmarks" });
    }
});

// Add a new bookmark
app.post('/api/bookmarks', verifyToken, async (req, res) => {
    const { url } = req.body;
    try {
        const result = await db.query(
            "INSERT INTO bookmarks (user_id, problem_url) VALUES ($1, $2) RETURNING *",
            [req.user.id, url]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Failed to save bookmark" });
    }
});

// Delete a bookmark
app.delete('/api/bookmarks/:id', verifyToken, async (req, res) => {
    try {
        await db.query("DELETE FROM bookmarks WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
        res.json({ msg: "Bookmark deleted" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete bookmark" });
    }
});

const server = app.listen(5000, () => {
    console.log("🚀 Z-Coder Backend is actively listening on port 5000...");
});


// --- Z-CODER COMPILER ENGINE ---
app.post('/api/compile', verifyToken, async (req, res) => {
    const { language, code } = req.body;

    // Map your competitive programming languages to the sandbox versions
    const languageMap = {
        'cpp': { language: 'c++', version: '10.2.0' },
        'python': { language: 'python', version: '3.10.0' }
    };

    const config = languageMap[language];
    if (!config) return res.status(400).json({ error: "Unsupported language" });

    try {
        // Securely proxy the code to the Piston execution sandbox
        const response = await fetch('https://emacsx.com/api/v2/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                language: config.language,
                version: config.version,
                files: [{ content: code }]
            })
        });

        const data = await response.json();
        
        // Extract the console output or compilation errors
        if (data.run && data.run.output) {
            res.json({ output: data.run.output });
        } else {
            res.status(400).json({ output: "Compilation Error or Syntax Error." });
        }
    } catch (err) {
        console.error("Compiler Engine Error:", err);
        res.status(500).json({ error: "ZCoder Engine failed to execute code." });
    }
});