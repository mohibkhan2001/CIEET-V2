// Utility Functions
function toggleModalVisibility(modalId, isVisible) {
  document.getElementById(modalId).style.display = isVisible ? "flex" : "none";
}

// Initialize Event Listeners
function initializeEventListeners() {
  document
    .getElementById("selectAllButton")
    .addEventListener("click", selectAllQuestions);
  document
    .getElementById("searchInput")
    .addEventListener("keyup", filterQuestions);
  document
    .getElementById("yearFilter")
    .addEventListener("change", filterQuestions);
  document
    .getElementById("typeFilter")
    .addEventListener("change", filterQuestions);

  // Event listener for checkbox selection
  document.querySelectorAll(".question-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", filterQuestions); // Re-filter when a checkbox is clicked
  });
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
          <input id="${q.question_type}-${
      q.id
    }" class="question-checkbox hidden" type="checkbox" value="${
      q.question_type
    }-${q.id}" name="questions">
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

// Save checkbox state to localStorage
$(document).on("change", 'input[name="questions"]', function () {
  const questionId = $(this).val(); // Question ID
  const questionType = $(this).data("type"); // Question type (e.g., subjective, objective, diagram)

  // Create a unique identifier combining type and ID
  const uniqueKey = `${questionType}-${questionId}`;

  if (this.checked) {
    localStorage.setItem(uniqueKey, "checked");
    updateSelectedQuestions(uniqueKey, true);
  } else {
    localStorage.removeItem(uniqueKey);
    updateSelectedQuestions(uniqueKey, false);
  }
});

// Global array to store selected question unique keys across pages
let selectedQuestions =
  JSON.parse(localStorage.getItem("selectedQuestions")) || [];

// Function to update selected questions and sync with localStorage
function updateSelectedQuestions(uniqueKey, isChecked) {
  if (isChecked) {
    // Add to selected questions if checked
    if (!selectedQuestions.includes(uniqueKey)) {
      selectedQuestions.push(uniqueKey);
    }
  } else {
    // Remove from selected questions if unchecked
    const index = selectedQuestions.indexOf(uniqueKey);
    if (index > -1) {
      selectedQuestions.splice(index, 1);
    }
  }

  // Save the updated selected questions to localStorage
  localStorage.setItem("selectedQuestions", JSON.stringify(selectedQuestions));
}

// On page load, restore checkbox states
$(document).ready(function () {
  $('input[name="questions"]').each(function () {
    const questionId = $(this).val();
    const questionType = $(this).data("type");
    const uniqueKey = `${questionType}-${questionId}`;

    if (localStorage.getItem(uniqueKey) === "checked") {
      $(this).prop("checked", true);
      if (!selectedQuestions.includes(uniqueKey)) {
        selectedQuestions.push(uniqueKey);
      }
    }
  });
});

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

// Filter questions after page change and ensure they work with pagination
function filterQuestions() {
  const searchQuery = $("#searchInput").val().toLowerCase();
  const yearFilter = $("#yearFilter").val();
  const typeFilter = $("#typeFilter").val().toLowerCase();

  const filteredQuestions = allQuestions.filter((q) => {
    const questionText = q.question_text.toLowerCase();
    const questionYear = q.year || "";
    const questionType = q.question_type.toLowerCase();

    return (
      questionText.includes(searchQuery) &&
      (yearFilter ? questionYear.includes(yearFilter) : true) &&
      (typeFilter ? questionType === typeFilter : true)
    );
  });

  allQuestions = filteredQuestions;
  currentPage = 1; // Reset to the first page
  displayQuestions();
}

// Select all questions function and save to localStorage
function selectAllQuestions() {
  const checkboxes = $('input[name="questions"]:visible'); // Select only visible checkboxes on the current page
  checkboxes.prop("checked", true);

  // Iterate over each checkbox and save its state in localStorage
  checkboxes.each(function () {
    const questionId = $(this).val();
    localStorage.setItem(questionId, "checked"); // Save the checkbox state to localStorage
  });

  // Log the action (optional)
  console.log("All checkboxes on the current page have been selected.");
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

// Initialize the page with questions
// showQuestions("math");
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("automate-exam-btn")
    .addEventListener("click", handleAutomateExam);
});

// Generate Exam Button Click Event
async function handleAutomateExam(event) {
  event.preventDefault();

  const subject = document.querySelector("button.active")?.getAttribute("data-subject");
  const description = document.getElementById("examDescription").value.trim();
  const timer = parseInt(document.getElementById("examTimer").value, 10);
  const examDate = document.getElementById("examDate").value;

  if (!subject || !description || !timer || !examDate) {
      alert("Please fill in all fields before generating the exam.");
      return;
  }

  const selectedQuestions = JSON.parse(localStorage.getItem("selectedQuestions")) || [];
  if (selectedQuestions.length === 0) {
      alert("Please select at least one question.");
      return;
  }

  try {
      const response = await fetch("/api/generate-exam", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
              subject,
              selectedQuestions,
              description,
              timer,
              examDate
          }),
      });

      const data = await response.json();
      if (response.ok) {
          alert(`Exam Automated Successfully! Exam ID: ${data.examId}`);
          resetSelectedQuestions();
      } else {
          alert(data.error || "Error creating the exam.");
      }
  } catch (error) {
      console.error("Error:", error);
  }
}



function resetSelectedQuestions() {
  // Clear the selected questions from localStorage
  localStorage.removeItem("selectedQuestions");

  // Reset checkboxes
  const checkboxes = document.querySelectorAll("input[type='checkbox']");
  checkboxes.forEach((checkbox) => {
    checkbox.checked = false;
  });

  // Optionally, reset any active buttons or visual indicators
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