const express = require('express');
const db = require('../db');
const path = require('path');

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
            SELECT DISTINCT books.*,
                (SELECT JSON_OBJECT('id', s.id, 'name', s.name)
                                FROM series s
                                WHERE books.series_id = s.id) AS series,
                (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', a.id, 'name', a.name))
                    FROM book_authors ba
                    JOIN authors a ON ba.author_id = a.id
                    WHERE ba.book_id = books.id) AS authors,
                (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', g.id, 'name', g.name))
                    FROM book_genres bg
                    JOIN genres g ON bg.genre_id = g.id
                    WHERE bg.book_id = books.id) AS genres,
                (SELECT ub.status
					FROM user_books ub
					WHERE ub.book_id = books.id AND ub.user_id = ?
					ORDER BY ub.date_started DESC
					LIMIT 1) AS status,
                user_books.date_finished,
                tbr_lists.id AS tbr_id
            FROM books
            LEFT JOIN series ON books.series_id = series.id
            LEFT JOIN user_books ON books.id = user_books.book_id AND user_books.user_id = ?
            LEFT JOIN tbr_lists ON books.id = tbr_lists.book_id AND tbr_lists.user_id = ?
            GROUP BY books.id, user_books.status, user_books.date_finished, tbr_lists.id
            `, [req.session.user.id, req.session.user.id, req.session.user.id]);
        
        // found this on the internet and i do NOT understand it but i modified it to work
        rows.sort((a, b) => {
            const authorA = a.authors?.[0]?.name ?? '';
            const authorB = b.authors?.[0]?.name ?? '';
            return authorA.localeCompare(authorB);
        });
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
        console.log(err);
    }
});

// read book by id
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT books.*, 
                (SELECT JSON_OBJECT('id', s.id, 'name', s.name)
                                FROM series s
                                WHERE b.series_id = s.id) AS series,
                (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', a.id, 'name', a.name))
                    FROM book_authors ba
                    JOIN authors a ON ba.author_id = a.id
                    WHERE ba.book_id = books.id) AS authors,
                (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', g.id, 'name', g.name))
                    FROM book_genres bg
                    JOIN genres g ON bg.genre_id = g.id
                    WHERE bg.book_id = books.id) AS genres,
                tbr_lists.id AS tbr_id
            FROM books
            LEFT JOIN series ON books.series_id = series.id
            LEFT JOIN tbr_lists ON books.id = tbr_lists.book_id AND tbr_lists.user_id = ?
            WHERE books.id = ?
            GROUP BY books.id, tbr_lists.id
        `, [req.session.user.id, req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }

        // return the first row because there will only be one
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
    }
});

router.get('/:id/download', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });

    const [rows] = await db.query('SELECT epub_path, title FROM books WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Book not found' });

    res.download(path.join(__dirname, '..', '..', rows[0].epub_path), `${rows[0].title}.epub`);
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