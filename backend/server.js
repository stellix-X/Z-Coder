import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Force dotenv to find the exact absolute path of the .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

import express from 'express';
import cors from 'cors';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
        console.error("❌ ACTUAL REGISTER ERROR:", err.message);
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
    const userId = req.user.id;

    try {
        const newBookmark = await db.query(
            'INSERT INTO bookmarks (user_id, problem_url) VALUES ($1, $2) RETURNING *',
            [userId, url]
        );
        res.json(newBookmark.rows[0]);
    } catch (err) {
        // Check if the error is a PostgreSQL unique constraint violation
        if (err.code === '23505') {
            return res.status(400).json({ error: "You have already saved this problem link!" });
        }
        
        console.error("Database Error:", err);
        res.status(500).json({ error: "Server failed to save bookmark." });
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
    console.log("Z-Coder Backend is actively listening on port 5000...");
});


// --- Z-CODER COMPILER ENGINE (DYNAMIC WANDBOX WIRING) ---
app.post('/api/compile', verifyToken, async (req, res) => {
    const { language, code, stdin } = req.body; 

    try {
        const listRes = await fetch('https://wandbox.org/api/list.json');
        const compilers = await listRes.json();
        
        let compilerTag = "";
        if (language === 'python') {
            const pyOptions = compilers.filter(c => c.language === 'Python' && c.name.startsWith('cpython-') && !c.name.includes('head'));
            if (pyOptions.length > 0) compilerTag = pyOptions[0].name;
        } else if (language === 'cpp') {
            const cppOptions = compilers.filter(c => c.language === 'C++' && c.name.startsWith('gcc-') && !c.name.includes('head'));
            if (cppOptions.length > 0) compilerTag = cppOptions[0].name;
        }

        if (!compilerTag) return res.status(400).json({ error: "No stable compiler found for this language." });

        const response = await fetch('https://wandbox.org/api/compile.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                compiler: compilerTag,
                code: code,
                stdin: stdin || "", // 2. Send the standard input to Wandbox!
                save: false
            })
        });   

        const textData = await response.text();
        
        let data;
        try {
            data = JSON.parse(textData);
        } catch (parseError) {
            return res.status(400).json({ output: `Wandbox System Error: ${textData}` });
        }
        
        // Wandbox returns status "0" for success. 
        if (data.status === "0") {
            res.json({ output: data.program_message || "Execution successful, no output returned." });
        } else {
            // If compilation fails, return the specific compiler logs
            res.status(400).json({ output: data.compiler_error || data.compiler_message || data.program_message || "Compilation failed." });
        }
    } catch (err) {
        console.error("Compiler Engine Error:", err);
        res.status(500).json({ error: "ZCoder Engine failed to execute code." });
    }
});