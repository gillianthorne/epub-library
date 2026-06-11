const express = require('express');
const db = require('../db');

const router = express.Router();

// create author
router.post('/', async (req, res) => {
    const { name, bio } = req.body;

    try {
        const [result] = await db.query(`
            INSERT INTO authors (name, bio)
            VALUES (?, ?)
            `, [name, bio]
        );

        res.status(201).json({ message: "Author added successfully", id: result.insertId  });
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
    }
})

// read all authors 
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT authors.*, COUNT(book_authors.book_id) AS book_count
            FROM authors
            LEFT JOIN book_authors ON authors.id = book_authors.author_id
            GROUP BY authors.id
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" })
    }
});

// read one author by id
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT authors.*,
                COUNT(book_authors.book_id) AS book_count,
                GROUP_CONCAT(DISTINCT books.title) AS books
            FROM authors
            LEFT JOIN book_authors ON authors.id = book_authors.author_id
            LEFT JOIN books ON book_authors.book_id = books.id
            WHERE authors.id = ?
            GROUP BY authors.id
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Author not found' });
        }

        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
    }
})

router.put('/:id', async (req, res) => {
    const { name, bio } = req.body;

    try {
        const [result] = await db.query(`
            UPDATE authors
            SET name = ?, bio = ?
            WHERE id = ?
        `, [name, bio, req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Author not found' });
        }

        res.json({ message: 'Author updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong' });
    }
})

router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM authors WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Author not found' });
        }

        res.json({ message: 'Author deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong' });
    }
})