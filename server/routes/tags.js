const express = require('express');
const db = require('../db');

const router = express.Router();

// create tag
router.post('/', async (req, res) => {
    const { name } = req.body;

    try {
        const [result] = await db.query(`
            INSERT INTO tags (name)
            VALUES (?)
            `, [name]
        );

        res.status(201).json({ message: "tag added successfully", id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
    }
})

// read all tags
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT tags.*,
                COUNT(book_tags.tag_id) AS book_count
            FROM tags
            LEFT JOIN book_tags ON tags.id = book_tags.tag_id
            GROUP BY tags.id`);

        res.json(rows)
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
    }
})

// read tags by id
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT tags.*,
                COUNT(book_tags.tag_id) AS book_count,
                GROUP_CONCAT(DISTINCT books.title) AS books
            FROM tags
            LEFT JOIN book_tags ON tags.id = book_tags.tag_id
            LEFT JOIN books ON book_tags.book_id = books.id
            WHERE tags.id = ?
            GROUP BY tags.id
            `, [req.params.id]);

            if (rows.length === 0) {
            return res.status(404).json({ error: 'tag not found' });
        }

        // return the first row because there will only be one
        res.json(rows[0]);
        
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
    }
})

// update tag
router.put('/:id', async (req, res) => {
    const { name } = req.body;

    try {
        const [result] = await db.query(`
            UPDATE tags
            SET name = ?
            WHERE id = ?`,
        [name, req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'tag not found' });
        }

        res.json({ message: 'tag updated successfully' });

    } catch (err) {
        res.status(500).json({ error: 'Something went wrong' });
    }
})

// delete tag
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM tags WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'tag not found' });
        }

        res.json({ message: 'tag deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong' });
    }
})

module.exports = router;