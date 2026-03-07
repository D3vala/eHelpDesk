const loggedInAdmin = {
  firstName: "Ven",
  lastName: "Pascual",
};

function updateAdminProfile() {
  const welcomeElement = document.getElementById("welcome-message");
  welcomeElement.textContent = `Welcome back, ${loggedInAdmin.firstName}.`;

  const avatarElement = document.getElementById("user-avatar");
  const initials = (
    loggedInAdmin.firstName.charAt(0) + loggedInAdmin.lastName.charAt(0)
  ).toUpperCase();
  avatarElement.textContent = initials;
}

function setupWorkloadFilter() {
  const filterDropdown = document.getElementById("level-filter");
  const workloadRows = document.querySelectorAll(".workload-row");
  const emptyStateRow = document.getElementById("empty-state-row");

  filterDropdown.addEventListener("change", function (e) {
    const selectedLevel = e.target.value;
    let visibleCount = 0;

    workloadRows.forEach((row) => {
      if (selectedLevel === "all") {
        row.style.display = "";
        visibleCount++;
      } else {
        if (row.getAttribute("data-level") === selectedLevel) {
          row.style.display = "";
          visibleCount++;
        } else {
          row.style.display = "none";
        }
      }
    });

    if (visibleCount === 0) {
      emptyStateRow.style.display = "table-row";
    } else {
      emptyStateRow.style.display = "none";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  updateAdminProfile();
  setupWorkloadFilter();
});

const savedStaff = localStorage.getItem("eHelpDesk_staffData");
if (savedStaff) {
  const staffData = JSON.parse(savedStaff);
  // Loop through staffData to render your staff workload UI dynamically
}