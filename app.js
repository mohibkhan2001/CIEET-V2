const express = require('express');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const db = require('./models/database'); // MySQL database connection

const app = express();
const port = 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Views
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});
app.get('/questionBank', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'questionBank.html'));
});

// Database Queries (without image)
app.get('/api/questions/:subject', (req, res) => {
    const subject = req.params.subject;

    const query = `SELECT question_text FROM questions WHERE subject = ?`;
    db.query(query, [subject], (err, results) => {
        if (err) {
            console.error('Error fetching questions:', err);
            return res.status(500).json({ error: 'Failed to fetch questions' });
        }
        res.json(results);
    });
});

// Generate PDF Route
app.post('/generate-pdf', (req, res) => {
    const { questions } = req.body;

    if (!questions || questions.length === 0) {
        return res.status(400).json({ success: false, error: 'No questions selected' });
    }

    const pdfFileName = `ExamPaper-${Date.now()}.pdf`;
    const pdfFilePath = path.join(__dirname, 'papers', pdfFileName);

    try {
        const doc = new PDFDocument();
        doc.pipe(fs.createWriteStream(pdfFilePath));

        doc.fontSize(20).text(`Exam Paper`, { align: 'center' }).moveDown();

        questions.forEach((question, index) => {
            const questionText = question || '(No question text available)';
            doc.fontSize(12).text(`${index + 1}. ${questionText}`, { align: 'left' }).moveDown();
        });

        doc.end();

        // Save to database
        const query = 'INSERT INTO generated_pdfs (filename) VALUES (?)';
        db.query(query, [pdfFileName], (err) => {
            if (err) {
                console.error('Error saving PDF details:', err);
                return res.status(500).json({ success: false, error: 'Failed to save PDF details' });
            }
            res.json({ success: true, pdfFileName });
        });
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ success: false, error: 'Failed to generate PDF' });
    }
});

// Fetch Generated Papers
app.get('/api/generated-papers', (req, res) => {
    const query = 'SELECT * FROM generated_pdfs ORDER BY created_at DESC';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching papers:', err);
            return res.status(500).json({ error: 'Failed to fetch generated papers' });
        }
        res.json(results);
    });
});

// Download PDF File
app.get('/download-pdf/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'papers', req.params.filename);
    res.download(filePath);
});

// Server Start
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

