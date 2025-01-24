document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM content loaded"); // Check if the script runs

    const reportBody = document.getElementById('reportBody');

    try {
        const userResponse = await fetch('/api/user-info');
        if (!userResponse.ok) {
            throw new Error('Failed to fetch user info');
        }

        const userData = await userResponse.json();
        const user = userData.user;
        const usernameSpan = document.getElementById("username");

        if (user && usernameSpan) {
            usernameSpan.textContent = `${user.firstname} ${user.lastname}`;
        }

        const response = await fetch(`/api/getPersonalReport?user_id=${user.id}`);

        if (!response.ok) {
            throw new Error('Failed to fetch reports');
        }

        const data = await response.json();
        const reports = data.reports.filter(report => report.user_id === user.id);

        if (reports.length === 0) {
            reportBody.innerHTML = '<tr><td colspan="8">Result is not uploaded yet</td></tr>';
            return;
        }

        reportBody.innerHTML = reports.map(report => `
            <tr>
              <td>${report.firstname}</td>
              <td>${report.lastname}</td>
              <td>${report.subject}</td>
                <td>${report.total_marks}</td>
                <td>${report.obtained_marks}</td>
                <td>${report.remarks}</td>
                <td>${report.grade}</td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error fetching reports:', error);
        reportBody.innerHTML = '<tr><td colspan="8">Error loading reports</td></tr>';
    }

    // Check if the logout button exists in the DOM
   

    
});
// Adding a log to check if the button is properly clicked
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
