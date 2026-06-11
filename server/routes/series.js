const express = require('express');
const db = require('../db');

const router = express.Router();

// create series
router.post('/', async (req, res) => {
    const { name, is_complete, total_books } = req.body;

    try {
        const [result] = await db.query(`
            INSERT INTO series (name, is_complete, total_books)
            VALUES (?, ?, ?)
            `, [name, is_complete, total_books]
        );

        res.status(201).json({ message: "Series added successfully", id: result.insertId })

    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
    }
});

// read all series
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT series.*,
                COUNT(books.id) AS books_in_library
            FROM series
            LEFT JOIN books ON series.id = books.series_id 
            GROUP BY series.id`
        );
        res.json(rows)
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
    }
});

// read series by id
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT series.*,
                COUNT(books.id) AS books_in_library,
                GROUP_CONCAT(DISTINCT books.title ORDER BY books.series_index ASC) AS books
            FROM series
            LEFT JOIN books ON series.id = books.series_id
            WHERE series.id = ? 
            GROUP BY series.id
            `, [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Series not found' });
        }

        // return the first row because there will only be one
        res.json(rows[0]);
        
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
    }
})

// update series
router.put('/:id', async (req, res) => {
    const { name, is_complete, total_books } = req.body;

    try {
        const [result] = await db.query(`
            UPDATE series
            SET name = ?, is_complete = ?, total_books = ?
            WHERE id = ?`,
        [name, is_complete, total_books, req.params.id])

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Series not found' });
        }

        res.json({ message: 'Series updated successfully' });

    } catch (err) {
        res.status(500).json({ error: 'Something went wrong' });
    }
})

// delete series
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM series WHERE id = ?', [req.params.id])

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Series not found' });
        }

        res.json({ message: 'Series deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong' });
    }
})

module.exports = router;