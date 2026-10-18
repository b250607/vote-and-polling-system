# Vote & Poll System (with database + admin)

Register -> Login -> Vote. Admins can create and manage polls.
Data is stored in a SQLite database file (`poll.db`).

## Run
Requires Node.js 22.13 or newer (no `npm install` needed).

    npm start

Open http://localhost:3000

## Admin account
Created automatically on first start:

    username: admin
    password: Admin@123

CHANGE THE PASSWORD before putting this online. Either edit the two values
at the top of `server.js`, or start with environment variables:

    ADMIN_USERNAME=boss ADMIN_PASSWORD='MyStrongPass!' npm start

(Windows PowerShell:  $env:ADMIN_PASSWORD='MyStrongPass!'; npm start)

Admin can: create polls (2-10 options), close/reopen polls, delete polls.
Admin cannot vote. Normal users can vote once per poll.

## Tables
- users        (id, username, password_hash, role, created_at)
- polls        (id, question, description, is_open, created_by, created_at)
- poll_options (id, poll_id, label, position)
- votes        (id, poll_id, option_id, user_id, voted_at)  UNIQUE(poll_id, user_id)
- sessions     (token, user_id, expires_at)

Older poll.db files are upgraded automatically; the old scooter votes are kept.

## View / manage data
Open `poll.db` in "DB Browser for SQLite" (free), or run e.g.:
    SELECT p.question, o.label, COUNT(v.id)
    FROM poll_options o JOIN polls p ON p.id=o.poll_id
    LEFT JOIN votes v ON v.option_id=o.id GROUP BY o.id;
