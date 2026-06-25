const express = require('express');
const db = require('../db');

const router = express.Router();
// create entry
router.post('/', async (req, res) => {
    const { book_id, status, date_started, date_finished, progress_pct } = req.body;

    try {
        const [result] = await db.query(`
            INSERT INTO user_books (user_id, book_id, status, date_started, date_finished, progress_pct)
            VALUES (?, ?, ?, ?, ?, ?)`,
        [req.session.user.id, book_id, status, date_started, date_finished, progress_pct])
        
        res.status(201).json({ message: "Entry added successfully", id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
    }
})

// get all books by user
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT user_books.*,
                books.cover_path,
                books.title
            FROM user_books
            LEFT JOIN books ON user_books.book_id = books.id
            WHERE user_books.user_id = ?`,
         [req.session.user.id]);

        res.json(rows)
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
    }
});

// get specific user book by user_book.id
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT user_books.*,
                books.cover_path,
                books.title
            FROM user_books
            LEFT JOIN books ON user_books.book_id = books.id
            WHERE user_books.user_id = ? AND user_books.id = ?`,
        [req.session.user.id, req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Entry not found' });
        }

        res.json(rows[0])
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
    }
})

// get all user_books by book id
router.get('/book/:book_id', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT * FROM user_books
            WHERE user_id = ? AND book_id = ?
            ORDER BY date_started ASC`,
        [req.session.user.id, req.params.book_id]);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
    }
});

// update entry
router.put('/:id', async (req, res) => {
    const { status, progress_pct, rating, notes, date_started, date_finished } = req.body;

    try {
        const [result] = await db.query(`
            UPDATE user_books
            SET status = ?,
                progress_pct = ?,
                rating = ?,
                notes = ?,
                date_started = ?,
                date_finished = ?
            WHERE user_id = ? AND id = ?`,
        [status, progress_pct, rating, notes, date_started, date_finished, req.session.user.id, req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Entry not found' });
        }

        res.json({ message: 'Entry updated successfully' });

    } catch (err) {
        res.status(500).json({ error: 'Something went wrong' });
    }
})

// delete entry
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM user_books WHERE id = ? AND user_id = ?', [req.params.id, req.session.user.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Entry not found' });
        }

        res.json({ message: 'Entry deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong' });
    }
})

module.exports = router;