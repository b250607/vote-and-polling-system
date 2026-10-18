/* ===============================
   STATE & ELEMENTS
================================ */

let currentUser = null;
let isAdmin = false;

const registerPage = document.getElementById("registerPage");
const loginPage    = document.getElementById("loginPage");
const votingPage   = document.getElementById("votingPage");
const loggedUser   = document.getElementById("loggedUser");


/* ===============================
   API HELPER (talks to server + database)
================================ */

async function api(method, url, body) {

    const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
    });

    let data = {};

    try {
        data = await res.json();
    } catch (e) {}

    if (!res.ok) {
        const err = new Error(data.error || "Something went wrong.");
        err.status = res.status;
        throw err;
    }

    return data;
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
    document.getElementById("adminBadge").classList.toggle("hidden", !isAdmin);
    document.getElementById("adminPanel").classList.toggle("hidden", !isAdmin);
    loadPolls();
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

(async function init() {

    try {
        const me = await api("GET", "/api/me");
        currentUser = me.username;
        isAdmin = me.role === "admin";
        showVotingPage();
    } catch (e) {
        showRegisterPage();
    }

})();


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

        try {

            await api("POST", "/api/register", { username, password });

            document.getElementById("registerForm").reset();

            showLoginPage("Registration successful! Please login.");

            document.getElementById("username").value = username;
            document.getElementById("password").focus();

        } catch (e) {

            error.textContent = e.message;

        }

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

        try {

            const data = await api("POST", "/api/login", { username, password });

            currentUser = data.username;
            isAdmin = data.role === "admin";

            loginError.textContent = "";
            document.getElementById("loginForm").reset();

            showVotingPage();

        } catch (e) {

            loginError.textContent = e.message;

        }

    });


/* ===============================
   LOGOUT
================================ */

async function logout() {

    try {
        await api("POST", "/api/logout");
    } catch (e) {}

    currentUser = null;
    isAdmin = false;

    showLoginPage("You have been logged out.");

}


/* ===============================
   LOAD & SHOW POLLS
================================ */

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function handleApiError(e) {
    if (e.status === 401) {
        currentUser = null;
        isAdmin = false;
        showLoginPage("Session expired. Please login again.");
    } else {
        alert(e.message);
    }
}

async function loadPolls() {

    try {
        renderPolls(await api("GET", "/api/polls"));
    } catch (e) {
        handleApiError(e);
    }

}

function renderPolls(polls) {

    const list = document.getElementById("pollList");
    list.innerHTML = "";

    if (polls.length === 0) {
        list.appendChild(el("div", "empty-state",
            isAdmin ? "No polls yet. Create the first one above!"
                    : "No polls available yet. Please check back soon."));
        return;
    }

    polls.forEach(poll => list.appendChild(buildPollCard(poll)));

}

function buildPollCard(poll) {

    const card = el("div", "poll-card");

    /* head: question + status + admin buttons */

    const head = el("div", "poll-head");
    const titleBox = el("div");
    const title = el("h2", "", poll.question);
    title.appendChild(el("span",
        "badge " + (poll.isOpen ? "badge-open" : "badge-closed"),
        poll.isOpen ? "Open" : "Closed"));
    titleBox.appendChild(title);
    if (poll.description) titleBox.appendChild(el("p", "", poll.description));
    head.appendChild(titleBox);

    if (isAdmin) {
        const actions = el("div", "poll-actions");

        const toggle = el("button", "small-btn", poll.isOpen ? "Close poll" : "Reopen poll");
        toggle.addEventListener("click", () => setPollOpen(poll.id, !poll.isOpen));

        const del = el("button", "small-btn danger", "Delete");
        del.addEventListener("click", () => deletePoll(poll));

        actions.append(toggle, del);
        head.appendChild(actions);
    }

    card.appendChild(head);

    /* voting form (normal users, open poll, not yet voted) */

    const hasVoted = poll.myOptionId !== null;

    if (!isAdmin && poll.isOpen && !hasVoted) {

        const optionList = el("div", "option-list");

        poll.options.forEach(opt => {
            const label = el("label", "option-item");
            const radio = document.createElement("input");
            radio.type = "radio";
            radio.name = "poll-" + poll.id;
            radio.value = opt.id;
            label.append(radio, el("span", "", opt.label));
            optionList.appendChild(label);
        });

        card.appendChild(optionList);

        const submit = el("button", "submit-vote", "🗳️ Submit Vote");
        submit.addEventListener("click", () => {
            const chosen = optionList.querySelector("input:checked");
            if (!chosen) {
                alert("Please select an option first.");
                return;
            }
            submitVote(poll.id, Number(chosen.value));
        });
        card.appendChild(submit);

    } else if (hasVoted) {
        card.appendChild(el("p", "poll-note", "✅ You have already voted in this poll."));
    } else if (isAdmin) {
        card.appendChild(el("p", "poll-note", "Admins manage polls and cannot vote."));
    } else if (!poll.isOpen) {
        card.appendChild(el("p", "poll-note", "This poll is closed. Final results are shown below."));
    }

    /* live results */

    const results = el("div", "results");

    poll.options.forEach(opt => {
        const pct = poll.total === 0 ? 0 : Math.round((opt.votes / poll.total) * 100);

        const row = el("div", "result-row" + (opt.id === poll.myOptionId ? " mine" : ""));
        row.appendChild(el("span", "result-name", opt.label));

        const bar = el("div", "bar");
        const fill = el("div", "bar-fill");
        fill.style.width = pct + "%";
        bar.appendChild(fill);
        row.appendChild(bar);

        row.appendChild(el("span", "vote-number", opt.votes + " (" + pct + "%)"));
        results.appendChild(row);
    });

    results.appendChild(el("p", "poll-note", "Total votes: " + poll.total));
    card.appendChild(results);

    return card;

}


/* ===============================
   SUBMIT VOTE (saved in database)
================================ */

async function submitVote(pollId, optionId) {

    try {

        await api("POST", "/api/polls/" + pollId + "/vote", { optionId });

        document.getElementById("successPopup").classList.remove("hidden");

    } catch (e) {

        if (e.status !== 401) alert(e.message);
        else handleApiError(e);

    }

    loadPolls();

}


/* ===============================
   ADMIN: CREATE / CLOSE / DELETE POLLS
================================ */

const optionFields = document.getElementById("optionFields");

function addOptionField(value) {

    if (optionFields.children.length >= 10) return;

    const row = el("div", "option-field");
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 100;
    input.placeholder = "Option " + (optionFields.children.length + 1);
    input.value = value || "";

    const remove = el("button", "remove-btn", "✕");
    remove.type = "button";
    remove.title = "Remove option";
    remove.addEventListener("click", () => {
        if (optionFields.children.length > 2) row.remove();
    });

    row.append(input, remove);
    optionFields.appendChild(row);

}

function resetCreateForm() {
    document.getElementById("createPollForm").reset();
    optionFields.innerHTML = "";
    addOptionField();
    addOptionField();
}

document.getElementById("addOptionBtn").addEventListener("click", () => addOptionField());

resetCreateForm();

document
    .getElementById("createPollForm")
    .addEventListener("submit", async function(event) {

        event.preventDefault();

        const error   = document.getElementById("createError");
        const success = document.getElementById("createSuccess");
        error.textContent = "";
        success.textContent = "";

        const question    = document.getElementById("pollQuestion").value.trim();
        const description = document.getElementById("pollDescription").value.trim();
        const options = Array.from(optionFields.querySelectorAll("input"))
            .map(i => i.value.trim())
            .filter(Boolean);

        if (question.length < 3) {
            error.textContent = "Please enter a question (at least 3 characters).";
            return;
        }

        if (options.length < 2) {
            error.textContent = "Please enter at least 2 options.";
            return;
        }

        try {

            await api("POST", "/api/polls", { question, description, options });

            resetCreateForm();
            success.textContent = "Poll created successfully!";
            loadPolls();

        } catch (e) {

            error.textContent = e.message;

        }

    });

async function setPollOpen(id, isOpen) {

    try {
        await api("PATCH", "/api/polls/" + id, { isOpen });
        loadPolls();
    } catch (e) {
        handleApiError(e);
    }

}

async function deletePoll(poll) {

    if (!confirm('Delete the poll "' + poll.question + '" and all its votes?')) return;

    try {
        await api("DELETE", "/api/polls/" + poll.id);
        loadPolls();
    } catch (e) {
        handleApiError(e);
    }

}


/* ===============================
   CLOSE POPUP
================================ */

function closePopup() {

    document
        .getElementById("successPopup")
        .classList.add("hidden");

}
