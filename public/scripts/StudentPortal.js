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


      // Function to fetch unread "exam automation" notifications
// Function to fetch unread "exam automation" notifications
function fetchUnreadExamNotifications(userId) {
  console.log("Checking for unread 'exam automation' notifications for user:", userId);

  fetch(`/notifications/unread-exam-automation?userId=${userId}`) // Adjusted the endpoint for user-specific checks
      .then((response) => response.json())
      .then((notifications) => {
          const examLink = document.querySelector("#exam-link"); // The Exam link
          const redDot = examLink ? examLink.querySelector(".notification-dot") : null;

          if (!examLink) {
              console.error("Exam link not found in the DOM.");
              return;
          }

          // Check if there are unread notifications and show the red dot
          if (notifications.length > 0 && redDot) {
              redDot.style.display = "inline";  // Show the red dot
              console.log("Unread notifications found, red dot displayed.");
          } else if (redDot) {
              redDot.style.display = "none";  // Hide the red dot if no notifications
              console.log("No unread notifications, red dot hidden.");
          }
      })
      .catch((error) => {
          console.error("Error fetching unread notifications:", error);
      });
}

// Function to get the userId and fetch unread notifications
function checkForUnreadNotifications() {
  fetch('/api/user-info')
      .then((response) => response.json())
      .then((data) => {
          if (data.user && data.user.id) {
              fetchUnreadExamNotifications(data.user.id);  // Now correctly passing the userId
          } else {
              console.error("User ID not found in the response.");
          }
      })
      .catch((error) => {
          console.error("Error fetching user info:", error);
      });
}

// ✅ Use Event Listener instead of overwriting window.onload
window.addEventListener("load", checkForUnreadNotifications);



function markExamNotificationsAsRead() {
  fetch('/notifications/mark-read-exam-automation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', // Ensure the content is JSON
    },
    body: JSON.stringify({ type: 'exam automation' }) // Send the type in the body
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        // Hide the red dot after marking notifications as read
        const examLink = document.querySelector("#exam-link");
        const redDot = examLink.querySelector(".notification-dot");
        if (redDot) {
          redDot.style.display = "none"; // Hide the red dot
          console.log("Exam notifications marked as read, red dot hidden.");
        }
      } else {
        console.error("Failed to mark exam notifications as read");
      }
    })
    .catch((error) => {
      console.error("Error marking exam notifications as read:", error);
    });
}

// Call this function when the student clicks on the /std_exam page
document.querySelector("#exam-link").addEventListener("click", function() {
  markExamNotificationsAsRead();
});


// Function to fetch unread "report" notifications for the current user
function fetchUnreadReportNotifications(userId) {
  const notificationType = 'report'; // Specify the type of notification to check

  // Fetch unread notifications for the user
  fetch(`/notifications/unread-report?userId=${userId}&type=${notificationType}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch unread notifications');
      }
      return response.json();
    })
    .then((notifications) => {
      const reportLink = document.querySelector('a[href="/personal_report"]'); // Select the Result link
      const notificationDot = reportLink.querySelector('.notification-dot');

      // Show or hide the red dot based on the notifications count
      if (notifications && notifications.length > 0) {
        notificationDot.style.display = 'inline'; // Show the red dot
        console.log(`Unread '${notificationType}' notifications found for user ${userId}`);
      } else {
        notificationDot.style.display = 'none'; // Hide the red dot
        console.log(`No unread '${notificationType}' notifications for user ${userId}`);
      }
    })
    .catch((error) => {
      console.error('Error fetching unread notifications:', error);
    });
}

// Function to check unread "report" notifications for the logged-in user
function checkUnreadReportNotifications() {
  // Fetch user info to get the logged-in user ID
  fetch('/api/user-info')
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }
      return response.json();
    })
    .then((userData) => {
      const userId = userData.user.id; // Extract the user ID
      fetchUnreadReportNotifications(userId); // Call the function to fetch unread report notifications
    })
    .catch((error) => {
      console.error('Error fetching user info:', error);
    });
}

// Check for unread "report" notifications on page load
window.onload = function () {
  checkUnreadReportNotifications();
};


// Function to mark all "report" notifications as read for the current user
function markReportNotificationsAsRead() {
  // Fetch user info to get the logged-in user ID
  fetch('/api/user-info')
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }
      return response.json();
    })
    .then((userData) => {
      const userId = userData.user.id; // Extract the user ID
      const notificationType = 'report'; // Specify the notification type

      // Send a request to the backend to mark the notifications as read
      fetch('/notifications/mark-read-report', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, type: notificationType }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Failed to mark notifications as read');
          }
          return response.json();
        })
        .then((data) => {
          console.log(data.message); // Log success message
          // Optionally hide the red dot after marking as read
          const reportLink = document.querySelector('a[href="/personal_report"]');
          const notificationDot = reportLink.querySelector('.notification-dot');
          notificationDot.style.display = 'none'; // Hide the red dot
        })
        .catch((error) => {
          console.error('Error marking notifications as read:', error);
        });
    })
    .catch((error) => {
      console.error('Error fetching user info:', error);
    });
}

// Example: Call this function on specific user actions, e.g., clicking the "Result" link
document.querySelector('a[href="/personal_report"]').addEventListener('click', () => {
  markReportNotificationsAsRead(); // Mark "report" notifications as read when the link is clicked
});


      // Initialize animations
      AOS.init();