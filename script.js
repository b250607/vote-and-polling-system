/* Vote and Polling System: frontend demo authentication.
   Accounts and votes are stored in this browser's localStorage only.
   Do not use this client-side demo for real or confidential elections. */

const USERS_KEY = "pollUsers";
const VOTES_KEY = "votes";
const VOTED_USERS_KEY = "votedUsers";
let currentUser = localStorage.getItem("currentUser");

const loginPage = document.getElementById("loginPage");
const votingPage = document.getElementById("votingPage");
const loggedUser = document.getElementById("loggedUser");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

function readUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
    catch { return []; }
}

function showLoginForm() {
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    document.getElementById("loginError").textContent = "";
    document.getElementById("registerError").textContent = "";
}
function showRegisterForm() {
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    document.getElementById("loginError").textContent = "";
    document.getElementById("registerError").textContent = "";
}
document.getElementById("showRegister").addEventListener("click", showRegisterForm);
document.getElementById("showLogin").addEventListener("click", showLoginForm);

loginForm.addEventListener("submit", function(event) {
    event.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const error = document.getElementById("loginError");

    // Keep the original demo account available.
    const demoMatch = username === "student" && password === "12345";
    const user = readUsers().find(u =>
        u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );
    if (demoMatch || user) {
        currentUser = demoMatch ? "student" : user.username;
        localStorage.setItem("currentUser", currentUser);
        error.textContent = "";
        showVotingPage();
    } else {
        error.textContent = "Incorrect username or password. Please try again.";
    }
});

registerForm.addEventListener("submit", function(event) {
    event.preventDefault();
    const name = document.getElementById("registerName").value.trim();
    const username = document.getElementById("registerUsername").value.trim();
    const password = document.getElementById("registerPassword").value;
    const confirm = document.getElementById("confirmPassword").value;
    const error = document.getElementById("registerError");

    if (name.length < 2) { error.textContent = "Please enter your full name."; return; }
    if (!/^[a-zA-Z0-9_.-]{3,20}$/.test(username)) {
        error.textContent = "Username must be 3–20 characters (letters, numbers, _, . or -)."; return;
    }
    if (password.length < 6) { error.textContent = "Password must be at least 6 characters."; return; }
    if (password !== confirm) { error.textContent = "Passwords do not match."; return; }

    const users = readUsers();
    if (username.toLowerCase() === "student" ||
        users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        error.textContent = "That username is already registered. Choose another."; return;
    }
    users.push({ name, username, password });
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    registerForm.reset();
    document.getElementById("username").value = username;
    showLoginForm();
    document.getElementById("loginError").textContent = "Account created. Please log in.";
});

function showVotingPage() {
    loginPage.classList.add("hidden");
    votingPage.classList.remove("hidden");
    loggedUser.textContent = currentUser;
    updateResults();
}
function logout() {
    localStorage.removeItem("currentUser");
    currentUser = null;
    votingPage.classList.add("hidden");
    loginPage.classList.remove("hidden");
    loginForm.reset();
    showLoginForm();
}
function getVotes() {
    try {
        return JSON.parse(localStorage.getItem(VOTES_KEY)) || {
            "Bajaj Chetak": 0, "TVS iQube": 0, "Ather": 0, "Ola Electric": 0
        };
    } catch {
        return { "Bajaj Chetak": 0, "TVS iQube": 0, "Ather": 0, "Ola Electric": 0 };
    }
}
function submitVote() {
    if (!currentUser) { alert("Please login before voting."); return; }
    const votedUsers = JSON.parse(localStorage.getItem(VOTED_USERS_KEY)) || [];
    if (votedUsers.includes(currentUser)) { alert("You have already voted!"); return; }
    const selected = document.querySelector('input[name="candidate"]:checked');
    if (!selected) { alert("Please select an EV scooter first."); return; }
    const votes = getVotes();
    votes[selected.value] = (votes[selected.value] || 0) + 1;
    localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
    votedUsers.push(currentUser);
    localStorage.setItem(VOTED_USERS_KEY, JSON.stringify(votedUsers));
    updateResults();
    document.getElementById("successPopup").classList.remove("hidden");
}
function closePopup() {
    document.getElementById("successPopup").classList.add("hidden");
}
function updateResults() {
    const votes = getVotes();
    const candidates = [
        ["Bajaj Chetak", "chetak"], ["TVS iQube", "iqube"],
        ["Ather", "ather"], ["Ola Electric", "ola"]
    ];
    const total = candidates.reduce((sum, [name]) => sum + (Number(votes[name]) || 0), 0);
    candidates.forEach(([name, id]) => {
        const count = Number(votes[name]) || 0;
        document.getElementById(id + "Votes").textContent = count;
        document.getElementById(id + "Bar").style.width =
            (total ? (count / total) * 100 : 0) + "%";
    });
}

/* Theme preference */
function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const button = document.getElementById("themeToggle");
    button.textContent = theme === "dark" ? "☀️ Light mode" : "🌙 Dark mode";
    button.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
}
const savedTheme = localStorage.getItem("pollTheme") || "light";
applyTheme(savedTheme);
document.getElementById("themeToggle").addEventListener("click", function() {
    const nextTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    localStorage.setItem("pollTheme", nextTheme);
    applyTheme(nextTheme);
});

if (currentUser) showVotingPage();
