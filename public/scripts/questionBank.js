
      // Function to dynamically load and display questions for the selected subject
      async function showQuestions(subject) {
        const questionList = document.getElementById("question-list");
        questionList.innerHTML = ""; // Clear previous questions
        document.getElementById("questions-container").style.display = "block";

        // Highlight the clicked button
        document
          .querySelectorAll(".subject-selection button")
          .forEach((button) => {
            button.classList.remove("active"); // Remove active class from all
          });
        document
          .querySelector(`button[data-subject="${subject}"]`)
          .classList.add("active"); // Add active class to clicked button

        try {
          const response = await fetch(`/api/questions/${subject}`);
          if (!response.ok) throw new Error("Failed to fetch questions");

          const questions = await response.json();
          if (questions.length === 0) {
            questionList.innerHTML =
              "<p>No questions found for this subject.</p>";
          } else {
            questions.forEach((question) => {
              const questionItem = document.createElement("div");
              questionItem.classList.add("question-item");
              questionItem.innerHTML = `
                            <input type="checkbox" value="${question.id}" name="questions"> <!-- Ensure value is question.id -->
                            <span>${question.question_text}</span>
                            <div class="question-details">
                                <div class="question-header">${question.year}</div>
                                <div class="question-header">Subject: ${question.subject}</div>
                                <div class="question-header">Type: ${question.question_type}</div>
                            </div>`;
              questionList.appendChild(questionItem);
            });
          }
        } catch (error) {
          console.error("Error fetching questions:", error);
          questionList.innerHTML =
            "<p>Failed to load questions. Try again later.</p>";
        }
      }

      // Function to filter questions based on search and selected filters
      function filterQuestions() {
        const searchQuery = document
          .getElementById("searchInput")
          .value.toLowerCase();
        const yearFilter = document.getElementById("yearFilter").value;
        const typeFilter = document.getElementById("typeFilter").value;
        const questions = document.querySelectorAll(".question-item");

        questions.forEach((question) => {
          const questionText = question
            .querySelector("span")
            .textContent.toLowerCase();
          const questionYear = question.querySelector(
            ".question-header:nth-child(1)"
          ).textContent;
          const questionType = question.querySelector(
            ".question-header:nth-child(3)"
          ).textContent;

          const matchesSearch = questionText.includes(searchQuery);
          const matchesYear = yearFilter
            ? questionYear.includes(yearFilter)
            : true;
          const matchesType = typeFilter
            ? questionType.includes(typeFilter)
            : true;

          if (matchesSearch && matchesYear && matchesType) {
            question.style.display = "";
          } else {
            question.style.display = "none";
          }
        });
      }

      // Function to select all questions
      function selectAllQuestions() {
        const checkboxes = document.querySelectorAll('input[name="questions"]');
        checkboxes.forEach((checkbox) => (checkbox.checked = true));
      }
      // Handle form submission to generate PDF
      document
        .getElementById("pdfForm")
        .addEventListener("submit", function (event) {
          event.preventDefault(); // Prevent default form submission

          const selectedButton = document.querySelector("button.active"); // Get the active button (selected subject)
          if (!selectedButton) {
            alert("Please select a subject.");
            return;
          }

          const subject = selectedButton.getAttribute("data-subject"); // Get the selected subject
          const selectedQuestions = Array.from(
            document.querySelectorAll('input[name="questions"]:checked')
          ).map((el) => el.value); // Get selected question IDs

          const pdfName = document.getElementById("pdfName").value.trim();

          // Check if at least one question is selected and PDF name is provided
          if (selectedQuestions.length === 0) {
            alert("Please select at least one question.");
            return;
          }
          if (!pdfName) {
            alert("Please provide a name for the PDF.");
            return;
          }

          // Log the data for debugging
          console.log("Selected Questions:", selectedQuestions);
          console.log("PDF Name:", pdfName);

          // Send the request to the backend to generate the PDF
          fetch("/generate-pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subject: subject,
              questions: selectedQuestions,
              pdfName: pdfName,
            }),
          })
            .then((response) => response.json())
            .then((data) => {
              if (data.success) {
                alert(`PDF Generated Successfully: ${data.pdfFileName}`);
              } else {
                alert(`Error: ${data.error}`);
              }
            })
            .catch((error) => {
              console.error("Error generating PDF:", error);
              alert("Failed to generate PDF. Please try again.");
            });
        });
      // Open and Close Modal Functions
      function openAddQuestionModal() {
        document.getElementById("addQuestionModal").style.display = "flex";
      }

      function closeAddQuestionModal() {
        document.getElementById("addQuestionModal").style.display = "none";
      }

      // Handle New Question Submission
      document
        .getElementById("addQuestionForm")
        .addEventListener("submit", async function (event) {
          event.preventDefault();

          // Gather form data
          const formData = {
            subject: document.getElementById("subject").value,
            year: document.getElementById("year").value,
            type: document.getElementById("type").value,
            questionText: document.getElementById("questionText").value,
          };

          try {
            const response = await fetch("/api/add-question", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(formData),
            });

            if (!response.ok) throw new Error("Failed to add question");

            alert("Question added successfully!");

            // Close modal and reset the form
            closeAddQuestionModal();
            document.getElementById("addQuestionForm").reset();

            // Optionally, reload questions to reflect the new addition
            const activeSubject = document.querySelector(
              ".subject-selection button.active"
            );
            if (activeSubject) {
              showQuestions(activeSubject.dataset.subject);
            }
          } catch (error) {
            console.error("Error adding question:", error);
            alert("Failed to add question. Please try again.");
          }
        });