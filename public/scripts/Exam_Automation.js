// Utility Functions
function toggleModalVisibility(modalId, isVisible) {
  document.getElementById(modalId).style.display = isVisible ? "flex" : "none";
}

// Initialize Event Listeners
function initializeEventListeners() {
  document
    .getElementById("selectAllButton")
    .addEventListener("click", selectAllQuestions);
}
// Initialize pagination-related variables
const questionsPerPage = 5; // Number of questions per page
let currentPage = 1;
let totalPages = 1;
let currentSubject = "";
let allQuestions = []; // Store all fetched questions

// Pagination logic using jQuery
function setupPagination(totalQuestions) {
  totalPages = Math.ceil(totalQuestions / questionsPerPage);

  // Clear previous pagination
  $("#pagination").empty();

  // Add "Previous" button
  const prevPageLink = $("<li>")
    .addClass("page-item")
    .append(
      $("<a>")
        .addClass("page-link")
        .attr("href", "#")
        .text("Previous")
        .click(() => changePage(currentPage - 1))
    );
  $("#pagination").append(prevPageLink);

  // Generate pagination links
  for (let i = 1; i <= totalPages; i++) {
    const pageLink = $("<li>")
      .addClass("page-item")
      .append(
        $("<a>")
          .addClass("page-link")
          .attr("href", "#")
          .text(i)
          .click(() => changePage(i))
      );
    $("#pagination").append(pageLink);
  }

  // Add "Next" button
  const nextPageLink = $("<li>")
    .addClass("page-item")
    .append(
      $("<a>")
        .addClass("page-link")
        .attr("href", "#")
        .text("Next")
        .click(() => changePage(currentPage + 1))
    );
  $("#pagination").append(nextPageLink);

  // Disable "Previous" if on the first page, and "Next" if on the last page
  if (currentPage === 1) {
    prevPageLink.addClass("disabled");
  } else if (currentPage === totalPages) {
    nextPageLink.addClass("disabled");
  }
}

// Change page function
function changePage(page) {
  if (page < 1 || page > totalPages) return; // Prevent invalid page
  currentPage = page;
  displayQuestions();
  updatePaginationStyles();
}

// Update pagination styles to highlight the current page
function updatePaginationStyles() {
  $(".page-item").removeClass("active");
  $(".page-item").eq(currentPage).addClass("active");
}

// Display questions based on the current page
// Display questions based on the current page
function displayQuestions() {
  const questionList = $("#question-list");
  questionList.empty(); // Clear previous questions

  const startIndex = (currentPage - 1) * questionsPerPage;
  const endIndex = startIndex + questionsPerPage;

  // We always use allQuestions (not filtered by the current page)
  const questionsToDisplay = allQuestions.slice(startIndex, endIndex);

  questionsToDisplay.forEach((q) => {
    const questionItem = $("<div>")
      .addClass("question-item")
      .addClass(q.question_type || "unknown");

    const optionsHTML = q.options
      ? q.options
          .map(
            (option) =>
              `<div class="option">${option.option}: ${option.text}</div>`
          )
          .join("")
      : "";

    const diagramHTML = q.diagram_url
      ? `<div class="question-diagram"><img src="/Images/Diagrams/${q.diagram_url}" alt="Diagram" loading="lazy" onerror="this.src='/Images/Diagrams/abc-image.png';"></div>`
      : "";

    const correctAnswerHTML = q.correct_answer
      ? `<div class="correct-answer"><strong>Correct Answer: </strong>${q.correct_answer}</div>`
      : "";

      questionItem.html(`
        <div class="check_container">
            <input id="${q.question_type}-${q.id}" 
                class="question-checkbox hidden" 
                type="checkbox" 
                value="${q.id}" 
                name="questions"
                data-type="${q.question_type}"> <!-- Added data-type here -->
            <label class="checkbox" for="${q.question_type}-${q.id}"></label>
        </div>
        <span class="question-text">${q.question_text}</span>
        ${optionsHTML}
        ${diagramHTML}
        ${correctAnswerHTML}
        <div class="question-details">
            <div class="question-year">${q.year || "N/A"}</div>
            <div class="question-type">${q.question_type || "Unknown"}</div>
        </div>
    `);
    

    // Restore checkbox states from localStorage for all questions
    if (localStorage.getItem(q.question_type + "-" + q.id) === "checked") {
      questionItem.find('input[type="checkbox"]').prop("checked", true);
    }

    questionList.append(questionItem);
  });

  // Update pagination buttons
  setupPagination(allQuestions.length);
}
// Save checkbox state to localStorage with max marks logic
$(document).on("change", 'input[name="questions"]', function () {
  const questionId = $(this).val();
  const questionType = $(this).attr("data-type");  // Changed to attr() for dynamic elements

  // Log the question type for debugging
  console.log("Selected Question Type:", questionType);

  // Define max marks based on question type
  const maxMark = questionType === "objective" ? 1 : 5;  
  const uniqueKey = `${questionType}-${questionId}`;

  if (this.checked) {
      localStorage.setItem(uniqueKey, JSON.stringify({ checked: true, maxMark }));
      updateSelectedQuestions(uniqueKey, true);
  } else {
      localStorage.removeItem(uniqueKey);
      updateSelectedQuestions(uniqueKey, false);
  }

  updateTotalMarks(); // Always update marks when checkbox changes
});



// Global array for selected questions
let selectedQuestions = JSON.parse(localStorage.getItem("selectedQuestions")) || [];

// Function to update selected questions array and sync with localStorage
function updateSelectedQuestions(uniqueKey, isChecked) {
  if (isChecked && !selectedQuestions.includes(uniqueKey)) {
      selectedQuestions.push(uniqueKey);
  } else if (!isChecked) {
      selectedQuestions = selectedQuestions.filter(key => key !== uniqueKey);
  }

  // Sync updated selection back to localStorage
  localStorage.setItem("selectedQuestions", JSON.stringify(selectedQuestions));
}

// Restore checkbox states on page load
// $(document).ready(function () {
//   $('input[name="questions"]').each(function () {
//       const questionId = $(this).val();
//       const questionType = $(this).data("type");
//       const uniqueKey = `${questionType}-${questionId}`;
//       const storedData = JSON.parse(localStorage.getItem(uniqueKey));

//       if (storedData && storedData.checked) {
//           $(this).prop("checked", true);
//           if (!selectedQuestions.includes(uniqueKey)) {
//               selectedQuestions.push(uniqueKey);
//           }
//       }
//   });
//   updateTotalMarks(); // Update marks when the page loads
// });


$(document).ready(function () {
  // Clear the selected questions from localStorage
  localStorage.removeItem("selectedQuestions");

  // Check if totalMarks input exists before setting its value
  const totalMarksInput = document.getElementById("totalMarks");
  if (totalMarksInput) {
    totalMarksInput.value = 0;
  }

  // Check if teacherSetMarks input exists before setting its value
  const teacherSetMarksInput = document.getElementById("teacherSetMarks");
  if (teacherSetMarksInput) {
    teacherSetMarksInput.value = "";
  }

  // Reset checkboxes if necessary
  const checkboxes = document.querySelectorAll("input[type='checkbox']");
  checkboxes.forEach((checkbox) => {
    checkbox.checked = false;
  });

  // Reset any active buttons or visual indicators
  const activeButton = document.querySelector("button.active");
  if (activeButton) {
    activeButton.classList.remove("active");
  }

  // Optional: Call your existing functions here if needed
  if (typeof updateTotalMarks === "function") {
    updateTotalMarks(); // Ensure total marks are updated only if the function exists
  }
});


// Function to update total marks based on selected questions and their types
function updateTotalMarks() {
  const selectedQuestions = JSON.parse(localStorage.getItem("selectedQuestions")) || [];
  let totalMarks = 0;

  selectedQuestions.forEach((uniqueKey) => {
      const questionData = JSON.parse(localStorage.getItem(uniqueKey));
      if (questionData && questionData.checked) {
          totalMarks += questionData.maxMark;
      }
  });

  // Update the total marks input field
  document.getElementById("totalMarks").value = totalMarks;
}


// Event listener for checkbox change
$(document).on("change", 'input[name="questions"]', function () {
  const questionId = $(this).val();
  const isChecked = this.checked;

  // Update the selected questions array and localStorage
  updateSelectedQuestions(questionId, isChecked);

  // Log the action (optional)
  console.log(
    isChecked
      ? `Checkbox checked: ${questionId}`
      : `Checkbox unchecked: ${questionId}`
  );
});

// Function to restore selected questions from localStorage on page load
function restoreSelectedQuestions() {
  const savedQuestions =
    JSON.parse(localStorage.getItem("selectedQuestions")) || [];
  selectedQuestions = savedQuestions; // Populate the global selectedQuestions array

  // Restore the checked state of the checkboxes based on the saved data
  savedQuestions.forEach((questionId) => {
    const checkbox = document.querySelector(`input[value="${questionId}"]`);
    if (checkbox) {
      checkbox.checked = true; // Mark the checkbox as checked
    }
  });
}

// Call restoreSelectedQuestions on page load
window.onload = function () {
  restoreSelectedQuestions(); // Ensure the selected questions are restored
  // Other initializations...
};

// Call restoreSelectedQuestions on page load
window.onload = function () {
  restoreSelectedQuestions(); // Ensure the selected questions are restored
  // Other initializations...
};

// Call restoreSelectedQuestions on page load
window.onload = restoreSelectedQuestions;

// Select all questions function, save to localStorage, and calculate total marks
function selectAllQuestions() {
  const checkboxes = document.querySelectorAll('input[name="questions"]');
  const idsArray = [];
  let totalMarks = 0;

  checkboxes.forEach((checkbox) => {
      checkbox.checked = true; // Check the checkbox
      const id = checkbox.id;  // Get the ID of the checkbox
      const questionType = checkbox.getAttribute("data-type"); // Get question type from data attribute
      const maxMark = questionType === "objective" ? 1 : 5;  // Assign max mark based on type

      if (id) {
          idsArray.push(id); // Add the ID to the array
          totalMarks += maxMark; // Add the question mark to total
          localStorage.setItem(id, JSON.stringify({ checked: true, maxMark })); // Save question with marks
      }
  });

  console.log("Extracted IDs:", idsArray);
  console.log("Total Marks:", totalMarks);

  // Save the selected questions and total marks to localStorage
  localStorage.setItem("selectedQuestions", JSON.stringify(idsArray));
  document.getElementById("totalMarks").value = totalMarks; // Update total marks input field
}


// Fetch all questions function (make sure it's accessible)
async function fetchAllQuestions(subject) {
  let subjectiveQuestions = [];
  let currentPage = 1;

  // Fetch all pages of subjective questions
  while (true) {
    const response = await fetch(
      `/api/questions/${subject}?type=subjective&page=${currentPage}`
    );
    if (!response.ok) {
      console.error(
        `Error fetching subjective questions: ${response.statusText}`
      );
      break;
    }
    const data = await response.json();
    if (!data.subjective || data.subjective.length === 0) break; // No more data to fetch
    subjectiveQuestions = [...subjectiveQuestions, ...data.subjective];
    if (currentPage >= data.pagination.subjective.pages) break; // Reached last page
    currentPage++;
  }

  // Fetch the first page of mcqs and diagrams
  const response = await fetch(`/api/questions/${subject}`);
  if (!response.ok) {
    console.error(`Error fetching questions: ${response.statusText}`);
    return {
      subjective: subjectiveQuestions,
      mcqs: [],
      diagrams: [],
      totalQuestions: 0,
    };
  }

  const data = await response.json();
  return {
    subjective: subjectiveQuestions,
    mcqs: data.mcqs || [],
    diagrams: data.diagrams || [],
    totalQuestions: data.totalQuestions,
  };
}

// Show questions based on the subject
async function showQuestions(subject) {
  document.getElementById("questions-container").style.display = "block";
  currentSubject = subject;

  document.querySelectorAll(".subject-selection button").forEach((btn) => {
    btn.classList.remove("active");
  });

  // Scroll smoothly to the questions-container
  const questionsContainer = document.getElementById("questions-container");
  questionsContainer.style.display = "block"; // Ensure the container is visible
  questionsContainer.scrollIntoView({ behavior: "smooth" });

  const clickedButton = document.querySelector(
    `button[data-subject="${subject}"]`
  );
  clickedButton.classList.add("active");

  try {
    const data = await fetchAllQuestions(subject);

    allQuestions = [
      ...(data.subjective || []),
      ...(data.mcqs || []),
      ...(data.diagrams || []),
    ];

    displayQuestions();
  } catch (error) {
    console.error("Error fetching questions:", error);
    alert("Failed to fetch questions. Please try again later.");
  }
}

// Show objective questions only and calculate marks properly
// Show objective questions only and calculate marks properly
async function showObjective(subject) {
  document.getElementById("questions-container").style.display = "block";
  currentSubject = subject;

  document.querySelectorAll(".subject-selection button").forEach((btn) => btn.classList.remove("active"));
  document.querySelector(`button[data-subject="${subject}"]`).classList.add("active");

  try {
      const data = await fetchAllQuestions(subject);
      allQuestions = [...(data.mcqs || [])]; // Only objective questions
      displayQuestions();
      updateTotalMarks(); // Update marks after displaying questions
  } catch (error) {
      console.error("Error fetching questions:", error);
      alert("Failed to fetch questions. Please try again later.");
  }
}

// Show subjective and diagram questions only and calculate marks properly
async function showSubjective(subject) {
  document.getElementById("questions-container").style.display = "block";
  currentSubject = subject;

  document.querySelectorAll(".subject-selection button").forEach((btn) => btn.classList.remove("active"));
  document.querySelector(`button[data-subject="${subject}"]`).classList.add("active");

  try {
      const data = await fetchAllQuestions(subject);
      allQuestions = [...(data.subjective || []), ...(data.diagrams || [])];
      displayQuestions();
      updateTotalMarks(); // Update marks after displaying questions
  } catch (error) {
      console.error("Error fetching questions:", error);
      alert("Failed to fetch questions. Please try again later.");
  }
}



// Initialize the page with questions
// showQuestions("math");
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("automate-exam-btn")
    .addEventListener("click", handleAutomateExam);
});
// Function to create notification for the teacher
async function createNotification(userId, type) {
  try {
    const response = await fetch("/notifications/automation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId, // Pass the logged-in teacher's user ID
        type: type,      // Notification type (e.g., 'Exam Automation')
      }),
    });

    const data = await response.json();
    if (data.message === "Notification created successfully") {
      console.log("Notification created for userId:", userId);
    } else {
      console.error("Failed to create notification:", data.error);
    }
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}
async function handleAutomateExam(event) {
  event.preventDefault();

  const subject = document
    .querySelector("button.active")
    ?.getAttribute("data-subject");
  const examName = document.getElementById("examName").value.trim();
  const description = document.getElementById("examDescription").value.trim();
  const timer = parseInt(document.getElementById("examTimer").value, 10);
  const examDate = document.getElementById("examDate").value;
  const totalMarks = parseInt(document.getElementById("totalMarks").value, 10);

  if (
    !subject ||
    !examName ||
    !description ||
    !timer ||
    !examDate ||
    !totalMarks
  ) {
    showPopup("Please fill in all fields before generating the exam.");
    return;
  }

  const selectedDate = new Date(examDate);
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  selectedDate.setHours(0, 0, 0, 0);

  if (selectedDate <= currentDate) {
    showPopup("You can only automate exams for future dates.");
    return;
  }

  const selectedQuestions =
    JSON.parse(localStorage.getItem("selectedQuestions")) || [];
  if (selectedQuestions.length === 0) {
    showPopup("Please select at least one question.");
    return;
  }

  try {
    const response = await fetch("/api/generate-exam", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        examName,
        selectedQuestions,
        description,
        timer,
        examDate,
        totalMarks,
      }),
    });

    const data = await response.json();
    if (response.ok) {
      // Show success message and reload page when "OK" is clicked
      showPopup(`Exam Automated Successfully! Exam ID: ${data.examId}`, true);
    } else {
      showPopup(data.error || "Error creating the exam.");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

function showPopup(message, reloadOnClose = false) {
  const popup = document.getElementById("popup");
  const popupMessage = document.getElementById("popup-message");
  popupMessage.textContent = message;
  popup.classList.remove("hidden");

  const closeButton = document.getElementById("popup-close");
  const closeHandler = () => {
    popup.classList.add("hidden");
    closeButton.removeEventListener("click", closeHandler); // Clean up event listener
    if (reloadOnClose) {
      location.reload(); // Reload the page if required
    }
  };
  closeButton.addEventListener("click", closeHandler);
}


function showPopup(message) {
  const popup = document.getElementById("popup");
  const popupMessage = document.getElementById("popup-message");
  popupMessage.textContent = message;
  popup.classList.remove("hidden");

  const closeButton = document.getElementById("popup-close");
  closeButton.addEventListener("click", () => {
    popup.classList.add("hidden");
  });
}





// Reset selected questions and total marks
function resetSelectedQuestions() {
  // Clear the selected questions from localStorage
  localStorage.removeItem("selectedQuestions");

  // Reset checkboxes
  const checkboxes = document.querySelectorAll("input[name='questions']");
  checkboxes.forEach((checkbox) => {
      checkbox.checked = false;
  });

  // Reset Total Marks input if it exists
  const totalMarksInput = document.getElementById("totalMarks");
  if (totalMarksInput) {
      totalMarksInput.value = 0;
  }

  // Reset the teacher's set total marks input if it exists
  const teacherSetMarksInput = document.getElementById("teacherSetMarks");
  if (teacherSetMarksInput) {
      teacherSetMarksInput.value = "";
  }

  // Optionally, reset active buttons or indicators
  const activeButton = document.querySelector("button.active");
  if (activeButton) {
      activeButton.classList.remove("active");
  }
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
            // Reset the checkboxes after logout
            resetSelectedQuestions();

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
