const express = require("express");
const session = require("express-session"); // Add express-session
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
app.use(
  "/Images/Diagram",
  express.static(path.join(__dirname, "Images/Diagram"))
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Configuration
app.use(
  session({
    secret: "your-secret-key", // Replace with a strong secret key
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 1000,
    }, // 1-hour session // 1-hour session
  })
);
// Route to handle user registration (POST)
// const { body, validationResult } = require("express-validator");

// --------- SIGNUP ROUTE -----------
app.post(
  "/signup",
  [
    body("firstname")
      .notEmpty()
      .withMessage("First name is required")
      .trim()
      .escape(),
    body("lastname")
      .notEmpty()
      .withMessage("Last name is required")
      .trim()
      .escape(),
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
      return res
        .status(400)
        .json({ errors: errors.array().map((error) => error.msg) });
    }

    const { firstname, lastname, email, password } = req.body;

    const checkEmailQuery = "SELECT * FROM users WHERE email = ?";
    db.query(checkEmailQuery, [email], async (err, result) => {
      if (err)
        return res.status(500).json({ errors: ["Database error occurred"] });
      if (result.length > 0)
        return res.status(400).json({ errors: ["Email already registered"] });

      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const insertUserQuery =
          "INSERT INTO users (firstname, lastname, email, password) VALUES (?, ?, ?, ?)";
        db.query(
          insertUserQuery,
          [firstname, lastname, email, hashedPassword],
          (err) => {
            if (err)
              return res.status(500).json({ errors: ["Error saving user"] });
            res.json({ success: "Registered successfully" });
          }
        );
      } catch (err) {
        res.status(500).json({ errors: ["Server error"] });
      }
    });
  }
);

// --------- LOGIN ROUTE -----------
app.post("/", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ errors: ["Email and password are required"] });
  }

  const query = "SELECT * FROM users WHERE email = ?";
  db.query(query, [email], async (err, results) => {
    if (err) {
      return res.status(500).json({ errors: ["Database error"] });
    }
    if (results.length === 0) {
      return res.status(401).json({ errors: ["Invalid email or password"] });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ errors: ["Invalid email or password"] });
    }

    // Store user details in session
    req.session.user = {
      id: user.user_id, // Ensure this matches the actual column name in your 'users' table
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
    };

    res.json({ success: "Login successful" });
  });
});

app.get("/api/user-info", (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ message: "Not logged in" });
  }
});

// --------- LOGOUT ROUTE -----------
app.post("/logout", (req, res) => {
  if (req.session.user) {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ error: "Failed to logout" });
      res.json({ success: "Logged out successfully" });
    });
  } else {
    res.status(400).json({ error: "No active session" });
  }
});

// Ensure papers directory exists
const papersDir = path.join(__dirname, "papers");
if (!fs.existsSync(papersDir)) {
  fs.mkdirSync(papersDir);
}

app.get("/download-pdf/:filename", (req, res) => {
  const fileName = req.params.filename;
  const filePath = path.join(papersDir, fileName); // Construct the correct file path

  // Check if the file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error("File not found:", err);
      return res.status(404).send("File not found");
    }

    // Send the file if it exists
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        return res.status(500).send("Unable to download file");
      }
    });
  });
});
const validateInput = (req, res, next) => {
  const { oldFileName, newFileName } = req.body;
  const isValidName =
    /^[a-zA-Z0-9-_ ]+$/.test(oldFileName) &&
    /^[a-zA-Z0-9-_ ]+$/.test(newFileName);

  if (!isValidName) {
    return res.status(400).json({ success: false, error: "Invalid file name" });
  }
  next();
};

app.post("/delete-file", (req, res) => {
  const { fileName } = req.body;
  const filePath = path.join(papersDir, fileName);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error("Error deleting file:", err);
      return res
        .status(500)
        .json({ success: false, error: "Error deleting file" });
    }

    // Remove from the database as well
    const deleteQuery = "DELETE FROM generated_pdfs WHERE filename = ?";
    db.query(deleteQuery, [fileName], (err) => {
      if (err) {
        console.error("Error deleting file from database:", err);
        return res
          .status(500)
          .json({ success: false, error: "Error deleting file from database" });
      }

      res.json({ success: true });
    });
  });
});
// Middleware to protect routes
function isLoggedIn(req, res, next) {
  if (!req.session.user) {
    // Redirect to login page if not logged in
    return res.sendFile(path.join(__dirname, "views", "login.html"));
  }
  next(); // Continue to the requested route if logged in
}

// Middleware to block access to "/" if the user is logged in
function redirectIfLoggedIn(req, res, next) {
  if (req.session.user) {
    // Redirect logged-in users to "/index"
    return res.redirect("/index");
  }
  next(); // Continue to login page if not logged in
}

// Public Route (Login Page) - Block access if already logged in
app.get("/", redirectIfLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

// Protected Routes (Require Login)
app.get("/index", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

app.get("/Exam_Automation", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "Exam_Automation.html"));
});

app.get("/reporting", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "reporting.html"));
});

app.get("/questionBank", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "questionBank.html"));
});

app.get("/generatedPapers", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "generatedPapers.html"));
});
// Route to fetch the generated papers (API)
app.get("/api/generated-papers", (req, res) => {
  // Ensure the user is logged in
  if (!req.session.user) {
    return res
      .status(401)
      .json({ errors: ["Please log in to view generated PDFs"] });
  }

  const userId = req.session.user.id; // Get user_id from the session

  // Query the database to get PDFs created by the logged-in user
  const query =
    "SELECT filename, created_at FROM generated_pdfs WHERE user_id = ?";
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ errors: ["Database error"] });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "No generated papers found" });
    }

    // Send the generated papers as JSON
    res.json({
      papers: results.map((paper) => ({
        filename: paper.filename,
        createdAt: paper.created_at, // Sending created_at as createdAt
      })),
    });
  });
});

app.get("/api/user-info", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ errors: ["User not logged in"] });
  }

  // Return the user's info (adjust as necessary based on your session data)
  res.json({ user: req.session.user });
});

app.post("/generatePdf", async (req, res) => {
  // Ensure the user is logged in
  if (!req.session.user) {
    return res
      .status(401)
      .json({ errors: ["Please log in to generate a PDF"] });
  }

  const userId = req.session.user.id; // User ID from session
  const { fileName, content } = req.body; // File name and content to generate PDF

  if (!fileName || !content) {
    return res
      .status(400)
      .json({ errors: ["File name and content are required"] });
  }

  try {
    // Path where the PDF will be saved
    const pdfDir = path.join(__dirname, "papers");
    const pdfPath = path.join(pdfDir, `${fileName}.pdf`);

    // Ensure the 'papers' directory exists
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir);
    }

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Set the content (assuming content is HTML)
    await page.setContent(content, { waitUntil: "networkidle0" });

    // Save the PDF
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    // Get the file size
    const fileSize = fs.statSync(pdfPath).size;

    // Insert the PDF details into the database
    const query = `
      INSERT INTO generated_pdfs (filename, user_id, size, created_at)
      VALUES (?, ?, ?, NOW())
    `;
    db.query(query, [`${fileName}.pdf`, userId, fileSize], (err) => {
      if (err) {
        console.error("Database Error:", err);
        return res
          .status(500)
          .json({ errors: ["Failed to save the generated PDF"] });
      }
      res.json({
        success: "PDF generated successfully",
        filePath: `/download-pdf/${fileName}.pdf`,
      });
    });
  } catch (err) {
    console.error("PDF Generation Error:", err);
    res.status(500).json({ errors: ["Failed to generate PDF"] });
  }
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
        WHERE subject = ?`;

  const mcqQuery = `
        SELECT id, question_text, option_a, option_b, option_c, option_d, correct_answer, year, type
        FROM mcq_questions
        WHERE subject = ?`;

  const diagramsQuery = `
        SELECT id, question_text, subject, year, type AS question_type, diagram_url
        FROM diagrams
        WHERE subject = ?`;

  db.query(subjectiveQuery, [subject], (err, subjectiveResults) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Failed to fetch subjective questions" });
    }

    db.query(mcqQuery, [subject], (err, mcqResults) => {
      if (err) {
        return res.status(500).json({ error: "Failed to fetch MCQs" });
      }

      db.query(diagramsQuery, [subject], (err, diagramsResults) => {
        if (err) {
          console.error("Error fetching diagrams:", err);
          return res.status(500).json({ error: "Failed to fetch diagrams" });
        }

        // Format subjective questions
        const formattedSubjective = subjectiveResults.map((q) => ({
          id: q.id,
          question_text: q.question_text,
          subject: q.subject.toUpperCase(),
          year: `YEAR: ${q.year}`,
          question_type: `subjective`, // Use "subjective" directly
        }));

        // Format MCQs
        const formattedMcqs = mcqResults.map((q) => ({
          id: q.id,
          question_text: q.question_text,
          year: `YEAR: ${q.year || "N/A"}`,
          type: q.type, // Should be 'objective' or 'subjective'
          options: [
            { option: "A", text: q.option_a || "N/A" },
            { option: "B", text: q.option_b || "N/A" },
            { option: "C", text: q.option_c || "N/A" },
            { option: "D", text: q.option_d || "N/A" },
          ],
          correct_answer: q.correct_answer || "N/A",
        }));

        // Format diagrams
        const formattedDiagrams = diagramsResults.map((q) => ({
          id: q.id,
          question_text: q.question_text,
          subject: q.subject.toUpperCase(),
          year: `YEAR: ${q.year}`,
          question_type: "diagram", // Use "type" as "question_type"
          diagram_url: q.diagram_url || "N/A", // Add diagram URL if available
        }));

        res.json({
          subjective: formattedSubjective,
          mcqs: formattedMcqs,
          diagrams: formattedDiagrams,
        });
      });
    });
  });
});

// Generate PDF Route with Puppeteer
app.post("/generate-pdf", async (req, res) => {
  const { subject, questions, pdfName } = req.body;

  if (!subject || !questions || questions.length === 0 || !pdfName) {
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });
  }

  // Strip the prefixes (subjective-, objective-, diagram-) from the question IDs
  const strippedQuestions = questions
    .map((question) => {
      const matches = question.match(/-(\d+)$/);
      if (matches) {
        return parseInt(matches[1]); // Extract the number from the ID (after the dash)
      }
      return null; // In case of unexpected format
    })
    .filter(Boolean); // Filter out any invalid IDs

  if (strippedQuestions.length === 0) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid question IDs" });
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
  const diagramsQuery = `
    SELECT question_text, diagram_url
    FROM diagrams
    WHERE id IN (?) AND subject = ?
  `;

  db.query(
    subjectiveQuery,
    [strippedQuestions, subject],
    async (err, subjectiveResults) => {
      if (err)
        return res
          .status(500)
          .json({
            success: false,
            error: "Failed to fetch subjective questions",
          });

      db.query(
        mcqQuery,
        [strippedQuestions, subject],
        async (err, mcqResults) => {
          if (err)
            return res
              .status(500)
              .json({ success: false, error: "Failed to fetch MCQs" });

          db.query(
            diagramsQuery,
            [strippedQuestions, subject],
            async (err, diagramResults) => {
              if (err)
                return res
                  .status(500)
                  .json({
                    success: false,
                    error: "Failed to fetch diagram questions",
                  });

              const sanitizedSubject = subject.replace(/[^a-zA-Z0-9-_ ]/g, "");
              const sanitizedPdfName = pdfName.replace(/[^a-zA-Z0-9-_ ]/g, "");
              const pdfFileName = `${sanitizedPdfName}-${sanitizedSubject}-CIEET.pdf`;
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
                .question-diagram img {
                  max-width: 100%;
                  height: auto;
                  margin-top: 10px;
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
                .map(
                  (q, i) => ` 
                    <div class="question">
                      ${i + 1}. ${q.question_text}
                      <div class="answer-space">Answer:</div>
                    </div>`
                )
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
           <h2>Diagram Questions</h2>
${diagramResults
  .map((q, i) => {
    const imageSrc = `http://localhost:3000/Images/Diagrams/${q.diagram_url}.png`;
    console.log("Final Image Source:", imageSrc);

    return `
      <div class="question">
        ${i + 1 + subjectiveResults.length + mcqResults.length}. ${q.question_text}
        <div class="question-diagram">
          <img src="${imageSrc}" alt="Diagram Question" />
        </div>
      </div>`;
  })
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

                const insertQuery =
                  "INSERT INTO generated_pdfs (filename, user_id, created_at) VALUES (?, ?, NOW())";
                db.query(
                  insertQuery,
                  [pdfFileName, req.session.user.id],
                  (err) => {
                    if (err)
                      return res
                        .status(500)
                        .json({
                          success: false,
                          error: "Failed to save PDF details",
                        });

                    res.json({ success: true, pdfFileName });
                  }
                );
              } catch (error) {
                console.error("Error generating PDF with Puppeteer:", error);
                res
                  .status(500)
                  .json({ success: false, error: "Failed to generate PDF" });
              }
            }
          );
        }
      );
    }
  );
});

// Generated Papers List
app.get("/api/generated-papers", (req, res) => {
  const query =
    "SELECT filename, size, created_at FROM generated_pdfs WHERE user_id = ? ORDER BY created_at DESC";
  db.query(query, [req.session.user.id], (err, results) => {
    if (err)
      return res
        .status(500)
        .json({ error: "Failed to fetch generated papers" });

    const enrichedResults = results.map((paper) => {
      const filePath = path.join(papersDir, paper.filename);

      // Log the file path to ensure it's correct
      console.log("Checking file path: ", filePath);

      let fileSize = "Unknown";
      let creationDate = "Unknown";
      let creationTime = "Unknown";

      try {
        const stats = fs.statSync(filePath);
        console.log("File stats: ", stats); // Log stats to verify

        // File Size (in KB)
        fileSize = (stats.size / 1024).toFixed(2) + " KB";

        // Creation Date and Time
        const birthTime = stats.birthtime;
        creationDate = birthTime.toISOString().split("T")[0]; // YYYY-MM-DD
        creationTime = birthTime.toISOString().split("T")[1].split(".")[0]; // HH:MM:SS
      } catch (err) {
        console.error(`Error fetching stats for file: ${paper.filename}`, err);
      }

      // Return enriched paper info
      return {
        ...paper,
        size: fileSize,
        creationDate: creationDate,
        creationTime: creationTime,
      };
    });

    res.json({ papers: enrichedResults });
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
