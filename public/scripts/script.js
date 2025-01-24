  document.addEventListener("DOMContentLoaded", () => {
    // Fetch user info from backend API
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

          // Log the user ID to check if it's being fetched correctly
          console.log("Fetched user ID:", user.id);

          // Fetch notifications for the logged-in user
          fetchUnreadNotifications(user.id);
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

    // Initialize animations
    AOS.init();
  });

  // Function to fetch unread notifications for the logged-in user
  function fetchUnreadNotifications(userId) {
    // Log the user ID to ensure it's passed correctly
    console.log("Checking for unread notifications for userId:", userId);

    fetch(`/notifications/unread?userId=${userId}`)
      .then((response) => response.json())
      .then((notifications) => {
        const reportingLink = document.querySelector("#reporting-link"); // The reporting link
        const redDot = reportingLink.querySelector(".notification-dot");

        // Check if there are unread notifications and show the red dot
        if (notifications && notifications.length > 0) {
          if (redDot && redDot.style.display === "none") {
            redDot.style.display = "inline"; // Show the red dot
            console.log("Unread notifications found, red dot displayed.");
          }
        } else {
          // Hide the red dot if no unread notifications
          if (redDot && redDot.style.display === "inline") {
            redDot.style.display = "none"; // Hide the red dot
            console.log("No unread notifications, red dot hidden.");
          }
        }
      })
      .catch((error) => {
        console.error("Error fetching unread notifications:", error);
      });
  }

  // Function to mark notifications as read when the reporting link is clicked
  function markNotificationsAsRead(userId, type = 'submission') {
    fetch('/notifications/mark-read', {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json', // Ensure the content is JSON
      },
      body: JSON.stringify({ userId, type }) // Send both userId and type in the body
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          // Hide the red dot after marking notifications as read
          const reportingLink = document.querySelector("#reporting-link");
          const redDot = reportingLink.querySelector(".notification-dot");
          if (redDot) {
            redDot.style.display = "none"; // Hide the red dot
            console.log("Notifications marked as read, red dot hidden.");
          }
        } else {
          console.error("Failed to mark notifications as read");
        }
      })
      .catch((error) => {
        console.error("Error marking notifications as read:", error);
      });
  }
  

  // Event listener for reporting link click to mark notifications as read
  const reportingLink = document.querySelector("#reporting-link");
  if (reportingLink) {
    reportingLink.addEventListener("click", () => {
      // Assuming userId is available in the session or already fetched
      fetch("/api/user-info")
        .then((response) => response.json())
        .then((data) => {
          const userId = data.user.id;
          if (userId) {
            markNotificationsAsRead(userId);
          } else {
            console.error("User ID not available when clicking the reporting link");
          }
        })
        .catch((error) => {
          console.error("Error fetching user info during reporting link click:", error);
        });
    });
  }

  // Call the function periodically to check for new notifications (every 5 seconds)
  setInterval(() => {
    // Re-fetch user info to get the userId
    fetch("/api/user-info")
      .then((response) => response.json())
      .then((data) => {
        const userId = data.user.id;
        console.log("Checking for notifications every 5 seconds, userId:", userId);

        if (userId) {
          fetchUnreadNotifications(userId);
        } else {
          console.error("userId is not available during periodic check.");
        }
      })
      .catch((error) => {
        console.error("Error fetching user info during periodic check:", error);
      });
  }, 5000); // Check every 5 seconds
