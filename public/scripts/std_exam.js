let questions = [];
let currentQuestionIndex = 0;
let timerInterval;
let timeRemaining;

window.onload = function () {
  fetchExams(); // Fetch and display available exams on page load
};

function fetchExams() {
  // Fetch user info to get the user_id
  const xhrUserInfo = new XMLHttpRequest();
  xhrUserInfo.open("GET", "/api/user-info", true);

  xhrUserInfo.onload = function () {
    if (xhrUserInfo.status === 200) {
      const userInfo = JSON.parse(xhrUserInfo.responseText);
      const userId = userInfo.user.id; // Get the user ID

      // Now fetch the exams
      const xhrExams = new XMLHttpRequest();
      xhrExams.open("GET", "/api/exams", true);

      xhrExams.onload = function () {
        if (xhrExams.status === 200) {
          const exams = JSON.parse(xhrExams.responseText);
          const tbody = document.querySelector("#examTable tbody");
          tbody.innerHTML = ""; // Clear previous table data

          const currentDate = new Date();

          exams.forEach((exam) => {
            const examId = exam.exam_id || "Unknown Exam ID";
            const examName = exam.exam_name || "No Exam Name";  // Extract Exam Name
            const subject = exam.subject || "No Subject";
            const description = exam.description || "No Description";

            let scheduledDate = new Date(exam.exam_date);

            if (isNaN(scheduledDate.getTime())) {
              console.error("Invalid exam date for examId:", examId);
              scheduledDate = null;
            }

            const currentDateTime = currentDate.getTime();
            const examDateTime = scheduledDate ? scheduledDate.getTime() : null;

            const row = document.createElement("tr");

            const examNameCell = document.createElement("td");
            examNameCell.textContent = examName;  // Display Exam Name

            const examIdCell = document.createElement("td");
            examIdCell.textContent = examId;

            const subjectCell = document.createElement("td");
            subjectCell.textContent = subject;

            const descriptionCell = document.createElement("td");
            descriptionCell.textContent = description;

            const dateCell = document.createElement("td");
            dateCell.textContent = scheduledDate ? scheduledDate.toLocaleString() : "Invalid Date";

            const actionCell = document.createElement("td");

            // Create "Attempt Exam" button
            const attemptButton = document.createElement("button");
            attemptButton.textContent = "Attempt Exam";

            if (examDateTime && examDateTime > currentDateTime) {
              attemptButton.disabled = true;
              attemptButton.title = "Cannot attempt the exam before the scheduled date.";
            } else if (examDateTime && examDateTime <= currentDateTime) {
              // Check if the student has already attempted this exam
              checkIfAttempted(userId, exam.exam_id, (hasAttempted) => {
                if (hasAttempted) {
                  attemptButton.disabled = true;
                  attemptButton.title = "You have already attempted this exam.";
                } else {
                  attemptButton.onclick = () => {
                    window.location.href = `/examPage/${exam.exam_id}`; // Redirect to the exam page
                  };
                }
              });
            }

            actionCell.appendChild(attemptButton);
            row.appendChild(examIdCell);
            row.appendChild(examNameCell);  // Add Exam Name to the row
            row.appendChild(subjectCell);
            row.appendChild(descriptionCell);
            row.appendChild(dateCell);
            row.appendChild(actionCell);

            tbody.appendChild(row);
          });
        } else {
          console.error("Failed to fetch exams:", xhrExams.responseText);
          alert("Error fetching exams.");
        }
      };

      xhrExams.onerror = function () {
        console.error("Network error while fetching exams.");
        alert("Network error. Please try again.");
      };

      xhrExams.send();
    } else {
      console.error("Failed to fetch user info:", xhrUserInfo.responseText);
      alert("Error fetching user information.");
    }
  };

  xhrUserInfo.onerror = function () {
    console.error("Network error while fetching user info.");
    alert("Network error. Please try again.");
  };

  xhrUserInfo.send();
}


function checkIfAttempted(userId, examId, callback) {
  const xhr = new XMLHttpRequest();
  xhr.open("GET", `/api/checkAttempted?user_id=${userId}&exam_id=${examId}`, true);

  xhr.onload = function () {
    if (xhr.status === 200) {
      const response = JSON.parse(xhr.responseText);
      callback(response.hasAttempted);
    } else {
      console.error("Error checking attempt status:", xhr.responseText);
      callback(false);
    }
  };

  xhr.onerror = function () {
    console.error("Network error while checking attempt status.");
    callback(false);
  };

  xhr.send();
}




function submitExam() {
  clearInterval(timerInterval);

  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/api/save-timer", true);
  xhr.setRequestHeader("Content-Type", "application/json");

  xhr.onload = function () {
    if (xhr.status === 200) {
      alert("Exam submitted successfully.");
    } else {
      alert("Error submitting exam.");
    }
  };

  xhr.send(JSON.stringify({ examId: 1, remainingTime: timeRemaining }));
}

function updateNavigationButtons() {
  document.getElementById("previousBtn").disabled = currentQuestionIndex === 0;
  document.getElementById("nextBtn").disabled =
    currentQuestionIndex === questions.length - 1;
}

function navigateQuestion(direction) {
  if (direction === "previous" && currentQuestionIndex > 0) {
    currentQuestionIndex--;
  } else if (
    direction === "next" &&
    currentQuestionIndex < questions.length - 1
  ) {
    currentQuestionIndex++;
  }
  renderQuestion();
}
document.addEventListener("DOMContentLoaded", () => {
  fetch("/api/user-info") // Endpoint to fetch the user's session info
    .then((response) => {
      if (!response.ok) {
        console.error("User not logged in");
        return;
      }
      return response.json();
    })
    .then((data) => {
      const user = data.user;
      const usernameSpan = document.getElementById("studentName");

      if (user && usernameSpan) {
        // Display user's first and last name
        usernameSpan.textContent = `${user.firstname} ${user.lastname}`;
      }
    })
    .catch((err) => {
      console.error("Failed to fetch user info:", err);
    });
});

document.addEventListener("DOMContentLoaded", () => {
  fetch("/api/user-info") // Endpoint to fetch the user's session info
    .then((response) => {
      if (!response.ok) {
        console.error("User not logged in");
        return;
      }
      return response.json();
    })
    .then((data) => {
      const user = data.user;
      const usernameSpan = document.getElementById("username");

      if (user && usernameSpan) {
        // Display user's first and last name
        usernameSpan.textContent = `${user.firstname} ${user.lastname}`;

        // Role-based redirection
        if (user.role === "Teacher") {
          // Redirect to Teacher's Dashboard if the user is a Teacher
          window.location.href = "/index";
        } else if (user.role === "Student") {
          // Stay on StudentPortal if the user is a Student
        }
      }
    })
    .catch((err) => {
      console.error("Failed to fetch user info:", err);
    });

  // Handle the logout button click
  const logoutButton = document.getElementById("logout-btn");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      fetch("/logout", {
        method: "POST",
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            // Redirect to the homepage after successful logout
            window.location.href = "/";
          } else {
            console.error("Failed to log out");
          }
        })
        .catch((err) => {
          console.error("Error logging out:", err);
        });
    });
  }
});