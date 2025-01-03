let questions = [];
let currentQuestionIndex = 0;
let timerInterval;
let timeRemaining;

window.onload = function () {
  fetchExams(); // Fetch and display available exams on page load
};

function fetchExams() {
  const xhr = new XMLHttpRequest();
  xhr.open("GET", "/api/exams", true);

  xhr.onload = function () {
    if (xhr.status === 200) {
      const exams = JSON.parse(xhr.responseText);
      const tbody = document.querySelector("#examTable tbody");
      tbody.innerHTML = ""; // Clear previous table data

      const currentDate = new Date();

      exams.forEach((exam) => {
        const examId = exam.exam_id || "Unknown Exam ID";
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
        examNameCell.textContent = examId;

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
          // Enable button for available exams
          attemptButton.onclick = () => {
            window.location.href = `/std_exam/${exam.exam_id}`; // Redirect to the exam page
          };
        }

        actionCell.appendChild(attemptButton);
        row.appendChild(examNameCell);
        row.appendChild(subjectCell);
        row.appendChild(descriptionCell);
        row.appendChild(dateCell);
        row.appendChild(actionCell);

        tbody.appendChild(row);
      });
    } else {
      console.error("Failed to fetch exams:", xhr.responseText);
      alert("Error fetching exams.");
    }
  };

  xhr.onerror = function () {
    console.error("Network error while fetching exams.");
    alert("Network error. Please try again.");
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

//Questions will appear one on a single page

// let questions = [];
// let currentQuestionIndex = 0;

// function fetchQuestions(examId) {
//     const xhr = new XMLHttpRequest();
//     xhr.open("GET", `/api/exam?examId=${examId}`, true);

//     xhr.onload = function () {
//         if (xhr.status === 200) {
//             const data = JSON.parse(xhr.responseText);

//             const subjectiveQuestions = data.subjectiveQuestions || [];
//             const objectiveQuestions = data.objectiveQuestions || [];
//             const diagramQuestions = data.diagramQuestions || [];

//             // Combine all questions into a single array
//             questions = [
//                 ...subjectiveQuestions.map((q) => ({ ...q, type: "subjective" })),
//                 ...objectiveQuestions.map((q) => ({
//                     ...q,
//                     type: "objective",
//                     options: [q.option_a, q.option_b, q.option_c, q.option_d],
//                 })),
//                 ...diagramQuestions.map((q) => ({ ...q, type: "diagram" })),
//             ];

//             if (questions.length > 0) {
//                 renderAllQuestions(); // Render all questions at once
//             } else {
//                 alert("No questions available for this exam.");
//             }
//         } else {
//             console.error("Failed to fetch questions:", xhr.responseText);
//             alert("Error fetching questions.");
//         }
//     };

//     xhr.onerror = function () {
//         console.error("Network error while fetching questions.");
//         alert("Network error. Please try again.");
//     };

//     xhr.send();
// }

// // Render all questions at once
// function renderAllQuestions() {
//     const questionContainer = document.getElementById("examQuestions");
//     questionContainer.innerHTML = ""; // Clear existing content

//     if (questions.length === 0) {
//         questionContainer.innerHTML = `<p>No questions available.</p>`;
//         return;
//     }

//     let allQuestionsHtml = "";

//     questions.forEach((question, index) => {
//         let questionHtml = `<div class="question"><h2>Q${index + 1}: ${question.question_text}</h2>`;

//         if (question.type === "subjective") {
//             questionHtml += `<textarea rows="5" cols="50" name="answer${index}" placeholder="Your answer here..."></textarea>`;
//         } else if (question.type === "objective") {
//             questionHtml += question.options
//                 .map(
//                     (option, optionIndex) =>
//                         `<div>
//                             <label>
//                                 <input type="radio" name="answer${index}" value="${option}" />
//                                 ${option}
//                             </label>
//                         </div>`
//                 )
//                 .join("");
//         } else if (question.type === "diagram") {
//             questionHtml += `
//                 <img src="http://localhost:3000/Images/Diagrams/${question.diagram_url}" alt="Diagram Question" width="300" />
//                 <p>${question.question_text}</p>
//                 <textarea rows="5" cols="50" name="answer${index}" placeholder="Your answer here..."></textarea>`;
//         }

//         questionHtml += `</div>`;
//         allQuestionsHtml += questionHtml;
//     });

//     questionContainer.innerHTML = allQuestionsHtml; // Insert all questions

//     // Update navigation buttons (optional)
//     updateNavigationButtons();
// }

// function updateNavigationButtons() {
//     const previousBtn = document.getElementById("previousBtn");
//     const nextBtn = document.getElementById("nextBtn");
//     const submitBtn = document.getElementById("submitBtn");

//     if (questions.length > 0) {
//         previousBtn.disabled = currentQuestionIndex === 0;
//         nextBtn.disabled = currentQuestionIndex === questions.length - 1;
//         submitBtn.disabled = false;
//     }
// }
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
