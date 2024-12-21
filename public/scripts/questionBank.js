// Utility Functions
function toggleModalVisibility(modalId, isVisible) {
  document.getElementById(modalId).style.display = isVisible ? "flex" : "none";
}

// Initialize Event Listeners
function initializeEventListeners() {
  document
    .getElementById("pdfForm")
    .addEventListener("submit", handleGeneratePDF);
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
  document
    .getElementById("randomSelectButton")
    .addEventListener("click", toggleRandomSelectionInput);
  // document
  //   .getElementById("random-question-count")
  //   .addEventListener("input", validateRandomInput);

  // Event listener for checkbox selection
  document.querySelectorAll(".question-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", filterQuestions); // Re-filter when a checkbox is clicked
  });
}

function filterQuestions() {
  const searchQuery = document
    .getElementById("searchInput")
    .value.toLowerCase();
  const yearFilter = document.getElementById("yearFilter").value;
  const typeFilter = document.getElementById("typeFilter").value.toLowerCase(); // Ensure the type filter is lowercase
  const questions = document.querySelectorAll(".question-item");

  questions.forEach((question) => {
    const questionText = question.querySelector(".question-text")
      ? question.querySelector(".question-text").textContent.toLowerCase()
      : "";

    const questionYear = question.querySelector(".question-year")
      ? question.querySelector(".question-year").textContent.trim()
      : "";

    const questionType = question.querySelector(".question-type")
      ? question
          .querySelector(".question-type")
          .textContent.trim()
          .toLowerCase()
      : "";

    // Check if the question matches the search query
    const matchesSearch = questionText.includes(searchQuery);

    // Check if the question matches the selected year filter
    const matchesYear = yearFilter ? questionYear.includes(yearFilter) : true;

    // Check if the question matches the selected type filter (either 'subjective' or 'objective')
    const matchesType = typeFilter ? questionType === typeFilter : true;

    // Set the display style based on matching conditions
    question.style.display =
      matchesSearch && matchesYear && matchesType ? "" : "none";
  });
}

// Fetch and display questions when a subject is selected
function showQuestions(subject) {
  document.getElementById("questions-container").style.display = "block";

  // Remove active class from all buttons
  document.querySelectorAll(".subject-selection button").forEach((btn) => {
    btn.classList.remove("active");
  });

  // Add active class to the clicked button
  const clickedButton = document.querySelector(
    `button[data-subject="${subject}"]`
  );
  clickedButton.classList.add("active");

  fetch(`/api/questions/${subject}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      const questionList = document.getElementById("question-list");
      questionList.innerHTML = ""; // Clear previous questions

      // Safely extract and validate data
      const subjective = Array.isArray(data.subjective) ? data.subjective : [];
      const mcqs = Array.isArray(data.mcqs) ? data.mcqs : [];
      const diagrams = Array.isArray(data.diagrams) ? data.diagrams : [];

      // Display Subjective Questions
      subjective.forEach((q) => {
        const questionItem = document.createElement("div");
        questionItem.classList.add("question-item", "subjective");

        questionItem.innerHTML = `
          <div class="check_container">
            <input id="subjective-${q.id}" class="question-checkbox hidden" type="checkbox" value="subjective-${q.id}" name="questions">
            <label class="checkbox" for="subjective-${q.id}"></label>
          </div>
          <span class="question-text">${q.question_text}</span>
          <div class="question-details">
            <div class="question-year">${q.year}</div>
            <div class="question-type">${q.question_type}</div>
          </div>
        `;
        questionList.appendChild(questionItem);
      });

      // Display MCQs (Objective Questions)
      mcqs.forEach((q) => {
        const questionItem = document.createElement("div");
        questionItem.classList.add("question-item", "objective");

        const optionsHTML = q.options
          .map(
            (option) =>
              `<div class="option">${option.option}: ${option.text}</div>`
          )
          .join("");

        const correctAnswer = `<div class="correct-answer"><strong>Correct Answer:</strong> ${q.correct_answer}</div>`;

        questionItem.innerHTML = `
          <div class="check_container">
            <input id="objective-${q.id}" class="question-checkbox hidden" type="checkbox" value="objective-${q.id}" name="questions">
            <label class="checkbox" for="objective-${q.id}"></label>
          </div>
          <span class="question-text">${q.question_text}</span>
          <div class="question-options">${optionsHTML}</div>
          ${correctAnswer}
          <div class="question-details">
            <div class="question-year">${q.year}</div>
            <div class="question-type">${q.type}</div>
          </div>
        `;
        questionList.appendChild(questionItem);
      });
  
      diagrams.forEach((q) => {
        const questionItem = document.createElement("div");
        questionItem.classList.add("question-item", "diagram");

        const diagramImage = q.diagram_url
          ? `<div class="question-diagram">
       <img src="/Images/Diagrams/${q.diagram_url}" alt="Diagram" loading="lazy" onerror="this.src='/Images/Diagrams/abc-image.png';">
     </div>`
          : `<div class="question-diagram">[Diagram not available]</div>`;


        questionItem.innerHTML = `
          <div class="check_container">
            <input id="diagram-${q.id}" class="question-checkbox hidden" type="checkbox" value="diagram-${q.id}" name="questions">
            <label class="checkbox" for="diagram-${q.id}"></label>
          </div>
          <span class="question-text">${q.question_text}</span>
          ${diagramImage}
          <div class="question-details">
            <div class="question-year">${q.year}</div>
            <div class="question-type">${q.question_type}</div>
          </div>
        `;
        questionList.appendChild(questionItem);
      });

      // Reinitialize event listeners for dynamically added checkboxes
      document.querySelectorAll(".question-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          console.log(`Checkbox ${checkbox.id} selected: ${checkbox.checked}`);
        });
      });

      filterQuestions(); // Apply filters

      // Scroll to the questions container smoothly
      document.getElementById("questions-container").scrollIntoView({
        behavior: "smooth"
      });
    })
    .catch((error) => {
      console.error("Error fetching questions:", error);
      alert("Failed to fetch questions. Please try again later.");
    });
}

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const addNewQuestionBtn = document.getElementById("addNewQuestionBtn");
  const addQuestionContainer = document.getElementById("add-question-modal");  // Ensure this matches the modal ID in HTML
  const overlay = document.getElementById("overlay");
  const closeModalBtn = document.getElementById("closeModalBtn");

  // Ensure all modal elements are present
  if (addNewQuestionBtn && addQuestionContainer && overlay && closeModalBtn) {

    // Show modal when 'Add New Question' button is clicked
    addNewQuestionBtn.addEventListener("click", () => {
      addQuestionContainer.classList.add("show");
      overlay.classList.add("show");
    });

    // Close modal when overlay or close button is clicked
    overlay.addEventListener("click", closeModal);
    closeModalBtn.addEventListener("click", closeModal);

    // Close modal function to remove 'show' class from modal and overlay
    function closeModal() {
      addQuestionContainer.classList.remove("show");
      overlay.classList.remove("show");
    }

    // Handle form logic for adding questions
    const addQuestionForm = document.getElementById("add-question-form");
    const questionTypeSelect = document.getElementById("type");
    const optionsContainer = document.getElementById("options-container");
    const diagramContainer = document.getElementById("diagram-container");

    // Show relevant input fields based on question type selected
    questionTypeSelect.addEventListener("change", () => {
      const questionType = questionTypeSelect.value;

      // Toggle visibility of options and diagram containers based on question type
      optionsContainer.style.display = questionType === "objective" ? "block" : "none";
      diagramContainer.style.display = questionType === "diagram" ? "block" : "none";
    });

    // Handle form submission
    addQuestionForm.addEventListener("submit", async (e) => {
      e.preventDefault();  // Prevent the form from submitting normally

      // Collect form data
      const formData = new FormData(addQuestionForm);
      const questionType = formData.get("type");

      // Determine the API endpoint based on the question type
      let endpoint = "";
      if (questionType === "objective") {
        endpoint = "/api/questions/mcq";
      } else if (questionType === "diagram") {
        endpoint = "/api/questions/diagrams";
      } else if (questionType === "subjective") {
        endpoint = "/api/questions/subjective";
      } else {
        alert("Invalid question type selected!");
        return;  // Exit if invalid question type is selected
      }

      // Make the API request to add the question
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          body: formData,  // Send formData for file upload (if any)
        });

        const result = await response.json();
        
        if (response.ok) {
          alert("Question added successfully!");
          addQuestionForm.reset();  // Reset the form
          optionsContainer.style.display = "none";  // Hide the options container
          diagramContainer.style.display = "none";  // Hide the diagram container
          closeModal();  // Close the modal after successful submission
        } else {
          alert(`Error: ${result.error || result.message}`);  // Display error if API returns an error
        }
      } catch (error) {
        console.error("Error adding question:", error);
        alert("Failed to add question. Please try again later.");
      }
    });

  } else {
    console.error("One or more modal elements not found in the DOM");
  }
});





// Function to select all questions
function selectAllQuestions() {
  const checkboxes = document.querySelectorAll('input[name="questions"]');
  checkboxes.forEach((checkbox) => (checkbox.checked = true));
}

// Select the loader container
const loaderContainer = document.getElementById("loader-container");

// Function to show the loader
function showLoader() {
  loaderContainer.style.display = "flex";
}

// Function to hide the loader
function hideLoader() {
  loaderContainer.style.display = "none";
}

// Handle form submission to generate PDF
async function handleGeneratePDF(event) {
  event.preventDefault(); // Prevent default form submission

  const selectedButton = document.querySelector("button.active");
  if (!selectedButton) {
    alert("Please select a subject.");
    return;
  }

  const subject = selectedButton.getAttribute("data-subject");
  const selectedQuestions = Array.from(
    document.querySelectorAll('input[name="questions"]:checked')
  ).map((el) => el.value);  // Get the selected question IDs

  const pdfName = document.getElementById("pdfName").value.trim();

  if (selectedQuestions.length === 0) {
    alert("Please select at least one question.");
    return;
  }
  if (!pdfName) {
    alert("Please provide a name for the PDF.");
    return;
  }

  // Show the loader while generating PDF
  showLoader();

  try {
    const response = await fetch("/generate-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, questions: selectedQuestions, pdfName }),
    });

    const data = await response.json();

    if (data.success) {
      const fileSize = formatFileSize(data.size); // Format the size
      alert(`PDF Generated Successfully: ${data.pdfFileName}`);
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Failed to generate PDF. Please try again.");
  } finally {
    // Hide the loader after processing
    hideLoader();
  }
}





// Helper function to format file size from bytes to B, KB, MB, etc.
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + " KB";
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + " MB";
  else return (bytes / 1073741824).toFixed(2) + " GB";
}

// Function to handle random selection
async function selectRandomly() {
  const subject = document
    .querySelector("button.active")
    .getAttribute("data-subject");
  const questionCount = parseInt(
    document.getElementById("random-question-count").value,
    10
  );

  // Fetch questions for the selected subject
  const response = await fetch(`/api/questions/${subject}`);
  const data = await response.json();

  // Combine both subjective and MCQ questions
  const allQuestions = [...data.subjective, ...data.mcqs];

  if (questionCount > allQuestions.length) {
    alert(
      "The number of questions exceeds the available questions. Try again."
    );
    return;
  }

  // Shuffle the questions and select the specified number
  const selectedQuestions = shuffle(allQuestions).slice(0, questionCount);

  // Select the checkboxes for the randomly chosen questions
  document.querySelectorAll('input[name="questions"]').forEach((checkbox) => {
    checkbox.checked = false;
  });

  selectedQuestions.forEach((question) => {
    const checkbox = document.querySelector(`input[value="${question.type}-${question.id}"]`);
    if (checkbox) {
      checkbox.checked = true;
    }
  });  
}

// Function to shuffle an array (Fisher-Yates algorithm)
function shuffle(array) {
  let currentIndex = array.length,
    randomIndex,
    temporaryValue;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

// Function to toggle the random selection input field visibility
function toggleRandomSelectionInput() {
  const randomSelectionContainer = document.getElementById(
    "random-selection-container"
  );
  randomSelectionContainer.style.display =
    randomSelectionContainer.style.display === "none" ? "block" : "none";
}

// Function to validate random question input
function validateRandomInput() {
  const inputField = document.getElementById("random-question-count");
  if (inputField.value <= 0) {
    inputField.setCustomValidity("Please enter a valid number.");
  } else {
    inputField.setCustomValidity("");
  }
}

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