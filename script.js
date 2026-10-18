/* ===============================
   STATE & ELEMENTS
================================ */

let currentUser = localStorage.getItem("currentUser");

const registerPage = document.getElementById("registerPage");
const loginPage    = document.getElementById("loginPage");
const votingPage   = document.getElementById("votingPage");
const loggedUser   = document.getElementById("loggedUser");


/* ===============================
   USER STORAGE
================================ */

function getUsers() {
    try {
        return JSON.parse(localStorage.getItem("users")) || {};
    } catch (e) {
        return {};
    }
}

function saveUsers(users) {
    localStorage.setItem("users", JSON.stringify(users));
}

/* Hash password (SHA-256) so it is not stored as plain text */
async function hashPassword(password) {
    if (window.crypto && window.crypto.subtle) {
        const data = new TextEncoder().encode(password);
        const buf = await crypto.subtle.digest("SHA-256", data);
        return Array.from(new Uint8Array(buf))
            .map(b => b.toString(16).padStart(2, "0"))
            .join("");
    }
    /* Fallback if crypto.subtle is unavailable */
    let hash = 5381;
    for (let i = 0; i < password.length; i++) {
        hash = ((hash << 5) + hash) + password.charCodeAt(i);
        hash |= 0;
    }
    return "fb" + hash;
}


/* ===============================
   PAGE SWITCHING
================================ */

function showRegisterPage() {
    registerPage.classList.remove("hidden");
    loginPage.classList.add("hidden");
    votingPage.classList.add("hidden");
    document.getElementById("registerError").textContent = "";
}

function showLoginPage(message) {
    registerPage.classList.add("hidden");
    loginPage.classList.remove("hidden");
    votingPage.classList.add("hidden");
    document.getElementById("loginError").textContent = "";
    document.getElementById("loginSuccess").textContent = message || "";
}

function showVotingPage() {
    registerPage.classList.add("hidden");
    loginPage.classList.add("hidden");
    votingPage.classList.remove("hidden");
    loggedUser.textContent = currentUser;
    updateResults();
}

document.getElementById("goToLogin").addEventListener("click", function(e) {
    e.preventDefault();
    showLoginPage();
});

document.getElementById("goToRegister").addEventListener("click", function(e) {
    e.preventDefault();
    showRegisterPage();
});


/* ===============================
   CHECK LOGIN ON PAGE LOAD
   (not logged in -> register page)
================================ */

const savedUsers = getUsers();

if (currentUser && savedUsers[currentUser]) {
    showVotingPage();
} else {
    localStorage.removeItem("currentUser");
    currentUser = null;
    showRegisterPage();
}


/* ===============================
   REGISTER
================================ */

document
    .getElementById("registerForm")
    .addEventListener("submit", async function(event) {

        event.preventDefault();

        const username = document.getElementById("regUsername").value.trim();
        const password = document.getElementById("regPassword").value;
        const confirm  = document.getElementById("regConfirm").value;
        const error    = document.getElementById("registerError");

        if (username.length < 3) {
            error.textContent = "Username must be at least 3 characters.";
            return;
        }

        if (password.length < 6) {
            error.textContent = "Password must be at least 6 characters.";
            return;
        }

        if (password !== confirm) {
            error.textContent = "Passwords do not match.";
            return;
        }

        const users = getUsers();
        const key = username.toLowerCase();

        if (users[key]) {
            error.textContent = "That username is already taken.";
            return;
        }

        users[key] = {
            username: username,
            password: await hashPassword(password)
        };

        saveUsers(users);

        /* Clear form, go to login page */
        document.getElementById("registerForm").reset();

        showLoginPage("Registration successful! Please login.");

        document.getElementById("username").value = username;
        document.getElementById("password").focus();

    });


/* ===============================
   LOGIN
================================ */

document
    .getElementById("loginForm")
    .addEventListener("submit", async function(event) {

        event.preventDefault();

        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;
        const loginError = document.getElementById("loginError");

        const users = getUsers();
        const user = users[username.toLowerCase()];

        if (user && user.password === await hashPassword(password)) {

            currentUser = user.username;
            localStorage.setItem("currentUser", currentUser);

            loginError.textContent = "";
            document.getElementById("loginForm").reset();

            showVotingPage();

        } else {

            loginError.textContent = "Invalid username or password!";

        }

    });


/* ===============================
   LOGOUT
================================ */

function logout() {

    localStorage.removeItem("currentUser");
    currentUser = null;

    showLoginPage("You have been logged out.");

}


/* ===============================
   GET VOTES
================================ */

function getVotes() {

    return JSON.parse(
        localStorage.getItem("votes")
    ) || {

        "Bajaj Chetak": 0,
        "TVS iQube": 0,
        "Ather": 0,
        "Ola Electric": 0

    };

}


/* ===============================
   SUBMIT VOTE
================================ */

function submitVote() {


    /* Check login */

    if (!currentUser) {

        alert(
            "Please login before voting."
        );

        return;

    }


    /* Get users who already voted */

    const votedUsers =
        JSON.parse(
            localStorage.getItem("votedUsers")
        ) || [];


    /* Prevent duplicate vote */

    if (
        votedUsers.includes(currentUser)
    ) {

        alert(
            "You have already voted!"
        );

        return;

    }


    /* Get selected scooter */

    const selected =
        document.querySelector(
            'input[name="candidate"]:checked'
        );


    /* No scooter selected */

    if (!selected) {

        alert(
            "Please select an EV scooter first."
        );

        return;

    }


    const candidate =
        selected.value;


    /* Get current votes */

    const votes =
        getVotes();


    /* Add vote */

    votes[candidate]++;


    /* Save votes */

    localStorage.setItem(
        "votes",
        JSON.stringify(votes)
    );


    /* Add user to voted list */

    votedUsers.push(currentUser);

    localStorage.setItem(
        "votedUsers",
        JSON.stringify(votedUsers)
    );


    /* Update results */

    updateResults();


    /* Show success popup */

    document
        .getElementById("successPopup")
        .classList.remove("hidden");

}


/* ===============================
   CLOSE POPUP
================================ */

function closePopup() {

    document
        .getElementById("successPopup")
        .classList.add("hidden");

}


/* ===============================
   UPDATE RESULTS
================================ */

function updateResults() {

    const votes = getVotes();


    /* Calculate total */

    const totalVotes =
        votes["Bajaj Chetak"] +
        votes["TVS iQube"] +
        votes["Ather"] +
        votes["Ola Electric"];


    /* Update vote numbers */

    document.getElementById("chetakVotes")
        .textContent =
        votes["Bajaj Chetak"];


    document.getElementById("iqubeVotes")
        .textContent =
        votes["TVS iQube"];


    document.getElementById("atherVotes")
        .textContent =
        votes["Ather"];


    document.getElementById("olaVotes")
        .textContent =
        votes["Ola Electric"];


    /* If there are no votes */

    if (totalVotes === 0) {

        document.getElementById("chetakBar")
            .style.width = "0%";

        document.getElementById("iqubeBar")
            .style.width = "0%";

        document.getElementById("atherBar")
            .style.width = "0%";

        document.getElementById("olaBar")
            .style.width = "0%";

        return;

    }


    /* Calculate percentages */

    const chetakPercentage =
        (votes["Bajaj Chetak"] / totalVotes) * 100;

    const iqubePercentage =
        (votes["TVS iQube"] / totalVotes) * 100;

    const atherPercentage =
        (votes["Ather"] / totalVotes) * 100;

    const olaPercentage =
        (votes["Ola Electric"] / totalVotes) * 100;


    /* Update progress bars */

    document.getElementById("chetakBar")
        .style.width =
        chetakPercentage + "%";


    document.getElementById("iqubeBar")
        .style.width =
        iqubePercentage + "%";


    document.getElementById("atherBar")
        .style.width =
        atherPercentage + "%";


    document.getElementById("olaBar")
        .style.width =
        olaPercentage + "%";

}