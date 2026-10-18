/* ===============================
   STATE & ELEMENTS
================================ */

let currentUser = null;

const registerPage = document.getElementById("registerPage");
const loginPage    = document.getElementById("loginPage");
const votingPage   = document.getElementById("votingPage");
const loggedUser   = document.getElementById("loggedUser");


/* ===============================
   API HELPER  (talks to the PHP backend in /api)
   - no body  -> GET
   - with body -> POST (JSON)
================================ */

async function api(path, body) {

    const options = { credentials: "same-origin" };

    if (body !== undefined) {
        options.method  = "POST";
        options.headers = { "Content-Type": "application/json" };
        options.body    = JSON.stringify(body);
    }

    try {
        const res = await fetch("api/" + path, options);

        let data;
        try {
            data = await res.json();
        } catch (e) {
            data = { error: "Unexpected server response. Is the site running through Apache/PHP (http://localhost/...)?" };
        }

        return { ok: res.ok, status: res.status, data: data };

    } catch (e) {
        return { ok: false, status: 0, data: { error: "Cannot reach the server." } };
    }
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
    renderPolls();
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
   (valid server session -> polls, otherwise -> register page)
================================ */

(async function init() {

    const res = await api("me.php");

    if (res.ok && res.data.user) {
        currentUser = res.data.user.username;
        showVotingPage();
    } else {
        showRegisterPage();
        if (!res.ok) {
            document.getElementById("registerError").textContent = res.data.error || "";
        }
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

        const res = await api("register.php", { username: username, password: password });

        if (!res.ok) {
            error.textContent = res.data.error || "Registration failed.";
            return;
        }

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

        const username   = document.getElementById("username").value.trim();
        const password   = document.getElementById("password").value;
        const loginError = document.getElementById("loginError");

        const res = await api("login.php", { username: username, password: password });

        if (!res.ok) {
            loginError.textContent = res.data.error || "Login failed.";
            return;
        }

        currentUser = res.data.username;

        loginError.textContent = "";
        document.getElementById("loginForm").reset();

        showVotingPage();

    });


/* ===============================
   LOGOUT
================================ */

async function logout() {

    await api("logout.php", {});
    currentUser = null;

    showLoginPage("You have been logged out.");

}


/* ===============================
   RENDER POLLS
================================ */

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

async function renderPolls() {

    const list = document.getElementById("pollList");

    const res = await api("polls.php");

    /* Session expired / not logged in */
    if (res.status === 401) {
        currentUser = null;
        showLoginPage("Your session expired. Please login again.");
        return;
    }

    list.innerHTML = "";

    if (!res.ok) {
        const box = el("div", "empty-state");
        box.appendChild(el("h2", "", "Could not load polls"));
        box.appendChild(el("p", "", res.data.error || "Something went wrong."));
        list.appendChild(box);
        return;
    }

    const polls = res.data.polls;

    if (polls.length === 0) {
        const empty = el("div", "empty-state");
        empty.appendChild(el("h2", "", "No polls yet"));
        empty.appendChild(el("p", "", "Click “Create Poll” to start the first one."));
        list.appendChild(empty);
        return;
    }

    polls.forEach(poll => list.appendChild(buildPollCard(poll)));
}

function buildPollCard(poll) {

    const myChoice = poll.my_vote;               /* option id or null */
    const hasVoted = myChoice !== null;
    const total    = poll.total;

    const card = el("section", "poll-card");

    /* ---- title row ---- */
    const titleBox = el("div", "poll-title");
    titleBox.appendChild(el("h2", "", poll.question));

    const meta = poll.created_by ? "Created by " + poll.created_by : "Default poll";
    titleBox.appendChild(el("p", "", meta + " · " + total + (total === 1 ? " vote" : " votes")));

    if (poll.is_owner) {
        const del = el("button", "delete-poll-btn", "🗑 Delete");
        del.type = "button";
        del.addEventListener("click", () => deletePoll(poll.id));
        titleBox.appendChild(del);
    }
    card.appendChild(titleBox);

    /* ---- options ---- */
    const grid = el("div", "candidates");
    const groupName = "poll-" + poll.id;

    poll.options.forEach(opt => {
        const box = el("div", "candidate" + (myChoice === opt.id ? " chosen" : ""));
        box.appendChild(el("div", "scooter-icon", poll.icon || "🗳️"));
        box.appendChild(el("h3", "", opt.text));
        if (opt.desc) box.appendChild(el("p", "", opt.desc));

        const inputId = groupName + "-" + opt.id;
        const input = document.createElement("input");
        input.type = "radio";
        input.name = groupName;
        input.value = opt.id;
        input.id = inputId;
        input.disabled = hasVoted;
        input.checked = myChoice === opt.id;

        const label = el("label", "select-btn", myChoice === opt.id ? "✓ Your vote" : "Vote for " + opt.text);
        label.htmlFor = inputId;

        box.appendChild(input);
        box.appendChild(label);
        grid.appendChild(box);
    });
    card.appendChild(grid);

    /* ---- submit ---- */
    if (hasVoted) {
        card.appendChild(el("p", "voted-note", "You have already voted in this poll."));
    } else {
        const btn = el("button", "submit-vote", "🗳️ Submit Vote");
        btn.type = "button";
        btn.addEventListener("click", () => submitVote(poll.id, btn));
        card.appendChild(btn);
    }

    /* ---- results ---- */
    const results = el("div", "results");
    results.appendChild(el("h2", "", "📊 Live Poll Results"));

    poll.options.forEach(opt => {
        const pct = total === 0 ? 0 : (opt.votes / total) * 100;

        const row = el("div", "result-row");
        row.appendChild(el("span", "result-name", opt.text));

        const bar = el("div", "bar");
        const fill = el("div", "bar-fill");
        fill.style.width = pct + "%";
        bar.appendChild(fill);
        row.appendChild(bar);

        row.appendChild(el("span", "vote-number", String(opt.votes)));
        results.appendChild(row);
    });
    card.appendChild(results);

    return card;
}


/* ===============================
   SUBMIT VOTE
================================ */

async function submitVote(pollId, button) {

    if (!currentUser) {
        alert("Please login before voting.");
        return;
    }

    const selected = document.querySelector('input[name="poll-' + pollId + '"]:checked');

    if (!selected) {
        alert("Please select an option first.");
        return;
    }

    button.disabled = true;

    const res = await api("vote.php", {
        poll_id: pollId,
        option_id: Number(selected.value)
    });

    if (res.status === 401) {
        showLoginPage("Your session expired. Please login again.");
        return;
    }

    if (!res.ok) {
        alert(res.data.error || "Could not record your vote.");
        button.disabled = false;
        /* e.g. "already voted" -> refresh so the card shows the locked state */
        if (res.status === 409) renderPolls();
        return;
    }

    await renderPolls();
    showPopup("Vote Submitted!", "Your vote has been successfully recorded.");
}


/* ===============================
   POPUP
================================ */

function showPopup(title, message) {
    document.getElementById("popupTitle").textContent = title;
    document.getElementById("popupMessage").textContent = message;
    document.getElementById("successPopup").classList.remove("hidden");
}

function closePopup() {
    document.getElementById("successPopup").classList.add("hidden");
}


/* ===============================
   CREATE POLL
================================ */

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;

function addOptionInput(value) {
    const wrap = document.getElementById("optionInputs");
    if (wrap.children.length >= MAX_OPTIONS) return;

    const row = el("div", "option-input-row");

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 80;
    input.placeholder = "Option " + (wrap.children.length + 1);
    input.value = value || "";

    const remove = el("button", "remove-option-btn", "✕");
    remove.type = "button";
    remove.title = "Remove option";
    remove.addEventListener("click", () => {
        if (wrap.children.length <= MIN_OPTIONS) return;
        row.remove();
        refreshOptionControls();
    });

    row.appendChild(input);
    row.appendChild(remove);
    wrap.appendChild(row);
    refreshOptionControls();
}

function refreshOptionControls() {
    const wrap = document.getElementById("optionInputs");
    const count = wrap.children.length;

    Array.from(wrap.children).forEach((row, i) => {
        row.querySelector("input").placeholder = "Option " + (i + 1);
        row.querySelector("button").style.visibility = count > MIN_OPTIONS ? "visible" : "hidden";
    });

    document.getElementById("addOptionBtn").classList.toggle("hidden", count >= MAX_OPTIONS);
}

function openCreatePoll() {
    document.getElementById("createPollForm").reset();
    document.getElementById("createPollError").textContent = "";
    document.getElementById("optionInputs").innerHTML = "";
    for (let i = 0; i < MIN_OPTIONS; i++) addOptionInput();
    document.getElementById("createPollModal").classList.remove("hidden");
    document.getElementById("pollQuestion").focus();
}

function closeCreatePoll() {
    document.getElementById("createPollModal").classList.add("hidden");
}

document.getElementById("createPollForm").addEventListener("submit", async function(event) {

    event.preventDefault();

    const error = document.getElementById("createPollError");
    const submitBtn = this.querySelector('button[type="submit"]');
    const question = document.getElementById("pollQuestion").value.trim();

    const texts = Array.from(document.querySelectorAll("#optionInputs input"))
        .map(i => i.value.trim())
        .filter(t => t.length > 0);

    if (question.length < 3) {
        error.textContent = "Please enter a question (at least 3 characters).";
        return;
    }

    if (texts.length < MIN_OPTIONS) {
        error.textContent = "Please provide at least " + MIN_OPTIONS + " options.";
        return;
    }

    const lowered = texts.map(t => t.toLowerCase());
    if (new Set(lowered).size !== lowered.length) {
        error.textContent = "Options must be different from each other.";
        return;
    }

    submitBtn.disabled = true;
    const res = await api("create_poll.php", { question: question, options: texts });
    submitBtn.disabled = false;

    if (res.status === 401) {
        closeCreatePoll();
        showLoginPage("Your session expired. Please login again.");
        return;
    }

    if (!res.ok) {
        error.textContent = res.data.error || "Could not create the poll.";
        return;
    }

    closeCreatePoll();
    await renderPolls();
    showPopup("Poll Created!", "Your poll is now live. Share it with others!");
});


/* ===============================
   DELETE POLL (creator only)
================================ */

async function deletePoll(pollId) {

    if (!confirm("Delete this poll and all its votes?")) return;

    const res = await api("delete_poll.php", { poll_id: pollId });

    if (!res.ok) {
        alert(res.data.error || "Could not delete the poll.");
    }

    renderPolls();
}
