      // Simulated user data (replace with actual user data from backend)
      const authContainer = document.getElementById("auth-buttons");

      // Fetch user info from backend API after page loads
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

              // Role-based redirection
              if (user.role === "Teacher") {
                // Redirect to Teacher's Dashboard if the user is a Teacher
                window.location.href = "/index"; 
              } else if (user.role === "Student") {
                // Stay on StudentPortal if the user is a Student
               
              }
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

      // Initialize animations
      AOS.init();