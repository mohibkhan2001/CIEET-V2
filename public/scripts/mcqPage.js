// Function to dynamically load and display MCQs based on the selected subject
async function showMCQs(subject) {
    const questionList = document.getElementById("question-list");
    questionList.innerHTML = ""; // Clear previous questions

    // Highlight the clicked button
    document.querySelectorAll(".subject-selection button").forEach((button) => {
        button.classList.remove("active"); // Remove active class from all
    });
    document.querySelector(`button[data-subject="${subject}"]`).classList.add("active"); // Add active class to clicked button

    try {
        const response = await fetch(`/api/mcqs/${subject}`);
        if (!response.ok) throw new Error("Failed to fetch MCQs");

        const questions = await response.json();
        if (questions.length === 0) {
            questionList.innerHTML = "<p>No MCQs found for this subject.</p>";
        } else {
            questions.forEach((question) => {
                const questionItem = document.createElement("div");
                questionItem.classList.add("question-item");
                questionItem.innerHTML = `
                    <p><strong>${question.question_text}</strong></p>
                    <div class="options">
                        ${question.options.map(opt => `
                            <label>
                                <input type="radio" name="q${question.id}" value="${opt.option}">${opt.option}: ${opt.text}
                            </label>
                        `).join('')}

                    </div>
                    
                    <div class="correct-answer">Correct Answer: ${question.correct_answer}</div>
                `;
                questionList.appendChild(questionItem);
            });
        }
    } catch (error) {
        console.error("Error fetching MCQs:", error);
        questionList.innerHTML = "<p>Failed to load questions. Try again later.</p>";
    }
}
