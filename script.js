/* ===============================
   LOGIN DETAILS
================================ */

const validUsername = "student";
const validPassword = "12345";

let currentUser = localStorage.getItem("currentUser");


/* ===============================
   GET ELEMENTS
================================ */

const loginPage =
    document.getElementById("loginPage");

const votingPage =
    document.getElementById("votingPage");

const loggedUser =
    document.getElementById("loggedUser");


/* ===============================
   CHECK LOGIN ON PAGE LOAD
================================ */

if (currentUser) {
    showVotingPage();
}


/* ===============================
   LOGIN
================================ */

document
    .getElementById("loginForm")
    .addEventListener("submit", function(event) {

        event.preventDefault();


        const username =
            document
                .getElementById("username")
                .value
                .trim();


        const password =
            document
                .getElementById("password")
                .value
                .trim();


        const loginError =
            document.getElementById("loginError");


        if (
            username === validUsername &&
            password === validPassword
        ) {

            localStorage.setItem(
                "currentUser",
                username
            );

            currentUser = username;

            loginError.textContent = "";

            showVotingPage();

        } else {

            loginError.textContent =
                "Invalid username or password!";

        }

    });


/* ===============================
   SHOW VOTING PAGE
================================ */

function showVotingPage() {

    loginPage.classList.add("hidden");

    votingPage.classList.remove("hidden");

    loggedUser.textContent = currentUser;

    updateResults();

}


/* ===============================
   LOGOUT
================================ */

function logout() {

    localStorage.removeItem("currentUser");

    currentUser = null;

    votingPage.classList.add("hidden");

    loginPage.classList.remove("hidden");

    document.getElementById("username").value = "";

    document.getElementById("password").value = "";

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