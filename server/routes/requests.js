const express = require('express');
const db = require('../db');

const router = express.Router();

router.post('/', async (req, res) => {
    const { title, author, series, notes, source_url } = req.body;

    try {
        const [result] = await db.query(`
            INSERT INTO book_requests (user_id, title, author, series, notes, source_url)
            VALUES (?, ?, ?, ?, ?, ?)`,
        [req.session.user.id, title, author, series, notes, source_url]);

        res.status(201).json({ message: "Request added successfully", id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
    }
})

router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT book_requests.*,
                users.display_name
            FROM book_requests
            LEFT JOIN users ON book_requests.user_id = users.id`);
        
        res.json(rows)
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
    }
})

router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT book_requests.*,
                users.display_name
            FROM book_requests
            LEFT JOIN users ON book_requests.user_id = users.id
            WHERE book_requests.id = ?`, [req.params.id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        res.json(rows[0])
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
    }
})

router.put('/:id', async (req, res) => {
    const { status, fulfilled_book_id } = req.body;
    
    try {
        const [result] = await db.query(`
            UPDATE book_requests
            SET status = ?,
                fulfilled_book_id = ?
            WHERE id = ?`,
        [status, fulfilled_book_id, req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        res.json({ message: 'Request updated successfully' });

    } catch (err) {
        res.status(500).json({ error: 'Something went wrong' });
    }
})

router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM book_requests WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        res.json({ message: 'Request deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong' });
    }
})

module.exports = router;