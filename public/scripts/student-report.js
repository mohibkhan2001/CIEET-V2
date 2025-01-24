async function fetchStudentAnswers() {
  const urlParams = new URLSearchParams(window.location.search);
  const examId = urlParams.get("exam_id");
  const userId = urlParams.get("user_id");

  if (!examId || !userId) {
    alert("Missing exam or user ID");
    return;
  }

  try {
    // Fetch the logged-in teacher's information
    const userResponse = await fetch("/api/user-info");
    if (!userResponse.ok) throw new Error("Failed to fetch user info");

    const userData = await userResponse.json();
    const teacherId = userData.user.id;

    // Check if the report already exists
    const reportCheckResponse = await fetch(
      `/api/verify-report?examId=${examId}&userId=${userId}`
    );
    if (!reportCheckResponse.ok) throw new Error("Failed to check report");

    const reportExists = await reportCheckResponse.json();
    
    // Fetch the student's answers regardless of whether the report exists
    const response = await fetch(`/api/student-answers/${examId}/${userId}`);
    if (!response.ok) throw new Error("Failed to fetch student answers");

    const data = await response.json();
    const tableBody = document.querySelector("#answers-table tbody");
    const totalMarksElement = document.querySelector("#totalMarks");
    const obtainedMarksElement = document.querySelector("#obtainedMarks");
    const gradeElement = document.querySelector("#grade");

    tableBody.innerHTML = "";
    let totalMarks = data[0]?.total_marks || 0;
    totalMarksElement.textContent = totalMarks;

    let obtainedMarks = 0;

    data.forEach((answer, index) => {
      let scoreInputHTML;

      if (answer.question_type === "objective") {
        // For objective type questions, compare the answer and set input to 1 or 0
        const isCorrect =
          answer.answer_text.trim() === answer.correct_answer.trim();
        const fixedScore = isCorrect ? 1 : 0;

        scoreInputHTML = `
            <input type="number" value="${fixedScore}" class="score-input" data-index="${index}" readonly>
        `;

        obtainedMarks += fixedScore; // Automatically add to obtained marks
      } else {
        // For other question types, allow manual scoring if the report doesn't exist
        scoreInputHTML = `
            <input type="number" min="0" max="5" step="0.5" value="0" class="score-input" data-index="${index}" ${
              reportExists.reportExists ? "readonly" : ""
            }>
        `;
      }

      const row = document.createElement("tr"); // Create a new table row element
      row.innerHTML = `
          <td>${answer.question_text}</td>
          <td>${answer.answer_text}</td>
          <td>${answer.correct_answer}</td>
          <td>${answer.question_type}</td>
          <td>${scoreInputHTML}</td>
      `;

      tableBody.appendChild(row); // Append the row directly to the table
    });

    // Update obtained marks and grade dynamically for non-objective types
    const scoreInputs = document.querySelectorAll(".score-input");
    scoreInputs.forEach((input) => {
      input.addEventListener("input", () => {
        obtainedMarks = Array.from(scoreInputs).reduce((sum, input) => {
          return sum + (parseFloat(input.value) || 0);
        }, 0);
        obtainedMarksElement.textContent = obtainedMarks.toFixed(2);

        const grade = calculateGrade(obtainedMarks, totalMarks);
        gradeElement.textContent = grade;
      });
    });

    // Update the displayed obtained marks and grade initially
    obtainedMarksElement.textContent = obtainedMarks.toFixed(2);
    gradeElement.textContent = calculateGrade(obtainedMarks, totalMarks);

    if (reportExists.reportExists) {
      // Hide the summary section and submit button if the report already exists
      const summarySection = document.querySelector("#report-summary");
      if (summarySection) {
        summarySection.style.display = "none";
      }

      const submitButton = document.querySelector("#submit-report");
      if (submitButton) {
        submitButton.style.display = "none";
      }

      // Add a message to indicate the report is already submitted
      let container = document.querySelector("#answers-container");
      if (!container) {
        container = document.createElement("div");
        container.id = "answers-container";
        container.style.margin = "20px auto";
        container.style.padding = "20px";
        container.style.maxWidth = "600px";
        container.style.backgroundColor = "#fff";
        container.style.border = "1px solid #ccc";
        container.style.borderRadius = "5px";
        container.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
        document.body.appendChild(container);
      }

      const message = document.createElement("div");
      message.textContent =
        "This report has already been submitted. You can only view the answers.";
      message.style.textAlign = "center";
      message.style.margin = "20px";
      message.style.padding = "10px";
      message.style.backgroundColor = "#f8d7da";
      message.style.color = "#842029";
      message.style.border = "1px solid #f5c2c7";
      message.style.borderRadius = "5px";
      container.appendChild(message);
    }

    // Submit Report Button including teacher ID
    document
      .querySelector("#submit-report")
      .addEventListener("click", async () => {
        const remarks = document.querySelector("#remarks").value;
        const grade = gradeElement.textContent;
        const obtainedMarks = parseFloat(obtainedMarksElement.textContent);

        if (!remarks || grade === "--" || isNaN(obtainedMarks)) {
          alert("Please complete all fields before submitting.");
          return;
        }

        const reportData = {
          examId,
          userId,
          teacherId,
          obtainedMarks,
          remarks,
          grade,
        };

        try {
          const response = await fetch("/api/save-student-report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reportData),
          });

          if (!response.ok) throw new Error("Failed to save report");

          alert("Report submitted successfully!");

          // After successful report submission, create the notification
          await createReportNotification(examId, userId);

          // Redirect to /reporting after a successful report submission
          window.location.href = "/reporting";

          // Optionally, disable the submit button after successful submission
          document.querySelector("#submit-report").disabled = true;
        } catch (error) {
          console.error("Error submitting report:", error);
          alert("An error occurred while submitting the report.");
        }
      });
  } catch (error) {
    console.error("Error fetching student answers:", error);
    alert("An error occurred while fetching the answers.");
  }
}





async function createReportNotification(examId, userId) {
  try {
      const response = await fetch('/api/create-notification', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ examId, userId, type: 'report' }),
      });

      if (!response.ok) throw new Error("Failed to create notification");

      console.log("Report notification created successfully.");
  } catch (error) {
      console.error("Error creating report notification:", error);
  }
}


// function calculateGrade(obtainedMarks, totalMarks, isObjective, totalObjectiveQuestions) {
//   if (isObjective) {
//       // Grading logic for objective questions based on the number of questions
//       const percentage = (obtainedMarks / totalObjectiveQuestions) * 100;
//       if (percentage === 100) return 'A+';
//       if (percentage >= 90) return 'A';
//       if (percentage >= 80) return 'B';
//       if (percentage >= 70) return 'C';
//       if (percentage >= 50) return 'D';
//       return 'F'; // Less than 50%
//   } else {
//       // Default grading logic for other question types
//       const percentage = (obtainedMarks / totalMarks) * 100;
//       if (percentage >= 90) return 'A+';
//       if (percentage >= 80) return 'A';
//       if (percentage >= 70) return 'B';
//       if (percentage >= 60) return 'C';
//       if (percentage >= 50) return 'D';
//       return 'F';
//   }
// }




// Function to calculate grade based on obtained marks
function calculateGrade(obtainedMarks, totalMarks) {
    const percentage = (obtainedMarks / totalMarks) * 100;
    if (percentage >= 90) return 'A+';
    if (percentage >= 85) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
}


      document.addEventListener("DOMContentLoaded", fetchStudentAnswers);
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

      