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

// Ensure papers directory exists
const papersDir = path.join(__dirname, 'papers');
if (!fs.existsSync(papersDir)) {
    fs.mkdirSync(papersDir);
}

// Serve Views
app.get('/', (req, res) => {
    console.log("Serving index.html");
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});
app.get('/reporting', (req, res) => {
    console.log("Serving reporting.html");
    res.sendFile(path.join(__dirname, 'views', 'reporting.html'));
});

app.get('/questionBank', (req, res) => {
    console.log("Serving questionBank.html");
    res.sendFile(path.join(__dirname, 'views', 'questionBank.html'));
});
app.get('/generatedPapers', (req, res) => {
    console.log("Serving generatedPapers.html");
    res.sendFile(path.join(__dirname, 'views', 'generatedPapers.html'));
});

// Database Query to Fetch Questions
app.get('/api/questions/:subject', (req, res) => {
    const { subject } = req.params;

    const query = `
        SELECT id, question_text, subject, year, question_type
        FROM subjective_questions
        WHERE subject = ?
    `;

    db.query(query, [subject], (err, results) => {
        if (err) {
            console.error('Error fetching questions:', err);
            return res.status(500).json({ error: 'Failed to fetch questions' });
        }

        const formattedResults = results.map((question) => ({
            id: question.id,
            question_text: question.question_text,
            subject: question.subject.toUpperCase(),
            year: `YEAR: ${question.year}`,
            question_type: `TYPE: ${question.question_type.toUpperCase()}`
        }));

        res.json(formattedResults);
    });
});
// Add New Question
app.post('/api/add-question', (req, res) => {
    const { subject, year, type, questionText } = req.body;

    // Validate input
    if (!subject || !year || !type || !questionText) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Insert the new question into the database
    const query = `
        INSERT INTO subjective_questions (question_text, year, subject, question_type)
        VALUES (?, ?, ?, ?)
    `;

    db.query(query, [questionText, year, subject, type], (err, result) => {
        if (err) {
            console.error('Error inserting new question:', err);
            return res.status(500).json({ success: false, error: 'Failed to save the question' });
        }

        // Return the inserted question ID as confirmation
        res.json({
            success: true,
            message: 'Question added successfully',
            questionId: result.insertId,
        });
    });
});

// Generate PDF Route
app.post('/generate-pdf', (req, res) => {
    const { subject, questions, pdfName } = req.body;

    if (!subject || !questions || questions.length === 0 || !pdfName) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const query = `
        SELECT question_text
        FROM subjective_questions
        WHERE id IN (?) AND subject = ?
    `;

    db.query(query, [questions, subject], (err, results) => {
        if (err) {
            console.error('Error fetching selected questions:', err);
            return res.status(500).json({ success: false, error: 'Failed to fetch selected questions' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, error: 'No questions found for the selected IDs' });
        }

        const sanitizedSubject = subject.replace(/[^a-zA-Z0-9-_ ]/g, '');
        const pdfFileName = `${pdfName.replace(/[^a-zA-Z0-9-_ ]/g, '')}-${sanitizedSubject}-${Date.now()}.pdf`;
        const pdfFilePath = path.join(papersDir, pdfFileName);

        try {
            const doc = new PDFDocument();
            const writeStream = fs.createWriteStream(pdfFilePath);

            doc.pipe(writeStream);

            doc.fontSize(20).text(`Exam Paper: ${subject.toUpperCase()}`, { align: 'center' }).moveDown();
            doc.fontSize(12).text('Questions:').moveDown();

            results.forEach((question, index) => {
                const questionText = question.question_text || '(No question text available)';
                doc.text(`${index + 1}. ${questionText}`).moveDown();
            });

            doc.end();

            writeStream.on('finish', () => {
                const insertQuery = 'INSERT INTO generated_pdfs (filename, created_at) VALUES (?, NOW())';
                db.query(insertQuery, [pdfFileName], (err) => {
                    if (err) {
                        console.error('Error saving PDF details:', err);
                        return res.status(500).json({ success: false, error: 'Failed to save PDF details in the database' });
                    }
                    res.json({ success: true, pdfFileName });
                });
            });

            writeStream.on('error', (error) => {
                console.error('Error writing PDF:', error);
                res.status(500).json({ success: false, error: 'Failed to generate PDF' });
            });
        } catch (error) {
            console.error('Error generating PDF:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });
});

// Get Subjects Dynamically
const subjectMapping = {
    math: "Mathematics",
    physics: "Physics",
    chemistry: "Chemistry",
    biology: "Biology",
    computer: "Computer Science"
};

app.get('/get-subjects', (req, res) => {
    const subjects = Object.keys(subjectMapping).map((key) => ({
        id: key,
        name: subjectMapping[key]
    }));
    res.json({ success: true, subjects });
});

// Generated Papers List
app.get('/api/generated-papers', (req, res) => {
    const query = 'SELECT filename, created_at FROM generated_pdfs ORDER BY created_at DESC';

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching generated papers:', err);
            return res.status(500).json({ error: 'Failed to fetch generated papers' });
        }

        const enrichedResults = results.map((paper) => {
            const filePath = path.join(papersDir, paper.filename);
            let fileSize = 'Unknown';

            try {
                const stats = fs.statSync(filePath);
                fileSize = (stats.size / 1024).toFixed(2) + ' KB';
            } catch {
                console.error(`File not found: ${paper.filename}`);
            }

            return {
                filename: paper.filename,
                size: fileSize,
                creationDate: new Date(paper.created_at).toLocaleDateString(),
                creationTime: new Date(paper.created_at).toLocaleTimeString()
            };
        });

        res.json(enrichedResults);
    });
});

// Download PDF
app.get('/download-pdf/:filename', (req, res) => {
    const filePath = path.join(papersDir, req.params.filename);

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).json({ error: 'File not found' });
        }
        res.download(filePath);
    });
});

// Rename PDF File
app.post('/rename-file', (req, res) => {
    const { oldFileName, newFileName } = req.body;
    const oldFilePath = path.join(papersDir, oldFileName);
    const newFilePath = path.join(papersDir, newFileName);

    // Rename file in the file system
    fs.rename(oldFilePath, newFilePath, (err) => {
        if (err) {
            console.error('Error renaming file:', err);
            return res.status(500).json({ success: false, error: 'Failed to rename file in the system' });
        }

        // Update file name in the database
        const updateQuery = 'UPDATE generated_pdfs SET filename = ? WHERE filename = ?';
        db.query(updateQuery, [newFileName, oldFileName], (err) => {
            if (err) {
                console.error('Error updating file name in the database:', err);
                return res.status(500).json({ success: false, error: 'Failed to update file name in the database' });
            }

            res.json({ success: true, message: 'File renamed successfully' });
        });
    });
});

// Delete PDF File
app.post('/delete-file', (req, res) => {
    const { fileName } = req.body;
    const filePath = path.join(papersDir, fileName);

    // Delete file from the file system
    fs.unlink(filePath, (err) => {
        if (err) {
            console.error('Error deleting file:', err);
            return res.status(500).json({ success: false, error: 'Failed to delete file from the system' });
        }

        // Delete file record from the database
        const deleteQuery = 'DELETE FROM generated_pdfs WHERE filename = ?';
        db.query(deleteQuery, [fileName], (err) => {
            if (err) {
                console.error('Error deleting file record from database:', err);
                return res.status(500).json({ success: false, error: 'Failed to delete file record from database' });
            }

            res.json({ success: true, message: 'File deleted successfully' });
        });
    });
});

// Server Start
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});