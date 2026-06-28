const express = require('express');
const db = require('../db');

const router = express.Router();

// create genre
router.post('/', async (req, res) => {
    const { name } = req.body;

    try {
        const [result] = await db.query(`
            INSERT INTO genres (name)
            VALUES (?)
            `, [name]
        );

        res.status(201).json({ message: "Genre added successfully", id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
    }
})

// read all genres
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT genres.*,
                COUNT(book_genres.genre_id) AS book_count
            FROM genres
            LEFT JOIN book_genres ON genres.id = book_genres.genre_id
            GROUP BY genres.id`);

        res.json(rows)
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
    }
})

// read genres by id
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT genres.*,
                COUNT(book_genres.genre_id) AS book_count,
                GROUP_CONCAT(DISTINCT books.title) AS books
            FROM genres
            LEFT JOIN book_genres ON genres.id = book_genres.genre_id
            LEFT JOIN books ON book_genres.book_id = books.id
            WHERE genres.id = ?
            GROUP BY genres.id
            `, [req.params.id]);

            if (rows.length === 0) {
            return res.status(404).json({ error: 'Genre not found' });
        }

        // return the first row because there will only be one
        res.json(rows[0]);
        
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
    }
})

// update genre
router.put('/:id', async (req, res) => {
    const { name } = req.body;

    try {
        const [result] = await db.query(`
            UPDATE genres
            SET name = ?
            WHERE id = ?`,
        [name, req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Genre not found' });
        }

        res.json({ message: 'Genre updated successfully' });

    } catch (err) {
        res.status(500).json({ error: 'Something went wrong' });
    }
})

// delete genre
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM genres WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Genre not found' });
        }

        res.json({ message: 'Genre deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong' });
    }
})

module.exports = router;