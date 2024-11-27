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

// Serve Views
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
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
              body { font-family: Arial, sans-serif; line-height: 1.6; }
              h1 { text-align: center; }
              .question { margin-bottom: 20px; }
              .options { margin-left: 20px; }
            </style>
          </head>
          <body>
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
                  A: ${q.option_a}<br>
                  B: ${q.option_b}<br>
                  C: ${q.option_c}<br>
                  D: ${q.option_d}
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
