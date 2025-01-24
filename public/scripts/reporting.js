        // Fetch all data from the studentanswers table
       // Fetch all data from the studentanswers table and filter by teacher's generated exams
async function fetchStudentAnswers() {
    try {
        const response = await fetch('/api/student-answers');
        if (!response.ok) throw new Error('Failed to fetch data');

        const data = await response.json();
        const sessionResponse = await fetch('/api/teacher/exams');
        if (!sessionResponse.ok) throw new Error('Failed to fetch teacher exams');

        const teacherExams = await sessionResponse.json();
        const teacherExamIds = teacherExams.exams.map(exam => exam.exam_id);

        const tableBody = document.querySelector("#submitted-answers-table tbody");
        tableBody.innerHTML = ""; // Clear existing data

        // Filter student answers to match only exams created by the logged-in teacher
        const filteredData = data.filter(student => teacherExamIds.includes(student.exam_id));

        filteredData.forEach(student => {
            const date = new Date(student.submitted_at);
            const formattedDate = date.toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi' });
            const formattedTime = date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
                timeZone: 'Asia/Karachi'
            });

            const row = `
                <tr>
                   <td>${student.exam_id}</td>
                    <td>${student.exam_name}</td>
                    <td>${student.firstname}</td>
                    <td>${student.lastname}</td>
                    <td>${student.subject}</td>
                    <td>${formattedDate}</td>
                    <td>
                        <button onclick="redirectToReport(${student.exam_id}, ${student.user_id})">Check Answers</button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });

        if (filteredData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6">No submitted answers available for your exams.</td></tr>`;
        }

    } catch (error) {
        console.error('Error fetching student answers:', error);
    }
}

// Redirect to the report page with query parameters
function redirectToReport(examId, userId) {
    window.location.href = `student-report.html?exam_id=${examId}&user_id=${userId}`;
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

