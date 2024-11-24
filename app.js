const express = require('express');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const db = require('./models/database'); // MySQL database connection

const app = express();
const port = 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public'))); // Static files in 'public' folder
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Views
app.get('/', (req, res) => {
    console.log("Serving index.html"); // Debugging log
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Route for Exam Automation
app.get('/Exam_Automation', (req, res) => {
    console.log("Serving Exam_Automation.html"); // Debugging log
    res.sendFile(path.join(__dirname, 'views', 'Exam_Automation.html'));
});

// Route for Signup Page
app.get('/signup', (req, res) => {
    console.log("Serving signup.html"); // Debugging log
    res.sendFile(path.join(__dirname, 'views', 'signup.html'));
});

// Route for Reporting
app.get('/reporting', (req, res) => {
    console.log("Serving reporting.html"); // Debugging log
    res.sendFile(path.join(__dirname, 'views', 'reporting.html'));
});
app.get('/test', (req, res) => {
    console.log("Serving reporting.html"); // Debugging log
    res.sendFile(path.join(__dirname, 'views', 'test.html'));
});

// Route for Question Bank
app.get('/questionBank', (req, res) => {
    console.log("Serving questionBank.html"); // Debugging log
    res.sendFile(path.join(__dirname, 'views', 'questionBank.html'));
});

// Database Queries (fetching questions)
app.get('/api/questions/:subject', (req, res) => {
    const subject = req.params.subject;

    const query = 'SELECT question_text FROM questions WHERE subject = ?';
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
    const { questions, customName } = req.body;

    if (!questions || questions.length === 0) {
        return res.status(400).json({ success: false, error: 'No questions selected' });
    }

    // Sanitize custom name to prevent any invalid characters
    const sanitizedCustomName = customName ? customName.replace(/[^a-zA-Z0-9-_ ]/g, '') : null;
    const pdfFileName = sanitizedCustomName ? `${sanitizedCustomName}.pdf` : `ExamPaper-${Date.now()}.pdf`;
    const pdfFilePath = path.join(__dirname, 'papers', pdfFileName);

    try {
        const doc = new PDFDocument();
        doc.pipe(fs.createWriteStream(pdfFilePath));

        doc.fontSize(20).text('Exam Paper', { align: 'center' }).moveDown();

        questions.forEach((question, index) => {
            const questionText = question || '(No question text available)';
            doc.fontSize(12).text(`${index + 1}. ${questionText}`, { align: 'left' }).moveDown();
        });

        doc.end();

        // Save generated PDF file details in the database
        const query = 'INSERT INTO generated_pdfs (filename, created_at) VALUES (?, NOW())';
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

// Serve the Generated Papers Page
app.get('/generatedPapers', (req, res) => {
    console.log("Serving generatedPapers.html"); // Debugging log
    res.sendFile(path.join(__dirname, 'views', 'generatedPapers.html'));
});

// API to Fetch Generated Papers with Details
app.get('/api/generated-papers', (req, res) => {
    const query = 'SELECT filename, created_at FROM generated_pdfs ORDER BY created_at DESC';
    db.query(query, async (err, results) => {
        if (err) {
            console.error('Error fetching generated papers:', err);
            return res.status(500).json({ error: 'Failed to fetch generated papers' });
        }

        try {
            // Enrich results with file size, formatted date, and time
            const enrichedResults = await Promise.all(results.map(async (paper) => {
                const filePath = path.join(__dirname, 'papers', paper.filename);

                let fileSize = 'Unknown';
                try {
                    const stats = fs.statSync(filePath);
                    fileSize = (stats.size / 1024).toFixed(2) + ' KB'; // Convert size to KB
                } catch {
                    console.error(`File not found: ${paper.filename}`);
                }

                const createdAt = new Date(paper.created_at);
                const creationDate = createdAt.toLocaleDateString(); // Format: MM/DD/YYYY
                const creationTime = createdAt.toLocaleTimeString(); // Format: HH:MM:SS AM/PM

                return {
                    filename: paper.filename,
                    size: fileSize,
                    creationDate,
                    creationTime
                };
            }));

            res.json(enrichedResults);
        } catch (error) {
            console.error('Error processing papers:', error);
            res.status(500).json({ error: 'Failed to process generated papers' });
        }
    });
});

// Download PDF Route (downloads the generated paper)
app.get('/download-pdf/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'papers', req.params.filename);

    // Check if file exists before attempting to download
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).json({ error: 'File not found' });
        }
        res.download(filePath);
    });
});

// Server Start
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
