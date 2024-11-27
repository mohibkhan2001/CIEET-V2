const express = require('express');
const router = express.Router();
const db = require('../models/database');

// Route to fetch questions by subject
router.get('/questions/:subject', (req, res) => {
    const subject = req.params.subject;
    const query = 'SELECT * FROM questions WHERE subject = ?';

    db.query(query, [subject], (err, results) => {
        if (err) {
            console.error(err); 
            res.status(500).send('Error fetching questions.');
            return;
        }
        res.json(results);
    });
});

module.exports = router;
