//Questions will appear altogether
let questions = [];
let currentQuestionIndex = 0;

function attemptExam() {
    const examId = 1; // Replace with dynamic exam ID if necessary
    document.getElementById("attemptExamButton").style.display = "none";
    document.getElementById("examQuestions").style.display = "block";
    document.querySelector(".navigation").style.display = "block";

    fetchQuestions(examId);
}

function fetchQuestions(examId) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", `/api/exam?examId=${examId}`, true);

    xhr.onload = function () {
        if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);

            const subjectiveQuestions = data.subjectiveQuestions || [];
            const objectiveQuestions = data.objectiveQuestions || [];
            const diagramQuestions = data.diagramQuestions || [];

            // Combine all questions into a single array
            questions = [
                ...subjectiveQuestions.map((q) => ({ ...q, type: "subjective" })),
                ...objectiveQuestions.map((q) => ({
                    ...q,
                    type: "objective",
                    options: [q.option_a, q.option_b, q.option_c, q.option_d],
                })),
                ...diagramQuestions.map((q) => ({ ...q, type: "diagram" })),
            ];

            if (questions.length > 0) {
                renderQuestion();
            } else {
                alert("No questions available for this exam.");
            }
        } else {
            console.error("Failed to fetch questions:", xhr.responseText);
            alert("Error fetching questions.");
        }
    };

    xhr.onerror = function () {
        console.error("Network error while fetching questions.");
        alert("Network error. Please try again.");
    };

    xhr.send();
}

function renderQuestion() {
    const questionContainer = document.getElementById("examQuestions");
    questionContainer.innerHTML = "";

    if (questions.length === 0) {
        questionContainer.innerHTML = `<p>No questions available.</p>`;
        return;
    }

    const question = questions[currentQuestionIndex];
    let questionHtml = `<div class="question"><p><strong>Q:  ${question.question_text}</strong></p>`;

    if (question.type === "subjective") {
        questionHtml += `<textarea rows="5" cols="50" name="answer"></textarea>`;
    } else if (question.type === "objective") {
        questionHtml += question.options
            .map(
                (option) =>
                    `<div>
                        <label>
                            <input type="radio" name="answer" value="${option}" />
                            ${option}
                        </label>
                    </div>`
            )
            .join("");
    } else if (question.type === "diagram") {
        questionHtml += `
            <img src="http://localhost:3000/Images/Diagrams/${question.diagram_url}" alt="Diagram Question" />
            <p>${question.question_text}</p>
            <textarea rows="5" cols="50" name="answer"></textarea>`;
    }

    questionHtml += `</div>`;
    questionContainer.innerHTML = questionHtml;

    updateNavigationButtons();
}

function updateNavigationButtons() {
    document.getElementById("previousBtn").disabled = currentQuestionIndex === 0;
    document.getElementById("nextBtn").disabled =
        currentQuestionIndex === questions.length - 1;
}

function navigateQuestion(direction) {
    if (direction === "previous" && currentQuestionIndex > 0) {
        currentQuestionIndex--;
    } else if (direction === "next" && currentQuestionIndex < questions.length - 1) {
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
