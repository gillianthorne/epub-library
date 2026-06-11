const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');

// this is just a mini express app instead of all of them at once in one file
const router = express.Router();

// login route:
router.post('/login', async (req, res) => {
    // req.body is the data sent with the request
    const { username, password } = req.body;

    try {
        // get an array called rows of every record matching users. should only be 1 or 0.
        // never put variables directly into sql statements because of sql injection, mysql2 knows how to safely inject it
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);

        // if no results, there is no username in the system
        if (rows.length === 0) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        // rows will return an array but there will only be one match, so get it
        const user = rows[0];
        // returns a boolean of if the password matches or not
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        // if the password doesn't match, let them know
        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            display_name: user.display_name
        };

        res.json({message: "Logged in successfully", user: req.session.user});
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" })
    }
});

router.post('/logout', (req, res) => {
    // remove all information (cookies)
    req.session.destroy();
    res.json({ message: "Logged out successfully" });
});

router.get('/me', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Not logged in" })
    }
    res.json(req.session.user);
})

module.exports = router;