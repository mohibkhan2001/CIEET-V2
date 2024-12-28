const path = require("path");
const express =  require('express');
const db = require("./models/database"); // MySQL database connection
const router = express.Router();
const app = express();


// Middleware
app.use(express.static(path.join(__dirname, "public"))); // Static files in 'public' folder
app.use(
  "/Images/Diagram",
  express.static(path.join(__dirname, "Images/Diagram"))
);

// Middleware to check if the user's role matches the required role
function checkRole(requiredRole) {
  return (req, res, next) => {
    const userRole = req.session.user.role;
    if (userRole !== requiredRole) {
      return res.redirect('/StudentPortal'); // Redirect to StudentPortal if not authorized
    }
    next(); // Proceed if the role matches
  };
}// Middleware to prevent Teachers from accessing the StudentPortal
function preventTeacherAccess(req, res, next) {
  const userRole = req.session.user.role;
  if (userRole === 'Teacher') {
    return res.redirect('/index'); // Redirect Teacher to the index page (or other page)
  }
  next(); // Allow Student to access the StudentPortal
}

