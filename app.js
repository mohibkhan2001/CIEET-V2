const express = require("express");
const session = require("express-session"); // Add express-session
const bcrypt = require("bcrypt");
const { body, validationResult } = require("express-validator");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const puppeteer = require("puppeteer"); // Puppeteer for PDF generation
const db = require("./models/database"); // MySQL database connection
const router = express.Router();
const app = express();
const port = 3000;

// Middleware
app.use(express.static(path.join(__dirname, "public"))); // Static files in 'public' folder
app.use(
  "/Images/Diagram",
  express.static(path.join(__dirname, "Images/Diagram"))
);
// Middleware to check user role
// Middleware to check if the user's role matches the required role
function checkRole(requiredRole) {
  return (req, res, next) => {
    // Check if the logged-in user's role matches the required role or if they are 'Admin'
    if (
      req.session.user &&
      (req.session.user.role === requiredRole ||
        req.session.user.role === "Admin")
    ) {
      return next(); // Proceed if the user has the required role
    } else {
      // Respond with a 403 Forbidden error if the user does not have the required role
      return res.render("/");
    }
  };
}

// Middleware to prevent Teachers from accessing the StudentPortal
function preventTeacherAccess(req, res, next) {
  const userRole = req.session.user.role;
  if (userRole === "Teacher") {
    return res.redirect("/index"); // Redirect Teacher to the index page (or other page)
  }
  next(); // Allow Student to access the StudentPortal
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const resetUsersAutoIncrementIfEmpty = () => {
  const checkTableQuery = "SELECT COUNT(*) AS count FROM users";

  db.query(checkTableQuery, (err, result) => {
    if (err) {
      console.error("Error checking users table:", err);
      return;
    }

    const count = result[0].count;
    if (count === 0) {
      const resetQuery = "ALTER TABLE users AUTO_INCREMENT = 1";
      db.query(resetQuery, (err) => {
        if (err) {
          console.error("Error resetting AUTO_INCREMENT for users table:", err);
        } else {
          console.log(
            "AUTO_INCREMENT reset to 1 for users table as it is empty."
          );
        }
      });
    } else {
      console.log(`Users table is not empty. Current row count: ${count}`);
    }
  });
};

// Call the function when needed (e.g., during server startup or after a delete operation)
resetUsersAutoIncrementIfEmpty();

// Function to check and reset AUTO_INCREMENT
const resetAutoIncrementIfEmpty = () => {
  const checkTableQuery = "SELECT COUNT(*) AS count FROM generated_pdfs";

  db.query(checkTableQuery, (err, result) => {
    if (err) {
      console.error("Error checking table:", err);
      return;
    }

    const count = result[0].count;
    if (count === 0) {
      const resetQuery = "ALTER TABLE generated_pdfs AUTO_INCREMENT = 1";
      db.query(resetQuery, (err) => {
        if (err) {
          console.error("Error resetting AUTO_INCREMENT:", err);
        } else {
          console.log("AUTO_INCREMENT reset to 1 as the table is empty.");
        }
      });
    } else {
      console.log(
        `generated_pdfs Table is not empty. Current row count: ${count}`
      );
    }
  });
};

// Call the function when needed (e.g., during server startup or after a delete operation)
resetAutoIncrementIfEmpty();

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
    body("role")
      .isIn(["Teacher", "Student"])
      .withMessage("Role must be either Teacher or Student"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ errors: errors.array().map((error) => error.msg) });
    }

    const { firstname, lastname, email, password, role } = req.body;

    // Check if email already exists in `users` or `pending_approvals`
    const checkEmailQuery =
      "SELECT email FROM users WHERE email = ? UNION SELECT email FROM pending_approvals WHERE email = ?";
    db.query(checkEmailQuery, [email, email], async (err, result) => {
      if (err)
        return res.status(500).json({ errors: ["Database error occurred"] });
      if (result.length > 0)
        return res
          .status(400)
          .json({ errors: ["Email already registered or pending approval"] });

      try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert into `pending_approvals` table
        const insertPendingUserQuery =
          "INSERT INTO pending_approvals (firstname, lastname, email, password, role) VALUES (?, ?, ?, ?, ?)";
        db.query(
          insertPendingUserQuery,
          [firstname, lastname, email, hashedPassword, role],
          (err) => {
            if (err)
              return res
                .status(500)
                .json({ errors: ["Error saving pending approval"] });
            res.json({
              success: "Signup successful! Awaiting admin approval.",
            });
          }
        );
      } catch (err) {
        res.status(500).json({ errors: ["Server error"] });
      }
    });
  }
);

app.delete("/api/users", (req, res) => {
  const deleteQuery = "DELETE FROM users";

  db.query(deleteQuery, (err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to delete users" });
    }

    resetUsersAutoIncrementIfEmpty();

    res
      .status(200)
      .json({ message: "All users deleted and AUTO_INCREMENT reset" });
  });
});

// --------- LOGIN ROUTE -----------
// Login Route (POST /login)
// Login Route (POST /login)
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ errors: ["Email and password are required"] });
  }

  const query = "SELECT * FROM users WHERE email = ?";
  db.query(query, [email], async (err, results) => {
    if (err) {
      console.error("Database error:", err);
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
      id: user.user_id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role, // Store role in the session
    };

    // Redirect based on role
    if (user.role === "Teacher") {
      return res.json({ success: "Login successful", redirectUrl: "/index" });
    } else if (user.role === "Student") {
      return res.json({
        success: "Login successful",
        redirectUrl: "/StudentPortal",
      });
    } else if (user.role === "Admin") {
      return res.json({ success: "Login successful", redirectUrl: "/Admin" });
    } else {
      return res.status(401).json({ errors: ["Invalid role"] });
    }
  });
});

app.get("/api/user-info", (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ message: "Not logged in" });
  }
});

// Fetch all users (Admin only)
// Fetch users without using Promises
app.get("/api/users", isLoggedIn, checkRole("Admin"), (req, res) => {
  // Use the callback-based query method
  db.query(
    "SELECT user_id, firstname, lastname, email, role FROM users",
    (err, results) => {
      if (err) {
        console.error("Error fetching users:", err);
        return res.status(500).json({ error: "Failed to fetch users" });
      }

      // Send the results to the client
      res.status(200).json(results);
    }
  );
});

// Delete a user by ID (Admin only)
app.delete(
  "/api/users/:id",
  isLoggedIn,
  checkRole("Admin"),
  async (req, res) => {
    const { id } = req.params;

    try {
      // Use promise-based query for better async handling
      const result = await db
        .promise()
        .query("DELETE FROM users WHERE user_id = ?", [id]);

      if (result[0].affectedRows === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.status(200).json({ success: "User deleted successfully" });
    } catch (err) {
      console.error("Error deleting user:", err);
      res.status(500).json({ error: "Failed to delete user" });
    }
  }
);

app.get("/api/pending-approvals", (req, res) => {
  const query = "SELECT * FROM pending_approvals";
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Database error occurred" });
    }
    res.json(results);
  });
});

app.post("/api/pending-approvals/:id/approve", (req, res) => {
  const userId = req.params.id;

  // Fetch the user from pending approvals
  const fetchQuery = "SELECT * FROM pending_approvals WHERE id = ?";
  db.query(fetchQuery, [userId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(500).json({ error: "Error fetching user" });
    }

    const user = results[0];

    // Move user to `users` table
    const insertQuery =
      "INSERT INTO users (firstname, lastname, email, password, role) VALUES (?, ?, ?, ?, ?)";
    db.query(
      insertQuery,
      [user.firstname, user.lastname, user.email, user.password, user.role],
      (err) => {
        if (err) {
          return res.status(500).json({ error: "Error approving user" });
        }

        // Delete the user from pending approvals
        const deleteQuery = "DELETE FROM pending_approvals WHERE id = ?";
        db.query(deleteQuery, [userId], (err) => {
          if (err) {
            return res
              .status(500)
              .json({ error: "Error cleaning up pending user" });
          }
          res.json({ success: "User approved and moved to users table" });
        });
      }
    );
  });
});

app.delete("/api/pending-approvals/:id/deny", (req, res) => {
  const userId = req.params.id;

  const deleteQuery = "DELETE FROM pending_approvals WHERE id = ?";
  db.query(deleteQuery, [userId], (err) => {
    if (err) {
      return res.status(500).json({ error: "Error denying user" });
    }
    res.json({ success: "User denied and removed from pending approvals" });
  });
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
    // Respond with a 401 Unauthorized error if the user is not logged in
    return res.redirect("/");
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

// Route for Student Portal (Prevent Teacher from Accessing)
app.get("/StudentPortal", isLoggedIn, preventTeacherAccess, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "StudentPortal.html")); // Serve StudentPortal page
});

// Protected Routes for Teacher (Require Login and Role)
app.get("/index", isLoggedIn, checkRole("Teacher"), (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html")); // Serve index page for Teachers
});
app.get("/std_exam", isLoggedIn, checkRole("Student"), (req, res) => {
  res.sendFile(path.join(__dirname, "views", "std_exam.html")); // Serve index page for Teachers
});

app.get("/generatedPapers", isLoggedIn, checkRole("Teacher"), (req, res) => {
  res.sendFile(path.join(__dirname, "views", "generatedPapers.html")); // Serve generated papers page for Teachers
});

app.get(
  "/questionBank",
  isLoggedIn,
  checkRole("Teacher" || "Admin"),
  (req, res) => {
    res.sendFile(path.join(__dirname, "views", "questionBank.html")); // Serve question bank page for Teachers
  }
);

app.get("/Exam_Automation", isLoggedIn, checkRole("Teacher"), (req, res) => {
  res.sendFile(path.join(__dirname, "views", "Exam_Automation.html")); // Serve exam automation page for Teachers
});

app.get("/reporting", isLoggedIn, checkRole("Teacher"), (req, res) => {
  res.sendFile(path.join(__dirname, "views", "reporting.html")); // Serve reporting page for Teachers
});

// Route for Admin only
app.get("/Admin", isLoggedIn, checkRole("Admin"), (req, res) => {
  res.sendFile(path.join(__dirname, "views", "Admin.html")); // Serve admin page
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

// API Route to Fetch Subjective, Diagram and MCQ Questions for a Specific Subject with Pagination
app.get("/api/questions/:subject", (req, res) => {
  const { subject } = req.params;
  const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
  const limit = 10; // Set number of questions per page
  const offset = (page - 1) * limit; // Calculate offset based on the page number

  // Queries for fetching questions
  const subjectiveQuery = `
    SELECT id, question_text, subject, year, question_type
    FROM subjective_questions
    WHERE subject = ?
    LIMIT ? OFFSET ?`;

  const mcqQuery = `
    SELECT id, question_text, option_a, option_b, option_c, option_d, correct_answer, year, type
    FROM mcq_questions
    WHERE subject = ?
    LIMIT ? OFFSET ?`;

  const diagramsQuery = `
    SELECT id, question_text, subject, year, type AS question_type, diagram_url
    FROM diagrams
    WHERE subject = ?
    LIMIT ? OFFSET ?`;

  // Fetch subjective questions
  db.query(
    subjectiveQuery,
    [subject, limit, offset],
    (err, subjectiveResults) => {
      if (err)
        return res
          .status(500)
          .json({ error: "Failed to fetch subjective questions" });

      // Fetch MCQ questions
      db.query(mcqQuery, [subject, limit, offset], (err, mcqResults) => {
        if (err) return res.status(500).json({ error: "Failed to fetch MCQs" });

        // Fetch diagram questions
        db.query(
          diagramsQuery,
          [subject, limit, offset],
          (err, diagramsResults) => {
            if (err)
              return res
                .status(500)
                .json({ error: "Failed to fetch diagrams" });

            // Count questions per category for pagination
            const countSubjectiveQuery = `SELECT COUNT(*) as total FROM subjective_questions WHERE subject = ?`;
            const countMcqQuery = `SELECT COUNT(*) as total FROM mcq_questions WHERE subject = ?`;
            const countDiagramsQuery = `SELECT COUNT(*) as total FROM diagrams WHERE subject = ?`;

            // Counting subjective questions
            db.query(
              countSubjectiveQuery,
              [subject],
              (err, countSubjective) => {
                if (err)
                  return res
                    .status(500)
                    .json({ error: "Failed to count subjective questions" });

                // Counting MCQ questions
                db.query(countMcqQuery, [subject], (err, countMcq) => {
                  if (err)
                    return res
                      .status(500)
                      .json({ error: "Failed to count MCQs" });

                  // Counting diagram questions
                  db.query(
                    countDiagramsQuery,
                    [subject],
                    (err, countDiagrams) => {
                      if (err)
                        return res
                          .status(500)
                          .json({ error: "Failed to count diagrams" });

                      // Format subjective questions
                      const formattedSubjective = subjectiveResults.map(
                        (q) => ({
                          id: q.id,
                          question_text: q.question_text,
                          subject: q.subject.toUpperCase(),
                          year: `YEAR: ${q.year}`,
                          question_type: "subjective", // Hardcoded as "subjective"
                        })
                      );

                      // Format MCQs
                      const formattedMcqs = mcqResults.map((q) => ({
                        id: q.id,
                        question_text: q.question_text,
                        year: `YEAR: ${q.year || "N/A"}`,
                        question_type: "objective",
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
                        question_type: "diagram", // Hardcoded as "diagram"
                        diagram_url: q.diagram_url || "N/A", // Add diagram URL if available
                      }));

                      // Send the formatted data along with pagination info
                      res.json({
                        subjective: formattedSubjective,
                        mcqs: formattedMcqs,
                        diagrams: formattedDiagrams,
                        totalQuestions:
                          countSubjective[0].total +
                          countMcq[0].total +
                          countDiagrams[0].total, // Combine totals
                        pagination: {
                          subjective: {
                            total: countSubjective[0].total,
                            pages: Math.ceil(countSubjective[0].total / limit),
                            currentPage: page,
                          },
                          mcqs: {
                            total: countMcq[0].total,
                            pages: Math.ceil(countMcq[0].total / limit),
                            currentPage: page,
                          },
                          diagrams: {
                            total: countDiagrams[0].total,
                            pages: Math.ceil(countDiagrams[0].total / limit),
                            currentPage: page,
                          },
                        },
                      });
                    }
                  );
                });
              }
            );
          }
        );
      });
    }
  );
});

// Ensure the Images/Diagrams directory inside public exists
const diagramDir = path.join(__dirname, "public", "Images", "Diagrams");
if (!fs.existsSync(diagramDir)) {
  fs.mkdirSync(diagramDir, { recursive: true }); // Create directory if it doesn't exist
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, diagramDir); // Save to public/Images/Diagrams/
  },
  filename: (req, file, cb) => {
    const extname = path.extname(file.originalname); // Get the file extension (e.g., .png)
    const filenameWithoutExtension = path.basename(file.originalname, extname); // Get the filename without extension
    cb(null, `${filenameWithoutExtension}${extname}`); // Save with the original name and extension
  },
});

// Multer Upload Middleware
const upload = multer({ storage });

// Route to add a new diagram question
app.post(
  "/api/questions/diagrams",
  upload.single("diagram_image"),
  (req, res) => {
    const { question_text, subject, year } = req.body; // Extract form fields
    const diagram_url = req.file
      ? path.basename(req.file.filename) // Save the full filename with extension in the DB
      : null;

    if (!diagram_url) {
      return res.status(400).json({ error: "Diagram image is required" });
    }

    // Insert into the database with the full filename (including extension)
    const insertQuery = `
    INSERT INTO diagrams (question_text, subject, year, type, diagram_url)
    VALUES (?, ?, ?, 'diagram', ?)
  `;

    db.query(
      insertQuery,
      [question_text, subject, year, diagram_url],
      (err, result) => {
        if (err) {
          console.error("Error adding diagram question:", err);
          return res
            .status(500)
            .json({ error: "Failed to add diagram question" });
        }

        res.status(201).json({
          message: "Diagram question added successfully",
          id: result.insertId,
          diagram_url: `/Images/Diagrams/${diagram_url}`, // Return the full path to the image with extension
        });
      }
    );
  }
);

// Route to add a new subjective question
app.post("/api/questions/subjective", upload.none(), (req, res) => {
  const { question_text, subject, year } = req.body;

  const insertQuery = `
        INSERT INTO subjective_questions (question_text, subject, year, question_type)
        VALUES (?, ?, ?, 'subjective')`;

  db.query(insertQuery, [question_text, subject, year], (err, result) => {
    if (err) {
      console.error("Error adding subjective question:", err);
      return res
        .status(500)
        .json({ error: "Failed to add subjective question" });
    }
    res.status(201).json({
      message: "Subjective question added successfully",
      id: result.insertId,
    });
  });
});

// Route to add a new MCQ question
app.post("/api/questions/mcq", upload.none(), (req, res) => {
  console.log(req.body); // Log the incoming request data to verify
  const {
    question_text,
    subject,
    year,
    option_a,
    option_b,
    option_c,
    option_d,
    correct_answer,
    type,
  } = req.body;

  // Ensure all fields are being passed correctly
  if (
    !question_text ||
    !subject ||
    !year ||
    !option_a ||
    !option_b ||
    !option_c ||
    !option_d ||
    !correct_answer ||
    !type
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const insertQuery = `
        INSERT INTO mcq_questions (question_text, subject, year, option_a, option_b, option_c, option_d, correct_answer, type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(
    insertQuery,
    [
      question_text,
      subject,
      year,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_answer,
      type,
    ],
    (err, result) => {
      if (err) {
        console.error("Error adding MCQ question:", err);
        return res.status(500).json({ error: "Failed to add MCQ question" });
      }
      res.status(201).json({
        message: "MCQ question added successfully",
        id: result.insertId,
      });
    }
  );
});

// Generate PDF Route with Puppeteer
app.post("/generate-pdf", async (req, res) => {
  const { subject, questions, pdfName } = req.body;

  if (!subject || !questions || questions.length === 0 || !pdfName) {
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });
  }

  // Separate questions by type and ID
  const subjectiveQuestions = [];
  const mcqQuestions = [];
  const diagramQuestions = [];

  questions.forEach((question) => {
    const [type, id] = question.split("-"); // Split type and ID
    const parsedId = parseInt(id);

    if (!parsedId) return; // Skip invalid IDs

    if (type === "subjective") subjectiveQuestions.push(parsedId);
    if (type === "objective") mcqQuestions.push(parsedId);
    if (type === "diagram") diagramQuestions.push(parsedId);
  });

  if (
    subjectiveQuestions.length === 0 &&
    mcqQuestions.length === 0 &&
    diagramQuestions.length === 0
  ) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid or missing question IDs" });
  }

  try {
    // Queries to fetch questions
    const subjectiveQuery = `SELECT question_text FROM subjective_questions WHERE id IN (?) AND subject = ?`;
    const mcqQuery = `SELECT question_text, option_a, option_b, option_c, option_d FROM mcq_questions WHERE id IN (?) AND subject = ?`;
    const diagramsQuery = `SELECT question_text, diagram_url FROM diagrams WHERE id IN (?) AND subject = ?`;

    // Fetch data for each type
    const subjectiveResults = subjectiveQuestions.length
      ? await new Promise((resolve, reject) => {
          db.query(
            subjectiveQuery,
            [subjectiveQuestions, subject],
            (err, results) => {
              if (err) reject(err);
              else resolve(results);
            }
          );
        })
      : [];

    const mcqResults = mcqQuestions.length
      ? await new Promise((resolve, reject) => {
          db.query(mcqQuery, [mcqQuestions, subject], (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        })
      : [];

    const diagramResults = diagramQuestions.length
      ? await new Promise((resolve, reject) => {
          db.query(
            diagramsQuery,
            [diagramQuestions, subject],
            (err, results) => {
              if (err) reject(err);
              else resolve(results);
            }
          );
        })
      : [];

    // Sanitize file name and subject for the PDF
    const sanitizedSubject = subject.replace(/[^a-zA-Z0-9-_ ]/g, "");
    const sanitizedPdfName = pdfName.replace(/[^a-zA-Z0-9-_ ]/g, "");
    const pdfFileName = `${sanitizedPdfName}-${sanitizedSubject}-CIEET.pdf`;
    const pdfFilePath = path.join(papersDir, pdfFileName);

    // Generate HTML content
    const subjectiveSection = subjectiveResults
      .map(
        (q, i) =>
          `<div class="question">${i + 1}. ${
            q.question_text
          }<div class="answer-space">Answer:</div></div>`
      )
      .join("");

    const mcqSection = mcqResults
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
          </div>
        `
      )
      .join("");

    const diagramSection = diagramResults
      .map(
        (q, i) => `
          <div class="question">
            ${i + 1 + subjectiveResults.length + mcqResults.length}. ${
          q.question_text
        }
            <div class="question-diagram">
              <img src="http://localhost:3000/Images/Diagrams/${
                q.diagram_url
              }" alt="Diagram Question" />
            </div>
          </div>
        `
      )
      .join("");

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
              max-width: 80%;
              max-height: 300px;
              height: auto;
              margin-top: 10px;
              display: block;
              margin-left: auto;
              margin-right: auto;
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
          <h1>${sanitizedSubject.toUpperCase()} Exam Paper</h1>
          ${subjectiveSection}
          ${mcqSection}
          ${diagramSection}
          <div class="footer"><strong>CIE²T</strong></div>
        </body>
      </html>
    `;

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    await page.pdf({ path: pdfFilePath, format: "A4" });
    await browser.close();

    // Save PDF details in the database
    const insertQuery = `INSERT INTO generated_pdfs (filename, user_id, created_at) VALUES (?, ?, NOW())`;
    await new Promise((resolve, reject) => {
      db.query(insertQuery, [pdfFileName, req.session.user.id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ success: true, pdfFileName });
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ success: false, error: "Failed to generate PDF" });
  }
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
// Generate Exam Endpoint
app.post("/api/generate-exam", (req, res) => {
  const { selectedQuestions } = req.body;

  // Validate input
  if (!Array.isArray(selectedQuestions) || selectedQuestions.length === 0) {
    return res
      .status(400)
      .json({ error: "No questions selected for the exam." });
  }

  // Classify questions by type
  const subjective = [];
  const objective = [];
  const diagram = [];

  selectedQuestions.forEach((question) => {
    const [type, id] = question.split("-");
    if (type === "subjective") subjective.push(id);
    if (type === "objective") objective.push(id);
    if (type === "diagram") diagram.push(id);
  });

  // Validate IDs are numeric
  const isValidId = (id) => /^\d+$/.test(id);
  if (![...subjective, ...objective, ...diagram].every(isValidId)) {
    return res.status(400).json({ error: "Invalid question ID detected." });
  }

  // Check the number of rows in the table and reset ID if necessary
  const checkTableQuery = "SELECT COUNT(*) AS count FROM generated_exams";
  db.query(checkTableQuery, (err, results) => {
    if (err) {
      console.error("Error checking table count:", err);
      return res.status(500).json({ error: "An error occurred while processing the request." });
    }

    const rowCount = results[0].count;
    console.log(`Current number of rows in the table: ${rowCount}`);

    if (rowCount === 0) {
      const resetIdQuery = "ALTER TABLE generated_exams AUTO_INCREMENT = 1";
      db.query(resetIdQuery, (err) => {
        if (err) {
          console.error("Error resetting AUTO_INCREMENT:", err);
          return res.status(500).json({ error: "An error occurred while resetting the table." });
        }
        console.log("Table ID reset to 1.");
      });
    }

    // Prepare the exam data
    const examData = {
      subjective: subjective.length,
      objective: objective.length,
      diagram: diagram.length,
      subjective_questions: JSON.stringify(subjective),
      objective_questions: JSON.stringify(objective),
      diagram_questions: JSON.stringify(diagram),
      created_at: new Date(),
    };

    const query = `
      INSERT INTO generated_exams (subjective, objective, diagram, subjective_questions, objective_questions, diagram_questions, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      examData.subjective,
      examData.objective,
      examData.diagram,
      examData.subjective_questions,
      examData.objective_questions,
      examData.diagram_questions,
      examData.created_at,
    ];

    // Execute the query using a callback
    db.query(query, values, (err, result) => {
      if (err) {
        console.error("Error saving exam:", err);
        return res
          .status(500)
          .json({ error: "An error occurred while generating the exam." });
      }

      // Respond with the generated exam ID
      res.status(201).json({
        message: "Exam generated successfully",
        examId: result.insertId,
      });
    });
  });
});


app.get("/api/exam", (req, res) => {
  const { examId } = req.query; // Get examId from query parameters

  if (!examId) {
      return res.status(400).json({ error: "Exam ID is required." });
  }

  // Fetch exam metadata from the 'generated_exams' table based on exam_id
  db.query("SELECT * FROM generated_exams WHERE exam_id = ?", [examId], (err, examData) => {
      if (err) {
          console.error("Error fetching exam metadata:", err);
          return res.status(500).json({ error: "Database error while fetching exam metadata." });
      }

      if (examData.length === 0) {
          return res.status(404).json({ error: "Exam not found." });
      }

      const { subjective_questions, objective_questions, diagram_questions } = examData[0];
      let subjectiveIds = [], objectiveIds = [], diagramIds = [];

      try {
          subjectiveIds = subjective_questions ? JSON.parse(subjective_questions) : [];
          objectiveIds = objective_questions ? JSON.parse(objective_questions) : [];
          diagramIds = diagram_questions ? JSON.parse(diagram_questions) : [];
      } catch (parseError) {
          console.error("Error parsing question IDs:", parseError);
          return res.status(500).json({ error: "Error parsing question data." });
      }

      // Fetch questions based on IDs
      const subjectiveQuery = subjectiveIds.length
          ? "SELECT * FROM subjective_questions WHERE id IN (?)"
          : "SELECT * FROM subjective_questions WHERE 1=0";
      const objectiveQuery = objectiveIds.length
          ? "SELECT * FROM mcq_questions WHERE id IN (?)"
          : "SELECT * FROM mcq_questions WHERE 1=0";
      const diagramQuery = diagramIds.length
          ? "SELECT * FROM diagrams WHERE id IN (?)"
          : "SELECT * FROM diagrams WHERE 1=0";

      db.query(subjectiveQuery, [subjectiveIds], (err, subjectiveQuestions) => {
          if (err) {
              console.error("Error fetching subjective questions:", err);
              return res.status(500).json({ error: "An error occurred while fetching the subjective questions." });
          }

          db.query(objectiveQuery, [objectiveIds], (err, objectiveQuestions) => {
              if (err) {
                  console.error("Error fetching objective questions:", err);
                  return res.status(500).json({ error: "An error occurred while fetching the objective questions." });
              }

              db.query(diagramQuery, [diagramIds], (err, diagramQuestions) => {
                  if (err) {
                      console.error("Error fetching diagram questions:", err);
                      return res.status(500).json({ error: "An error occurred while fetching the diagram questions." });
                  }

                  res.status(200).json({
                      examId,
                      subjectiveQuestions,
                      objectiveQuestions,
                      diagramQuestions,
                  });
              });
          });
      });
  });
});


// API to fetch questions
// app.get("/api/exams/:examId", (req, res) => {
//   const { examId } = req.params;

//   // Fetch the exam details from the `generated_exams` table
//   db.query(
//       "SELECT * FROM generated_exams WHERE exam_id = ?",
//       [examId],
//       (err, examResult) => {
//           if (err) return res.status(500).json({ error: "Database error while fetching exam details" });

//           if (!examResult.length) return res.status(404).json({ error: "Exam not found" });

//           const exam = examResult[0];
//           const questions = [];

//           // Fetch subjective questions
//           if (exam.subjective && exam.subjective_questions) {
//               const subjectiveIds = exam.subjective_questions.split(",");
//               db.query(
//                   `SELECT id, question_text FROM subjective_questions WHERE id IN (?)`,
//                   [subjectiveIds],
//                   (err, subjectiveResults) => {
//                       if (err) return res.status(500).json({ error: "Database error while fetching subjective questions" });

//                       subjectiveResults.forEach((q) => questions.push({ ...q, type: "subjective" }));

//                       // Fetch objective questions
//                       if (exam.objective && exam.objective_questions) {
//                           const objectiveIds = exam.objective_questions.split(",");
//                           db.query(
//                               `SELECT id, question_text, option_a, option_b, option_c, option_d FROM mcq_questions WHERE id IN (?)`,
//                               [objectiveIds],
//                               (err, objectiveResults) => {
//                                   if (err)
//                                       return res.status(500).json({ error: "Database error while fetching objective questions" });

//                                   objectiveResults.forEach((q) =>
//                                       questions.push({
//                                           id: q.id,
//                                           question_text: q.question_text,
//                                           type: "objective",
//                                           options: [q.option_a, q.option_b, q.option_c, q.option_d],
//                                       })
//                                   );

//                                   // Fetch diagram questions
//                                   if (exam.diagram && exam.diagram_questions) {
//                                       const diagramIds = exam.diagram_questions.split(",");
//                                       db.query(
//                                           `SELECT id, diagram_url, question_text FROM diagrams WHERE id IN (?)`,
//                                           [diagramIds],
//                                           (err, diagramResults) => {
//                                               if (err)
//                                                   return res
//                                                       .status(500)
//                                                       .json({ error: "Database error while fetching diagram questions" });

//                                               diagramResults.forEach((q) =>
//                                                   questions.push({
//                                                       id: q.id,
//                                                       diagram_url: q.diagram_url,
//                                                       question_text: q.question_text,
//                                                       type: "diagram",
//                                                   })
//                                               );

//                                               // Send all collected questions
//                                               return res.json({ questions });
//                                           }
//                                       );
//                                   } else {
//                                       // Send questions if no diagram questions
//                                       return res.json({ questions });
//                                   }
//                               }
//                           );
//                       } else {
//                           // Send questions if no objective questions
//                           return res.json({ questions });
//                       }
//                   }
//               );
//           } else {
//               // Send questions if no subjective questions
//               return res.json({ questions });
//           }
//       }
//   );
// });


// API to submit answers
app.post("/api/exams/submit", (req, res) => {
  const { examId, answers } = req.body;
  db.query(
    "INSERT INTO student_answers (exam_id, answers) VALUES (?, ?)",
    [examId, JSON.stringify(answers)],
    (err) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json({ success: true });
    }
  );
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
