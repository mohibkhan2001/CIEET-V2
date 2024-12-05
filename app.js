
const express = require("express");
const bcrypt = require("bcrypt");
const { body, validationResult } = require("express-validator");
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

// Route to handle user registration (POST)
// const { body, validationResult } = require("express-validator");

app.post(
  "/signup",
  [
    body("firstname").notEmpty().withMessage("First name is required").trim().escape(),
    body("lastname").notEmpty().withMessage("Last name is required").trim().escape(),
    body("email").isEmail().withMessage("Enter a valid email").normalizeEmail(),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
    body("confirmPassword")
      .custom((value, { req }) => value === req.body.password)
      .withMessage("Passwords must match"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array().map((error) => error.msg),
      });
    }

    const { firstname, lastname, email, password } = req.body;

    // Check if the email already exists
    const checkEmailQuery = "SELECT * FROM users WHERE email = ?";
    db.query(checkEmailQuery, [email], async (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ errors: ["Database error occurred"] });
      }
      if (result.length > 0) {
        return res.status(400).json({ errors: ["Email already registered"] });
      }

      try {
        // Hash the password and save user to database
        const hashedPassword = await bcrypt.hash(password, 10);
        const insertUserQuery =
          "INSERT INTO users (firstname, lastname, email, password) VALUES (?, ?, ?, ?)";
        db.query(insertUserQuery, [firstname, lastname, email, hashedPassword], (err) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ errors: ["Error saving user"] });
          }
          res.json({ success: "Registered successfully" });
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ errors: ["Server error"] });
      }
    });
  }
);

app.post("/", async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res
      .status(400)
      .json({ errors: ["Email and password are required"] });
  }

  const query = "SELECT * FROM users WHERE email = ?";
  db.query(query, [email], async (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res
        .status(500)
        .json({ errors: ["An unexpected error occurred. Please try again."] });
    }

    if (results.length === 0) {
      return res
        .status(401)
        .json({ errors: ["Invalid email or password"] });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res
        .status(401)
        .json({ errors: ["Invalid email or password"] });
    }

    return res.json({ success: "Login successful" });
  });
});


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
const validateInput = (req, res, next) => {
  const { oldFileName, newFileName } = req.body;
  const isValidName = /^[a-zA-Z0-9-_ ]+$/.test(oldFileName) && /^[a-zA-Z0-9-_ ]+$/.test(newFileName);

  if (!isValidName) {
    return res.status(400).json({ success: false, error: "Invalid file name" });
  }
  next();
};

app.post('/rename-file', validateInput,  (req, res) => {
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
  res.sendFile(path.join(__dirname, "views", "login.html"));
});
app.get("/index", (req, res) => {
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
      const pdfFileName = `${sanitizedPdfName}-${sanitizedSubject}-${"CIEET"}.pdf`;
      const pdfFilePath = path.join(papersDir, pdfFileName);

      // Generate HTML for the PDF
      const htmlContent = `
  <html>
    <head>
      <style>
        body {
          font-family: 'Times New Roman', Times, serif;
          line-height: 1.8;
          margin: 20px;
          padding: 0;
        }
        h1 {
          text-align: center;
          font-size: 24px;
          margin-bottom: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          font-size: 16px;
          font-weight: bold;
          color: #2c3e50;
        }
        .name {
          display: inline-block;
          width: 30%;
          text-align: center;
          font-size: 10px;
          color: #34495e;
        }
        .question {
          margin: 30px 0;
          padding-left: 20px;
          padding-top: 10px;
          padding-bottom: 10px;
          font-size: 16px;
          page-break-inside: avoid;
          border-bottom: 1px dashed #000;
        }
        h2 {
          margin-left: 20px;
          font-size: 18px;
          font-weight: bold;
          color: #2c3e50;
        }
        .answer-space {
          margin-top: 10px;
          border-top: 1px solid #000;
          padding: 10px;
          height: 100px;
        }
        .options {
          margin-left: 40px;
          margin-top: 10px;
        }
        .option {
          display: inline-block;
          width: 45%;
          margin: 5px 0;
          font-size: 16px;
        }
        .page-break {
          page-break-before: always;
        }
        .footer {
          position: absolute;
          bottom: 20px;
          width: 100%;
          text-align: center;
          font-size: 14px;
          color: #7f8c8d;
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
        .map((q, i) => `
          <div class="question">
            ${i + 1}. ${q.question_text}
            <div class="answer-space">Answer:</div>
          </div>`)
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
      <div class="footer">Generated by Exam Automation System</div>
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
      
      // Log the file path to ensure it's correct
      console.log("Checking file path: ", filePath);

      let fileSize = "Unknown";
      let creationDate = "Unknown";
      let creationTime = "Unknown";

      try {
        const stats = fs.statSync(filePath);
        console.log("File stats: ", stats);  // Log stats to verify

        // File Size (in KB)
        fileSize = (stats.size / 1024).toFixed(2) + " KB";

        // Creation Date and Time
        const birthTime = stats.birthtime;
        creationDate = birthTime.toISOString().split('T')[0]; // YYYY-MM-DD
        creationTime = birthTime.toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
      } catch (err) {
        console.error(`Error fetching stats for file: ${paper.filename}`, err);
      }

      // Return enriched paper info
      return {
        ...paper,
        size: fileSize,
        creationDate: creationDate,
        creationTime: creationTime
      };
    });

    res.json({ papers: enrichedResults });
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});