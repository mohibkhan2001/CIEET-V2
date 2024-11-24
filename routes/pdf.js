const express = require('express');
const router = express.Router();
const db = require('../models/database');

// Route to store generated PDF
router.post('/save-pdf', (req, res) => {
    const { filename } = req.body;
    const query = 'INSERT INTO generated_pdfs (filename) VALUES (?)';

    db.query(query, [filename], (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error saving PDF details.');
            return;
        }
        res.send('PDF saved successfully!');
    });
});

module.exports = router;
