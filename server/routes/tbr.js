const express = require('express');
const db = require('../db');

const router = express.Router();
// create entry
router.post('/', async (req, res) => {
    const { book_id } = req.body;

    try {
        const [result] = await db.query(`
            INSERT INTO tbr_lists (user_id, book_id)
            VALUES (?, ?)`,
        [req.session.user.id, book_id])
        
        res.status(201).json({ message: "Entry added successfully", id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
    }
})

// get all tbr books by user
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT tbr_lists.*,
                books.title,
                GROUP_CONCAT(DISTINCT authors.name) AS authors,
                series.name AS series,
                books.cover_path
            FROM tbr_lists
            LEFT JOIN books ON tbr_lists.book_id = books.id
            LEFT JOIN book_authors ON books.id = book_authors.book_id
            LEFT JOIN authors ON book_authors.author_id = authors.id
            LEFT JOIN series ON books.series_id = series.id
            WHERE tbr_lists.user_id = ?
            GROUP BY tbr_lists.id
            `,
         [req.session.user.id]);

        res.json(rows)
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM tbr_lists WHERE id = ? AND user_id = ?', [req.params.id, req.session.user.id])
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Entry not found' });
        }

        res.json({ message: 'Entry deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong' });
    }
})

module.exports = router;