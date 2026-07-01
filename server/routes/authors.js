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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;
    try {
        const [rows] = await db.query(`
            SELECT authors.*, 
                COUNT(book_authors.book_id) AS book_count,
                COUNT(*) OVER() AS total_count,
                CEIL(COUNT(*) OVER() / ?) AS total_pages
            FROM authors
            LEFT JOIN book_authors ON authors.id = book_authors.author_id
            GROUP BY authors.id
            ORDER BY authors.name ASC
            LIMIT ? OFFSET ?
        `, [
            limit,
            limit,
            offset
        ]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" })
    }
});

// read one author by id
router.get('/:id', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;
    try {
        const [rows] = await db.query(`
            WITH userbook_priorities AS
            (
            SELECT ub.id AS userbookid, b.id AS bookid, u.id AS userid,
            RANK() OVER 
                (PARTITION BY  b.id, u.id
                ORDER BY ub.date_started DESC) as ub_priority
            FROM user_books ub
            JOIN books b ON ub.book_id = b.id
            JOIN users u ON ub.user_id = u.id
            ), 
            book_count AS
            (
            SELECT COUNT(*) AS book_count,
                ba.author_id
            FROM book_authors ba
            GROUP BY ba.author_id
            )
            SELECT a.*,
                bc.book_count,
                ? AS page,
                CEIL(bc.book_count / ?) AS total_pages,
                COALESCE(
                    (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                        'id', paged.id, 
                        'title', paged.title, 
                        'cover_path', paged.cover_path,
                        'genres', (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', g.id, 'name', g.name))
                                    FROM book_genres bg
                                    JOIN genres g ON bg.genre_id = g.id
                                    WHERE bg.book_id = paged.id
                                    ORDER BY bg.genre_id),
                        'authors', (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', a.id, 'name', a.name))
                                    FROM book_authors ba
                                    JOIN authors a ON ba.author_id = a.id
                                    WHERE ba.book_id = paged.id
                                    ORDER BY ba.author_id),
                        'series', (SELECT JSON_OBJECT('id', s.id, 'name', s.name)
                                    FROM series s
                                    WHERE paged.series_id = s.id),
                        'tbr_id', paged.tbr_id,
                        'status', paged.status
                    ))
                        FROM (
                        SELECT b.id, b.title, b.cover_path, b.series_id,
                            t.id AS tbr_id,
                            ub.status
                        FROM book_authors ba
                        JOIN books b ON ba.book_id = b.id
                        LEFT JOIN tbr_lists t ON b.id = t.book_id AND t.user_id = ?
                        LEFT JOIN (
                            user_books ub
                            JOIN userbook_priorities ubp ON ub.id = ubp.userbookid AND ubp.ub_priority = 1
                        ) ON b.id = ub.book_id AND ub.user_id = ?
                        WHERE ba.author_id = a.id
                        ORDER BY b.series_id ASC, b.series_index ASC, b.title ASC
                        LIMIT ? OFFSET ?
                    ) AS paged),
                     JSON_ARRAY()
                ) AS books
            FROM authors a
            JOIN book_count bc ON bc.author_id = a.id
            WHERE a.id = ?
        `, [
            page,
            limit,
            req.session.user.id,
            req.session.user.id,
            limit,
            offset,
            req.params.id
        ]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Author not found' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.log(err)
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