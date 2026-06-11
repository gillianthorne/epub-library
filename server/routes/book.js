const express = require('express');
const db = require('../db');

const router = express.Router();

// create book
router.post('/', async(req, res) => {
    const { series_id, series_index, title, description, cover_path, epub_path, page_count, published_date } = req.body;

    try {
        const [result] = await db.query(`
            INSERT INTO books (series_id, series_index, title, description, cover_path, epub_path, page_count, published_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [series_id, series_index, title, description, cover_path, epub_path, page_count, published_date]
        );

        res.status(201).json({ message: "Book added successfully", id: result.insertId  });
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
    }
})

// read all books
router.get('/', async (req, res) => {
    try {
        // group_concat joins them all into a comma separated line
        const [rows] = await db.query(`
            SELECT books.*,
                series.name AS series_name,
                GROUP_CONCAT(DISTINCT authors.name) AS authors,
                GROUP_CONCAT(DISTINCT genres.name) AS genres
            FROM books
            LEFT JOIN series ON books.series_id = series.id
            LEFT JOIN book_authors ON books.id = book_authors.book_id
            LEFT JOIN authors ON book_authors.author_id = authors.id
            LEFT JOIN book_genres ON books.id = book_genres.book_id
            LEFT JOIN genres ON book_genres.genre_id = genres.id
            GROUP BY books.id
            `);
            res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
    }
});

// read book by id
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT books.*, 
                series.name AS series_name,
                GROUP_CONCAT(DISTINCT authors.name) AS authors,
                GROUP_CONCAT(DISTINCT genres.name) AS genres
            FROM books
            LEFT JOIN series ON books.series_id = series.id
            LEFT JOIN book_authors ON books.id = book_authors.book_id
            LEFT JOIN authors ON book_authors.author_id = authors.id
            LEFT JOIN book_genres ON books.id = book_genres.book_id
            LEFT JOIN genres ON book_genres.genre_id = genres.id
            LEFT JOIN book_tags ON books.id = book_tags.book_id
            LEFT JOIN tags ON book_tags.tag_id = tags.id
            WHERE books.id = ?
            GROUP BY books.id
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }

        // return the first row because there will only be one
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
    }
});

// update book
router.put('/:id', async (req, res) => {
    const { series_id, series_index, title, description, cover_path, epub_path, page_count, published_date } = req.body;

    try {
        const [result] = await db.query(`
            UPDATE books
            SET series_id = ?, series_index = ?, title = ?, description = ?, cover_path = ?, epub_path = ?, page_count = ?, published_date = ?
            WHERE id = ?
        `, [series_id, series_index, title, description, cover_path, epub_path, page_count, published_date, req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }

        res.json({ message: 'Book updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// delete book
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM books WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }

        res.json({ message: 'Book deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong' });
    }
});

module.exports = router;