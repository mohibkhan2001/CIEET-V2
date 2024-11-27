const express = require("express");
const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer"); // Puppeteer for PDF generation
const db = require("./models/database"); // MySQL database connection

const app = express();
const port = 3000;

// Middleware
app.use(express.static(path.join(__dirname, "public"))); // Static files in 'public' folder
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure papers directory exists
const papersDir = path.join(__dirname, "papers");
if (!fs.existsSync(papersDir)) {
  fs.mkdirSync(papersDir);
}
app.get('/download-pdf/:filename', (req, res) => {
    const fileName = req.params.filename;
    const filePath = path.join(papersDir, fileName); // Corrected path
    
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(500).send('Unable to download file');
        }
    });
});
app.post('/rename-file', (req, res) => {
    const { oldFileName, newFileName } = req.body;
    const oldFilePath = path.join(papersDir, oldFileName);
    const newFilePath = path.join(papersDir, newFileName);

    fs.rename(oldFilePath, newFilePath, (err) => {
        if (err) {
            console.error('Error renaming file:', err);
            return res.status(500).json({ success: false, error: 'Error renaming file' });
        }

        // Update the database with the new filename
        const updateQuery = 'UPDATE generated_pdfs SET filename = ? WHERE filename = ?';
        db.query(updateQuery, [newFileName, oldFileName], (err) => {
            if (err) {
                console.error('Error updating filename in database:', err);
                return res.status(500).json({ success: false, error: 'Error updating filename in database' });
            }

            res.json({ success: true });
        });
    });
});
app.post('/delete-file', (req, res) => {
    const { fileName } = req.body;
    const filePath = path.join(papersDir, fileName);

    fs.unlink(filePath, (err) => {
        if (err) {
            console.error('Error deleting file:', err);
            return res.status(500).json({ success: false, error: 'Error deleting file' });
        }

        // Remove from the database as well
        const deleteQuery = 'DELETE FROM generated_pdfs WHERE filename = ?';
        db.query(deleteQuery, [fileName], (err) => {
            if (err) {
                console.error('Error deleting file from database:', err);
                return res.status(500).json({ success: false, error: 'Error deleting file from database' });
            }

            res.json({ success: true });
        });
    });
});

// Serve Views
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});
app.get("/Exam_Automation", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "Exam_Automation.html"));
});
app.get("/reporting", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "reporting.html"));
});
app.get("/questionBank", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "questionBank.html"));
});
app.get("/generatedPapers", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "generatedPapers.html"));
});
app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "signup.html"));
});

// API Route to Fetch Both Subjective and MCQ Questions for a Specific Subject
app.get("/api/questions/:subject", (req, res) => {
  const { subject } = req.params;

  const subjectiveQuery = `
        SELECT id, question_text, subject, year, question_type
        FROM subjective_questions
        WHERE subject = ?
    `;
  const mcqQuery = `
        SELECT id, question_text, option_a, option_b, option_c, option_d, correct_answer
        FROM mcq_questions
        WHERE subject = ?
    `;

  db.query(subjectiveQuery, [subject], (err, subjectiveResults) => {
    if (err) return res.status(500).json({ error: "Failed to fetch subjective questions" });

    db.query(mcqQuery, [subject], (err, mcqResults) => {
      if (err) return res.status(500).json({ error: "Failed to fetch MCQs" });

      const formattedSubjective = subjectiveResults.map((q) => ({
        id: q.id,
        question_text: q.question_text,
        subject: q.subject.toUpperCase(),
        year: `YEAR: ${q.year}`,
        question_type: `TYPE: ${q.question_type.toUpperCase()}`,
      }));

      const formattedMcqs = mcqResults.map((q) => ({
        id: q.id,
        question_text: q.question_text,
        options: [
          { option: "A", text: q.option_a },
          { option: "B", text: q.option_b },
          { option: "C", text: q.option_c },
          { option: "D", text: q.option_d },
        ],
        correct_answer: q.correct_answer,
      }));

      res.json({ subjective: formattedSubjective, mcqs: formattedMcqs });
    });
  });
});

// Generate PDF Route with Puppeteer
app.post("/generate-pdf", async (req, res) => {
  const { subject, questions, pdfName } = req.body;

  if (!subject || !questions || questions.length === 0 || !pdfName) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  const subjectiveQuery = `
        SELECT question_text
        FROM subjective_questions
        WHERE id IN (?) AND subject = ?
    `;
  const mcqQuery = `
        SELECT question_text, option_a, option_b, option_c, option_d
        FROM mcq_questions
        WHERE id IN (?) AND subject = ?
    `;

  db.query(subjectiveQuery, [questions, subject], async (err, subjectiveResults) => {
    if (err) return res.status(500).json({ success: false, error: "Failed to fetch subjective questions" });

    db.query(mcqQuery, [questions, subject], async (err, mcqResults) => {
      if (err) return res.status(500).json({ success: false, error: "Failed to fetch MCQs" });

      const sanitizedSubject = subject.replace(/[^a-zA-Z0-9-_ ]/g, "");
      const sanitizedPdfName = pdfName.replace(/[^a-zA-Z0-9-_ ]/g, "");
      const pdfFileName = `${sanitizedPdfName}-${sanitizedSubject}-${Date.now()}.pdf`;
      const pdfFilePath = path.join(papersDir, pdfFileName);

      // Generate HTML for the PDF
      const htmlContent = `
  <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 0;
        }
        h1 {
          text-align: center;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        .name {
          display: inline-block;
          width: 30%;  /* Adjust the width as needed */
          text-align: center;
        }
        .question {
          margin: 20px 0;  /* Add margin for space between questions */
          padding-left: 20px; /* Left padding for the question text */
          padding-top: 10px;  /* Top padding for the question text */
          padding-bottom: 10px; /* Bottom padding for the question text */
          page-break-inside: avoid; /* Prevent question splitting across pages */
        }
        h2 {
          margin-left: 20px;
        }
        .options {
          margin-left: 40px; /* Increase left margin for options */
          margin-top: 10px; /* Top margin between question and options */
        }
        .option {
          display: inline-block;
          width: 45%;
          margin: 5px 0;
        }
        .page-break {
          page-break-before: always;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="name">Mohib Khan</div>
        <div class="name">Hassan Shaheer</div>
        <div class="name">Musadiq Balouch</div>
      </div>
      <h1>${subject.toUpperCase()} Exam Paper</h1>
      <h2>Subjective Questions</h2>
      ${subjectiveResults
        .map((q, i) => `<div class="question">${i + 1}. ${q.question_text}</div>`)
        .join("")}
      <h2>MCQ Questions</h2>
      ${mcqResults
        .map(
          (q, i) => `
            <div class="question">
              ${i + 1 + subjectiveResults.length}. ${q.question_text}
              <div class="options">
                <div class="option">a) ${q.option_a}</div>
                <div class="option">b) ${q.option_b}</div>
                <div class="option">c) ${q.option_c}</div>
                <div class="option">d) ${q.option_d}</div>
              </div>
            </div>`
        )
        .join("")}
    </body>
  </html>
`;


      try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        await page.setContent(htmlContent);
        await page.pdf({ path: pdfFilePath, format: "A4" });

        await browser.close();

        const insertQuery = "INSERT INTO generated_pdfs (filename, created_at) VALUES (?, NOW())";
        db.query(insertQuery, [pdfFileName], (err) => {
          if (err) return res.status(500).json({ success: false, error: "Failed to save PDF details" });

          res.json({ success: true, pdfFileName });
        });
      } catch (error) {
        console.error("Error generating PDF with Puppeteer:", error);
        res.status(500).json({ success: false, error: "Failed to generate PDF" });
      }
    });
  });
});

// Generated Papers List
app.get("/api/generated-papers", (req, res) => {
    const query = "SELECT filename, created_at FROM generated_pdfs ORDER BY created_at DESC";
  
    db.query(query, (err, results) => {
      if (err) return res.status(500).json({ error: "Failed to fetch generated papers" });
  
      const enrichedResults = results.map((paper) => {
        const filePath = path.join(papersDir, paper.filename);
        let fileSize = "Unknown";
  
        try {
          const stats = fs.statSync(filePath);
          fileSize = (stats.size / 1024).toFixed(2) + " KB";
        } catch {
          console.error(`File not found: ${paper.filename}`);
        }
  
        return { ...paper, size: fileSize };
      });
  
      res.json({ papers: enrichedResults });
    });
  });
  
// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
