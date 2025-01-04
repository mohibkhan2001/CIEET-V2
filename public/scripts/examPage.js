let questions = [];
let currentQuestionIndex = 0;
let timerInterval;
let timeRemaining;

// Get the examId from the URL
const examId = window.location.pathname.split("/").pop();

window.onload = function () {
  loadExamPage(examId); // Load the exam page with the specific exam ID
};

function loadExamPage(examId) {
  // Fetch and display the selected exam details and questions
  const xhr = new XMLHttpRequest();
  xhr.open("GET", `/api/exam/${examId}`, true);

  xhr.onload = function () {
    if (xhr.status === 200) {
      const data = JSON.parse(xhr.responseText);

      // Load exam details immediately
      document.getElementById("examTitle").textContent = `Exam: ${data.examId}`;
      document.getElementById("examSubject").textContent = data.subject || "No subject provided.";
      document.getElementById("examDescription").textContent = data.description || "No description provided.";
      document.getElementById("studentName").textContent = "John Doe"; // Replace with dynamic data if needed

      // Set timer duration but don't start it yet
      timeRemaining = data.timer * 60;

      const subjectiveQuestions = data.subjectiveQuestions || [];
      const objectiveQuestions = data.objectiveQuestions || [];
      const diagramQuestions = data.diagramQuestions || [];

      questions = [
        ...subjectiveQuestions.map((q) => ({ ...q, type: "subjective" })),
        ...objectiveQuestions.map((q) => ({
          ...q,
          type: "objective",
          options: [q.option_a, q.option_b, q.option_c, q.option_d],
        })),
        ...diagramQuestions.map((q) => ({ ...q, type: "diagram" })),
      ];

      // Show the "Attempt Exam" button and start exam
      document.getElementById("attemptExamButton").style.display = "block";
    } else {
      console.error("Failed to fetch questions:", xhr.responseText);
      alert("Error fetching exam data.");
    }
  };

  xhr.onerror = function () {
    console.error("Network error while fetching exam data.");
    alert("Network error. Please try again.");
  };

  xhr.send();
}

function attemptExam() {
  document.getElementById("attemptExamButton").style.display = "none";
  document.getElementById("examQuestions").style.display = "block";
  document.querySelector(".navigation").style.display = "block";

  startTimer(timeRemaining);
  renderQuestion();
}

function navigateToQuestion(index) {
  // Save the current answer before navigating to another question
  saveAnswer(currentQuestionIndex);

  currentQuestionIndex = index;
  renderQuestion();
  updateNavigationButtons();
}

function saveAnswer(index) {
  const question = questions[index];
  let answerText = "";

  const questionElement = document.querySelectorAll("#examQuestions .question")[index];

  if (!questionElement) return; // Ensure the question element exists

  // Check for question type and get the answer accordingly
  if (question.type === "subjective" || question.type === "diagram") {
    // Collect answer from textarea for subjective and diagram questions
    const textarea = questionElement.querySelector("textarea");
    if (textarea) {
      answerText = textarea.value;
    }
  } else if (question.type === "objective") {
    // Collect answer from selected radio button for objective questions
    const selectedOption = questionElement.querySelector('input[type="radio"]:checked');
    if (selectedOption) {
      answerText = selectedOption.value;
    }
  }

  // Save the answer in `localStorage`
  const savedAnswers = JSON.parse(localStorage.getItem("answers")) || {};
  savedAnswers[index] = answerText; // Save answer for the current question
  localStorage.setItem("answers", JSON.stringify(savedAnswers));
}

function addEventListenersToQuestion(index) {
  const questionElement = document.querySelectorAll("#examQuestions .question")[index];

  if (!questionElement) return;

  if (questionElement.querySelector("textarea")) {
    questionElement.querySelector("textarea").addEventListener("input", function() {
      saveAnswer(index);
    });
  }

  if (questionElement.querySelectorAll('input[type="radio"]').length > 0) {
    questionElement.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener("change", function() {
        saveAnswer(index);
      });
    });
  }
}

function navigateQuestion(direction) {
  if (direction === "next" && currentQuestionIndex < questions.length - 1) {
    currentQuestionIndex++;
    renderQuestion();
  } else if (direction === "previous" && currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderQuestion();
  }

  updateNavigationButtons();
}

// Call addEventListenersToQuestion when rendering a question
function renderQuestion() {
  const questionContainer = document.getElementById("examQuestions");
  questionContainer.innerHTML = ""; // Clear previous content

  if (questions.length === 0) {
    questionContainer.innerHTML = `<p>No questions available.</p>`;
    return;
  }

  // Loop through all questions and render them
  questions.forEach((question, index) => {
    let questionHtml = `<div class="question"><p><strong>Q${index + 1}: ${question.question_text}</strong></p>`;

    if (question.type === "subjective") {
      // Render textarea for subjective questions
      questionHtml += `<textarea rows="5" cols="50" name="answer">${getSavedAnswer(index)}</textarea>`;
    } else if (question.type === "objective") {
      // Render radio buttons for objective questions
      questionHtml += question.options
        .map(
          (option) =>
            `<div>
                <label>
                  <input type="radio" name="answer${index}" value="${option}" ${option === getSavedAnswer(index) ? 'checked' : ''}/>
                  ${option}
                </label>
              </div>`
        )
        .join("");
    } else if (question.type === "diagram") {
      // Render image and textarea for diagram questions
      questionHtml += ` 
        <img src="http://localhost:3000/Images/Diagrams/${question.diagram_url}" 
             alt="Diagram Question" 
             style="width: 300px; height: auto; max-height: 300px; border-radius: 10px; object-fit: contain;" />
        <textarea rows="5" cols="50" name="answer">${getSavedAnswer(index)}</textarea>`;
    }

    questionHtml += `</div>`;
    questionContainer.innerHTML += questionHtml;

    // Add event listeners for each question
    addEventListenersToQuestion(index);
  });

  // After rendering all questions, update the navigation buttons
  updateNavigationButtons();
}

function getSavedAnswer(index) {
  const savedAnswers = JSON.parse(localStorage.getItem("answers")) || {};
  return savedAnswers[index] || ''; // Return saved answer or empty string if no answer is saved
}

function startTimer(duration) {
  let timeRemaining = duration;
  document.getElementById("timer").style.display = "block";

  timerInterval = setInterval(() => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    document.getElementById("timeRemaining").textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    timeRemaining--;

    if (timeRemaining < 0) {
      clearInterval(timerInterval);
      alert("Time's up!");
      submitExam();
    }
  }, 1000);
}

function updateNavigationButtons() {
  document.getElementById("previousBtn").disabled = currentQuestionIndex === 0;
  document.getElementById("nextBtn").disabled = currentQuestionIndex === questions.length - 1;
  document.getElementById("submitBtn").disabled = false; // Enable submit button
}

function submitExam() {
  // Save the answer for the current question before submitting
  saveAnswer(currentQuestionIndex);

  // Get the user_id from the session (this should be available after login)
  const userId = sessionStorage.getItem("user_id"); // Example of session storage, make sure to use the session as needed

  // Collect answers from all questions
  const savedAnswers = JSON.parse(localStorage.getItem("answers")) || {};
  const answers = questions.map((question, index) => ({
    user_id: userId, // Use user_id from session
    exam_id: examId,
    question_text: question.question_text,
    question_type: question.type,
    answer_text: savedAnswers[index] || "", // Get answer from localStorage
    submitted_at: new Date().toISOString(),
  }));

  // Send the answers to the server to save in the database
  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/api/saveStudentAnswers", true);
  xhr.setRequestHeader("Content-Type", "application/json");

  xhr.onload = function () {
    if (xhr.status === 200) {
      alert("Exam submitted successfully.");
      // You can handle further actions after submission, e.g., redirect or show confirmation
    } else {
      console.error("Failed to submit exam:", xhr.responseText);
      alert("Error submitting exam. Please try again.");
    }
  };

  xhr.onerror = function () {
    console.error("Network error while submitting exam.");
    alert("Network error. Please try again.");
  };

  // Send the answers to the backend
  xhr.send(JSON.stringify(answers));
}
