document.addEventListener('DOMContentLoaded', async () => {
    const usersTableBody = document.querySelector('#usersTable tbody');
  
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
  
      const users = await response.json();
      usersTableBody.innerHTML = ''; // Clear any existing rows
  
      users.forEach(user => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
          <td>${user.firstname}</td>
          <td>${user.lastname}</td>
          <td>${user.email}</td>
          <td>${user.role}</td>
          <td>
            <button class="btn delete-btn" data-id="${user.user_id}">Delete</button>
          </td>
        `;
  
        usersTableBody.appendChild(row);
      });
  
      const deleteButtons = document.querySelectorAll('.delete-btn');
      deleteButtons.forEach(button => {
        button.addEventListener('click', async (event) => {
          const userId = event.target.getAttribute('data-id');
          
          // Confirm before deletion
          const isConfirmed = confirm('Are you sure you want to delete this user?');
          if (isConfirmed) {
            try {
              const deleteResponse = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
              });
              if (!deleteResponse.ok) {
                const error = await deleteResponse.json();
                throw new Error(error.error || 'Failed to delete user');
              }
  
              const deleteResult = await deleteResponse.json();
              alert(deleteResult.success); // Show success message
              event.target.closest('tr').remove(); // Remove the user row from the table
            } catch (error) {
              alert('Error deleting user: ' + error.message);
            }
          }
        });
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Error fetching users');
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

  document.addEventListener("DOMContentLoaded", async () => {
    const approvalList = document.getElementById("approvalList");
  
    try {
      // Fetch pending approvals
      const response = await fetch("/api/pending-approvals");
      if (!response.ok) {
        throw new Error("Failed to fetch pending approvals");
      }
  
      const pendingUsers = await response.json();
      approvalList.innerHTML = ""; // Clear any existing rows
  
      // Populate pending users in table rows
      pendingUsers.forEach((user) => {
        const row = document.createElement("tr");
  
        row.innerHTML = `
          <td>${user.firstname}</td>
          <td>${user.lastname}</td>
          <td>${user.email}</td>
          <td>${user.role}</td>
          <td>
            <button class="btn approve-btn" data-id="${user.id}">Approve</button>
            <button class="btn deny-btn" data-id="${user.id}">Deny</button>
          </td>
        `;
  
        approvalList.appendChild(row);
      });
  
      // Add event listeners for Approve/Deny buttons
      document.querySelectorAll(".approve-btn").forEach((button) => {
        button.addEventListener("click", async (event) => {
          const userId = event.target.getAttribute("data-id");
          try {
            const response = await fetch(`/api/pending-approvals/${userId}/approve`, { method: "POST" });
            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || "Failed to approve user");
            }
            alert("User approved successfully");
            event.target.closest("tr").remove(); // Remove the row from the table
          } catch (error) {
            alert("Error approving user: " + error.message);
          }
        });
      });
  
      document.querySelectorAll(".deny-btn").forEach((button) => {
        button.addEventListener("click", async (event) => {
          const userId = event.target.getAttribute("data-id");
          try {
            const response = await fetch(`/api/pending-approvals/${userId}/deny`, { method: "DELETE" });
            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || "Failed to deny user");
            }
            alert("User denied successfully");
            event.target.closest("tr").remove(); // Remove the row from the table
          } catch (error) {
            alert("Error denying user: " + error.message);
          }
        });
      });
    } catch (error) {
      console.error("Error fetching pending approvals:", error);
      alert("Error fetching pending approvals");
    }
  });
  
  
  // Smooth scroll to the "question-bank" section
document.querySelector('nav a[href="#question-bank"]').addEventListener("click", (e) => {
    e.preventDefault();
    const questionBankSection = document.getElementById("question-bank");
    questionBankSection.scrollIntoView({ behavior: "smooth" });
  });
  
  // Toggle the visibility of the questions container
  function toggleQuestionsContainer() {
  const questionsContainer = document.getElementById("questions-container");
  const toggleButton = document.getElementById("toggleQuestionsBtn");

  if (questionsContainer.classList.contains("show")) {
    // Hide the container with animation
    questionsContainer.classList.remove("show");
    questionsContainer.classList.add("hide");

    // Wait for animation to complete before setting display to none
    setTimeout(() => {
      questionsContainer.style.display = "none";
      toggleButton.textContent = "Show Questions";
    }, 500); // Match the duration of the animation
  } else {
    // Show the container with animation
    questionsContainer.style.display = "block"; // Make it visible initially
    questionsContainer.classList.remove("hide");
    questionsContainer.classList.add("show");
    toggleButton.textContent = "Hide Questions";
  }
}

  