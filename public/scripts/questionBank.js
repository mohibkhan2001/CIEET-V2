// Utility Functions
function toggleModalVisibility(modalId, isVisible) {
  document.getElementById(modalId).style.display = isVisible ? "flex" : "none";
}

// Initialize Event Listeners
function initializeEventListeners() {
  document.getElementById("pdfForm").addEventListener("submit", handleGeneratePDF);
  document.getElementById("selectAllButton").addEventListener("click", selectAllQuestions);
  document.getElementById("searchInput").addEventListener("keyup", filterQuestions);
  document.getElementById("yearFilter").addEventListener("change", filterQuestions);
  document.getElementById("typeFilter").addEventListener("change", filterQuestions);
  document.getElementById("randomSelectButton").addEventListener("click", toggleRandomSelectionInput);
  document.getElementById("random-question-count").addEventListener("input", validateRandomInput);
}

// Function to dynamically load and display questions for the selected subject
// Function to dynamically load and display questions for the selected subject
async function showQuestions(subject) {
  const questionContainer = document.getElementById("questions-container");
  const questionList = document.getElementById("question-list");
  questionList.innerHTML = ""; // Clear previous questions
  questionContainer.style.display = "block"; // Show the question container

  // Highlight the clicked button
  document.querySelectorAll(".subject-selection button").forEach((button) => {
    button.classList.remove("active");
  });
  document
    .querySelector(`button[data-subject="${subject}"]`)
    .classList.add("active");

  // Show the loader while fetching questions
  showLoader();

  try {
    const response = await fetch(`/api/questions/${subject}`);
    if (!response.ok) throw new Error("Failed to fetch questions");

    const data = await response.json();

    if (
      (!data.subjective || data.subjective.length === 0) &&
      (!data.mcqs || data.mcqs.length === 0)
    ) {
      questionList.innerHTML = "<p>No questions found for this subject.</p>";
      return;
    }

    // Display Subjective Questions
    if (data.subjective && data.subjective.length > 0) {
      data.subjective.forEach((question) => {
        const questionItem = document.createElement("div");
        questionItem.classList.add("question-item");
        questionItem.innerHTML = `
          <div class="check_container">
            <input id="checkbox-${question.id}" class="hidden" type="checkbox" value="${question.id}" name="questions">
            <label class="checkbox" for="checkbox-${question.id}"></label>
          </div>
          <span>${question.question_text}</span>
          <div class="question-details">
            <div><strong>Year:</strong> ${question.year}</div>
            <div><strong>Type:</strong> ${question.question_type}</div>
          </div>`;
        questionList.appendChild(questionItem);
      });
    }

    // Display MCQ Questions
    if (data.mcqs && data.mcqs.length > 0) {
      data.mcqs.forEach((question) => {
        const questionItem = document.createElement("div");
        questionItem.classList.add("question-item");
        questionItem.innerHTML = `
          <div class="check_container">
            <input id="checkbox-${question.id}" class="hidden" type="checkbox" value="${question.id}" name="questions">
            <label class="checkbox" for="checkbox-${question.id}"></label>
          </div>
          <span>${question.question_text}</span>
          <div class="question-details">
            <div><strong>Options:</strong></div>
            <ul>
              ${question.options
                .map((opt) => `<li>${opt.option}: ${opt.text}</li>`)
                .join("")}
            </ul>
            <div><strong>Correct Answer:</strong> ${question.correct_answer}</div>
            <div><strong>Year:</strong> ${question.year}</div>
            <div><strong>Type:</strong> ${question.type || "N/A"}</div>
          </div>`;
        questionList.appendChild(questionItem);
      });
    }
    
  } catch (error) {
    console.error("Error fetching questions:", error);
    questionList.innerHTML = "<p>Failed to load questions. Try again later.</p>";
  } finally {
    // Hide the loader after questions are fetched
    hideLoader();
  }
}


// Function to filter questions based on search and selected filters
function filterQuestions() {
  const searchQuery = document.getElementById("searchInput").value.toLowerCase();
  const yearFilter = document.getElementById("yearFilter").value;
  const typeFilter = document.getElementById("typeFilter").value;
  const questions = document.querySelectorAll(".question-item");

  questions.forEach((question) => {
    const questionText = question.querySelector("span").textContent.toLowerCase();
    const questionYear = question
      .querySelector(".question-details div:nth-child(1)")
      .textContent;
    const questionType = question
      .querySelector(".question-details div:nth-child(2)")
      .textContent;

    const matchesSearch = questionText.includes(searchQuery);
    const matchesYear = yearFilter ? questionYear.includes(yearFilter) : true;
    const matchesType = typeFilter ? questionType.includes(typeFilter) : true;

    question.style.display =
      matchesSearch && matchesYear && matchesType ? "" : "none";
  });
}

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
  ).map((el) => el.value);

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
  else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
  else return (bytes / 1073741824).toFixed(2) + ' GB';
}


// Function to handle random selection
async function selectRandomly() {
  const subject = document.querySelector("button.active").getAttribute("data-subject");
  const questionCount = parseInt(document.getElementById("random-question-count").value, 10);



  // Fetch questions for the selected subject
  const response = await fetch(`/api/questions/${subject}`);
  const data = await response.json();

  // Combine both subjective and MCQ questions
  const allQuestions = [
    ...data.subjective,
    ...data.mcqs
  ];

  // if (isNaN(questionCount) || questionCount <= 0) {
  //   alert("Please enter a valid number of questions.");
  //   return;
  // }

  if (questionCount > allQuestions.length) {
    alert("The number of questions exceeds the available questions. Try again.");
    return;
  }

  // Shuffle the questions and select the specified number
  const selectedQuestions = shuffle(allQuestions).slice(0, questionCount);

  // Select the checkboxes for the randomly chosen questions
  document.querySelectorAll('input[name="questions"]').forEach((checkbox) => {
    checkbox.checked = false;
  });

  selectedQuestions.forEach((question) => {
    const checkbox = document.querySelector(`input[value="${question.id}"]`);
    if (checkbox) {
      checkbox.checked = true;
    }
  });
}

// Function to shuffle an array (Fisher-Yates algorithm)
function shuffle(array) {
  let currentIndex = array.length, randomIndex, temporaryValue;

  // While there remain elements to shuffle
  while (currentIndex !== 0) {
    // Pick a remaining element
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // Swap it with the current element
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

// Function to toggle the random selection input field visibility
function toggleRandomSelectionInput() {
  const randomSelectionContainer = document.getElementById("random-selection-container");
  randomSelectionContainer.style.display = randomSelectionContainer.style.display === "none" ? "block" : "none";
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
document.getElementById("pdfForm").addEventListener("submit", handleGeneratePDF);

// Initialize event listeners after DOM content is loaded
document.addEventListener("DOMContentLoaded", initializeEventListeners);

// Ensure the DOM is fully loaded before attaching the event listener
document.addEventListener("DOMContentLoaded", function() {
  let viewPapersBtn = document.getElementById("viewBtn");
  
  // Check if the button exists
  if(viewPapersBtn) {
    viewPapersBtn.addEventListener("click", function() {
      window.location.href = "/generatedPapers";  // Redirect to the generated papers route
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

