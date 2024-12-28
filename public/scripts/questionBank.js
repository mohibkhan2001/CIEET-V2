// Utility Functions
function toggleModalVisibility(modalId, isVisible) {
  $("#" + modalId).css("display", isVisible ? "flex" : "none");
}

// State Variables
let allQuestions = []; // Store all questions fetched for the current subject
let filteredQuestions = []; // Filtered questions after applying search, type, and year filters
const questionsPerPage = 10;
let currentPage = 1;

 // Initialize Event Listeners
  function initializeEventListeners() {
    $("#pdfForm").submit(handleGeneratePDF);
    $("#selectAllButton").click(selectAllQuestions);
    $("#searchInput").keyup(filterQuestions);
    $("#yearFilter").change(filterQuestions);
    $("#typeFilter").change(filterQuestions);
    $("#selectAllButton").click(selectAllQuestions);

    // Event listener for checkbox selection
    $(".question-checkbox").on("change", filterQuestions); // Re-filter when a checkbox is clicked
  }


// Function to select all questions
function selectAllQuestions() {
  const checkboxes = document.querySelectorAll('input[name="questions"]');
  checkboxes.forEach((checkbox) => (checkbox.checked = true));
}
function filterQuestions() {
  const searchQuery = document
    .getElementById("searchInput")
    .value.toLowerCase();
  const yearFilter = document.getElementById("yearFilter").value;
  const typeFilter = document.getElementById("typeFilter").value.toLowerCase(); // Ensure the type filter is lowercase

  // Filter questions based on search, year, and type
  filteredQuestions = allQuestions.filter((q) => {
    const questionText = q.question_text?.toLowerCase() || "";
    const questionYear = q.year || "";
    const questionType = q.question_type?.toLowerCase() || "";

    const matchesSearch = questionText.includes(searchQuery);
    const matchesYear = yearFilter ? questionYear.includes(yearFilter) : true;
    const matchesType = typeFilter ? questionType === typeFilter : true;

    return matchesSearch && matchesYear && matchesType;
  });

  // Reset to the first page after applying the filters
  currentPage = 1;
  renderQuestions();
}

// Save Selected Questions in localStorage
function saveSelectedQuestions() {
  localStorage.setItem(
    "selectedQuestions",
    JSON.stringify([...getSelectedQuestions()])
  );
}

// Get Selected Questions from localStorage
function getSelectedQuestions() {
  return new Set(JSON.parse(localStorage.getItem("selectedQuestions") || "[]"));
}

// Add Question to Selected Questions
function addSelectedQuestion(questionId) {
  const selected = getSelectedQuestions();
  selected.add(questionId);
  localStorage.setItem("selectedQuestions", JSON.stringify([...selected]));
  console.log("Selected Questions:", [...selected]);
}

// Remove Question from Selected Questions
function removeSelectedQuestion(questionId) {
  const selected = getSelectedQuestions();
  selected.delete(questionId);
  localStorage.setItem("selectedQuestions", JSON.stringify([...selected]));
  console.log("Selected Questions:", [...selected]);
}
// Fetch Questions
async function fetchQuestions(subject) {
  try {
    const response = await fetch(`/api/questions/${subject}`);
    if (!response.ok) {
      console.error(`Error fetching questions: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    console.log('Fetched Data:', data); // Log to see the structure of data
    return [
      ...(data.subjective || []),
      ...(data.mcqs || []),
      ...(data.diagrams || []),
    ];
  } catch (error) {
    console.error("Error fetching questions:", error);
    return [];
  }
}


// Show Questions with Pagination
async function showQuestions(subject, page = 1) {
  $("#questions-container").show();
  $(".subject-selection button").removeClass("active");
  $(`button[data-subject="${subject}"]`).addClass("active");

  try {
    allQuestions = await fetchQuestions(subject);
    currentPage = page;
    filteredQuestions = allQuestions; // Initially no filters, so show all questions
    renderQuestions();
  } catch (error) {
    console.error("Error displaying questions:", error);
    alert("Failed to fetch questions. Please try again later.");
  }
}

function renderQuestions() {
  const searchQuery = $("#searchInput").val().toLowerCase();
  const yearFilter = $("#yearFilter").val();
  const typeFilter = $("#typeFilter").val().toLowerCase();

  // Filter questions based on search, year, and type
  const filteredQuestions = allQuestions.filter((q) => {
    const questionText = q.question_text?.toLowerCase() || "";
    const questionYear = q.year || "";
    const questionType = q.question_type?.toLowerCase() || "";

    const matchesSearch = questionText.includes(searchQuery);
    const matchesYear = yearFilter ? questionYear.includes(yearFilter) : true;
    const matchesType = typeFilter ? questionType === typeFilter : true;

    return matchesSearch && matchesYear && matchesType;
  });

  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);
  const startIndex = (currentPage - 1) * questionsPerPage;
  const paginatedQuestions = filteredQuestions.slice(startIndex, startIndex + questionsPerPage);

  const $questionList = $("#question-list");
  $questionList.empty();

  const selectedQuestions = getSelectedQuestions();

  if (paginatedQuestions.length === 0) {
    $questionList.append("<p>No questions available for this page.</p>");
  } else {
    paginatedQuestions.forEach((q) => {
      const questionId = `${q.question_type}-${q.id}`;
      const isChecked = selectedQuestions.has(questionId);

      let optionsHTML = "";
      let diagramHTML = "";
      let correctAnswerHTML = "";

      // Handling objective questions (MCQs)
      if (q.question_type === "objective" && Array.isArray(q.options) && q.options.length > 0) {
        optionsHTML = `
          <div class="options">
            ${q.options.map(option => `
              <div class="option">
                <input type="radio" name="question-${q.id}" value="${option}" ${q.correct_answer === option ? "checked" : ""} disabled>
                <label>${option}</label>
              </div>
            `).join("")}
          </div>
        `;
        correctAnswerHTML = q.correct_answer 
          ? `<div class="correct-answer"><strong>Correct Answer: </strong>${q.correct_answer}</div>` 
          : "<p>No correct answer available.</p>";
      } else {
        optionsHTML = "<p>No options available for this question.</p>";
      }

      // Handling diagram questions
      if (q.question_type === "diagram" && q.diagram_url) {
        diagramHTML = `
          <div class="question-diagram">
            <img src="/Images/Diagrams/${q.diagram_url}" alt="Diagram for question ${q.id}" loading="lazy" onerror="this.src='/Images/Diagrams/abc-image.png';">
          </div>
        `;
      } else {
        diagramHTML = "<p>No diagram available for this question.</p>";
      }

      // Build the question HTML
      const questionHTML = `
        <div class="question-item ${q.type || "unknown"}">
          <div class="check_container">
            <input id="${questionId}" class="question-checkbox" type="checkbox" value="${questionId}" ${isChecked ? "checked" : ""}>
            <label class="checkbox" for="${questionId}"></label>
          </div>
          <span class="question-text">${q.question_text}</span>
          ${optionsHTML}
          ${diagramHTML}
          ${correctAnswerHTML}
          <div class="question-details">
            <div class="question-year">${q.year || "N/A"}</div>
            <div class="question-type">${q.question_type || "Unknown"}</div>
          </div>
        </div>
      `;

      // Append question to the list
      $questionList.append(questionHTML);

      // Add checkbox listeners (using jQuery for checkbox state changes)
      $(`#${questionId}`).on("change", function () {
        const questionId = $(this).val();
        if ($(this).is(":checked")) {
          addSelectedQuestion(questionId);
        } else {
          removeSelectedQuestion(questionId);
        }
      });
    });

    // Ensure pagination controls are updated
    renderPaginationControls(filteredQuestions.length, currentPage);
  }
}


// Ensure pagination controls are updated
function renderPaginationControls(totalItems, currentPage) {
  const totalPages = Math.ceil(totalItems / questionsPerPage);
  const $paginationControls = $("#pagination-controls");
  $paginationControls.empty();

  // Create page buttons
  for (let i = 1; i <= totalPages; i++) {
    const pageButton = $("<button>").text(i).addClass("page-button").on("click", () => {
      currentPage = i;
      renderQuestions();
    });
    if (i === currentPage) {
      pageButton.addClass("active");
    }
    $paginationControls.append(pageButton);
  }
}


// Update Pagination Controls
function renderPaginationControls(totalQuestions, currentPage) {
  const totalPages = Math.ceil(totalQuestions / questionsPerPage);
  const $paginationControls = $("#pagination-controls");
  $paginationControls.empty();

  for (let i = 1; i <= totalPages; i++) {
    const pageButton = $(`<button>${i}</button>`);
    pageButton.addClass("page-button").toggleClass("active", i === currentPage);
    pageButton.on("click", () => {
      currentPage = i;
      renderQuestions();
    });
    $paginationControls.append(pageButton);
  }
}

// Update the filtered questions and render the page when a filter changes
$("#searchInput, #yearFilter, #typeFilter").on("input change", function () {
  renderQuestions();
});

// Initialize pagination and render on page load
$(document).ready(function () {
  showQuestions("subject1", 1); // Example subject and page
});




// Render Questions with Pagination
function renderQuestions() {
  const startIndex = (currentPage - 1) * questionsPerPage;
  const endIndex = startIndex + questionsPerPage;
  const questionsToDisplay = filteredQuestions.slice(startIndex, endIndex);

  const $questionList = $("#question-list");
  $questionList.empty();

  const selectedQuestions = getSelectedQuestions();

  questionsToDisplay.forEach((q) => {
    const questionId = `${q.question_type}-${q.id}`;
    const isChecked = selectedQuestions.has(questionId);

    const questionHTML = `
      <div class="question-item ${q.type || "unknown"}">
        <div class="check_container">
          <input id="${questionId}" class="question-checkbox" type="checkbox" value="${questionId}" ${
      isChecked ? "checked" : ""
    }>
          <label class="checkbox" for="${questionId}"></label>
        </div>
        <span class="question-text">${q.question_text}</span>
        <div class="question-details">
          <div class="question-year">${q.year || "N/A"}</div>
          <div class="question-type">${q.question_type || "Unknown"}</div>
        </div>
      </div>`;
    $questionList.append(questionHTML);
  });

  // Add Checkbox Listeners
  $(".question-checkbox").on("change", function () {
    const questionId = $(this).val();
    if ($(this).is(":checked")) {
      addSelectedQuestion(questionId);
    } else {
      removeSelectedQuestion(questionId);
    }
  });

  // Render Pagination Controls
  renderPaginationControls(filteredQuestions.length);
}

// Render Pagination Controls using jQuery
function renderPaginationControls(totalQuestions) {
  const totalPages = Math.ceil(totalQuestions / questionsPerPage);
  const $paginationControls = $("#pagination-controls");
  $paginationControls.empty();

  for (let i = 1; i <= totalPages; i++) {
    const pageButton = $(`<button>${i}</button>`);
    pageButton.addClass("page-button").toggleClass("active", i === currentPage);
    pageButton.on("click", () => {
      currentPage = i;
      renderQuestions();
    });
    $paginationControls.append(pageButton);
  }
}

// Handle PDF Generation
async function handleGeneratePDF(event) {
  event.preventDefault();

  const selectedButton = $(".subject-selection button.active");
  if (!selectedButton.length) {
    alert("Please select a subject.");
    return;
  }

  const subject = selectedButton.data("subject");
  const pdfName = $("#pdfName").val().trim();
  const selectedQuestions = Array.from(getSelectedQuestions());

  if (selectedQuestions.length === 0) {
    alert("Please select at least one question.");
    return;
  }
  if (!pdfName) {
    alert("Please provide a name for the PDF.");
    return;
  }

  // showLoader();

  try {
    const response = await fetch("/generate-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, questions: selectedQuestions, pdfName }),
    });

    const data = await response.json();

    if (data.success) {
      alert(`PDF Generated Successfully: ${data.pdfFileName}`);
      localStorage.removeItem("selectedQuestions"); // Clear selected questions
      renderQuestions(); // Update checkboxes
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Failed to generate PDF. Please try again.");
  } finally {
    // hideLoader();
  }
}

// Initialize
$(document).ready(() => {
  initializeEventListeners();
  showQuestions("math");
});

// Add event listener to the PDF generation form
document
  .getElementById("pdfForm")
  .addEventListener("submit", handleGeneratePDF);

// Initialize event listeners after DOM content is loaded
document.addEventListener("DOMContentLoaded", initializeEventListeners);

// Ensure the DOM is fully loaded before attaching the event listener
document.addEventListener("DOMContentLoaded", function () {
  let viewPapersBtn = document.getElementById("viewBtn");

  // Check if the button exists
  if (viewPapersBtn) {
    viewPapersBtn.addEventListener("click", function () {
      window.location.href = "/generatedPapers"; // Redirect to the generated papers route
    });
  }
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
