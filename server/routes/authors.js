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
            with userbook_priorities as
            (
            SELECT ub.id as userbookid, b.id as bookid, u.id as userid,
            RANK() OVER 
                (PARTITION BY  b.id, u.id
                ORDER BY ub.date_started DESC) as ub_priority
            FROM user_books ub
            JOIN books b ON ub.book_id = b.id
            JOIN users u ON ub.user_id = u.id
            )
            SELECT DISTINCT a.*,
                (SELECT COUNT(*) FROM book_authors ba WHERE ba.author_id = a.id) AS book_count,
                (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                    'id', b.id, 
                    'title', b.title, 
                    'cover_path', b.cover_path,
                    'genres', (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', g.id, 'name', g.name))
                                FROM book_genres bg
                                JOIN genres g ON bg.genre_id = g.id
                                WHERE bg.book_id = b.id
                                ORDER BY bg.genre_id),
                    'authors', (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', a.id, 'name', a.name))
                                FROM book_authors ba
                                JOIN authors a ON ba.author_id = a.id
                                WHERE ba.book_id = b.id
                                ORDER BY ba.author_id),
                    'series', (SELECT JSON_OBJECT('id', s.id, 'name', s.name)
                                FROM series s
                                WHERE b.series_id = s.id),
                    'tbr_id', t.id,
                    'status', (SELECT ub.status
                                FROM user_books ub
                                WHERE ub.book_id = b.id AND ub.user_id = ?
                                ORDER BY ub.date_started DESC
                                LIMIT 1)))
                    FROM book_authors ba
                    JOIN books b ON ba.book_id = b.id
                    LEFT JOIN tbr_lists t ON b.id = t.book_id AND t.user_id = ?
                    LEFT JOIN (user_books ub join userbook_priorities ubp on ub.id = ubp.userbookid and ubp.ub_priority=1)
                    ON b.id = ub.book_id AND ub.user_id = ?
                    WHERE ba.author_id = a.id
                    ORDER BY b.id) AS book
            FROM authors a
            JOIN book_authors ba ON a.id = ba.author_id
            JOIN books b ON ba.book_id = b.id
            WHERE a.id = ?
        `, [req.session.user.id, req.session.user.id, req.session.user.id, req.params.id]);

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

module.exports = router;