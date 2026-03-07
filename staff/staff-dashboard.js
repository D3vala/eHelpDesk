// 1. GLOBAL LOGOUT FUNCTION - Must be outside any blocks
function handleLogout() {
    console.log("Logging out...");
    localStorage.clear(); // This wipes ALL login data at once
    window.location.href = "../login.html"; // Redirect to login page
}

// 2. UI INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    const userInitial = localStorage.getItem("userInitial");
    const userFullName = localStorage.getItem("userFullName");
    const userEmail = localStorage.getItem("userEmail");
    const userRole = localStorage.getItem("userRole");

    const authSection = document.getElementById("auth-section");
    const loginBtn = document.getElementById("login-nav-btn");
    const profileWrapper = document.getElementById("profile-menu-wrapper");

    if (userInitial && authSection) {
        if (loginBtn) loginBtn.style.display = "none";
        if (profileWrapper) {
            profileWrapper.style.display = "block";

            // Inject Initial
            const circle = profileWrapper.querySelector(".user-profile-circle");
            if (!circle) {
                const newCircle = document.createElement("div");
                newCircle.className = "user-profile-circle";
                newCircle.innerText = userInitial;
                newCircle.onclick = (e) => {
                    e.stopPropagation();
                    document
                        .getElementById("dropdown-menu")
                        .classList.toggle("show");
                };
                profileWrapper.prepend(newCircle);
            }

            // Inject Name and Email
            document.getElementById("user-display-name").innerText =
                userFullName || "User";
            document.getElementById("user-display-email").innerText =
                userEmail || "";
        }
    }
});

// Close menu when clicking outside
window.addEventListener("click", () => {
    const menu = document.getElementById("dropdown-menu");
    if (menu) menu.classList.remove("show");
});