// Utility Functions
function toggleModalVisibility(modalId, isVisible) {
  document.getElementById(modalId).style.display = isVisible ? "flex" : "none";
}

// Initialize Event Listeners
function initializeEventListeners() {
  document.getElementById("pdfForm").addEventListener("submit", handleGeneratePDF);
  document.getElementById("addQuestionForm").addEventListener("submit", handleAddQuestion);
  document.getElementById("type").addEventListener("change", handleTypeChange);
  document.getElementById("selectAllButton").addEventListener("click", selectAllQuestions);
  document.getElementById("searchInput").addEventListener("keyup", filterQuestions);
  document.getElementById("yearFilter").addEventListener("change", filterQuestions);
  document.getElementById("typeFilter").addEventListener("change", filterQuestions);
}

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
    data.subjective.forEach((question) => {
      const questionItem = document.createElement("div");
      questionItem.classList.add("question-item");
      questionItem.innerHTML = `
        <input type="checkbox" value="${question.id}" name="questions">
        <span>${question.question_text}</span>
        <div class="question-details">
          <div>Year: ${question.year}</div>
          <div>Type: ${question.question_type}</div>
        </div>`;
      questionList.appendChild(questionItem);
    });

    // Display MCQ Questions
    data.mcqs.forEach((question) => {
      const questionItem = document.createElement("div");
      questionItem.classList.add("question-item");
      questionItem.innerHTML = `
        <input type="checkbox" value="${question.id}" name="questions">
        <span>${question.question_text}</span>
        <div class="question-details">
          <div>Options:</div>
          <ul>
            ${question.options
              .map((option) => `<li>${option.option}: ${option.text}</li>`)
              .join("")}
          </ul>
          <div>Correct Answer: ${question.correct_answer}</div>
        </div>`;
      questionList.appendChild(questionItem);
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    questionList.innerHTML = "<p>Failed to load questions. Try again later.</p>";
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

  try {
    const response = await fetch("/generate-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, questions: selectedQuestions, pdfName }),
    });

    const data = await response.json();

    if (data.success) {
      alert(`PDF Generated Successfully: ${data.pdfFileName}`);
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Failed to generate PDF. Please try again.");
  }
}

// Handle Type Change in Modal
function handleTypeChange() {
  const type = document.getElementById("type").value;
  const objectiveOptions = document.getElementById("objectiveOptions");
  objectiveOptions.style.display = type === "Objective" ? "block" : "none";
}

// Handle New Question Submission
async function handleAddQuestion(event) {
  event.preventDefault();

  const formData = {
    subject: document.getElementById("subject").value,
    year: document.getElementById("year").value,
    type: document.getElementById("type").value,
    questionText: document.getElementById("questionText").value,
  };

  if (formData.type === "Objective") {
    formData.options = document
      .getElementById("options")
      .value.split("\n")
      .map((option) => option.trim());
    formData.correctAnswer = document.getElementById("correctAnswer").value.trim();
  }

  try {
    const response = await fetch("/api/add-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!response.ok) throw new Error("Failed to add question");

    alert("Question added successfully!");

    toggleModalVisibility("addQuestionModal", false);
    document.getElementById("addQuestionForm").reset();

    const activeSubject = document.querySelector(".subject-selection button.active");
    if (activeSubject) {
      showQuestions(activeSubject.dataset.subject);
    }
  } catch (error) {
    console.error("Error adding question:", error);
    alert("Failed to add question. Please try again.");
  }
}

// Initialize Event Listeners
document.addEventListener("DOMContentLoaded", initializeEventListeners);
