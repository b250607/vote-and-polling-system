# Vote & Polling System (PHP + MySQL)

Users register, log in, create polls and vote. Everything is stored in MySQL.

## Setup (XAMPP / WAMP / MAMP)

1. **Start Apache and MySQL** from the XAMPP control panel.
2. **Copy this folder** into your web root:
   - XAMPP: `C:\xampp\htdocs\vote-and-polling-system-main`
   - WAMP: `C:\wamp64\www\vote-and-polling-system-main`
   - MAMP: `/Applications/MAMP/htdocs/vote-and-polling-system-main`
3. **Create the database** in phpMyAdmin (http://localhost/phpmyadmin):
   - Click the **Import** tab, choose `database.sql`, click **Import**.
   - This creates the `vote_poll` database, its tables and the default EV scooter poll.
4. **Check `api/config.php`.** The defaults (user `root`, empty password) match a fresh XAMPP.
   If you set a MySQL password, put it in `DB_PASS`.
5. **Open** http://localhost/vote-and-polling-system-main/

> Don't open `index.html` by double-clicking it (file://). The PHP code only runs when the
> page is served by Apache.

## Poll picker

After login you see a grid of all polls. Click one to vote in it (or view results if you already
voted), then use **← All polls** to go back. The database comes with 3 default polls. If you
imported an older `database.sql`, run `add_default_polls.sql` once to add the 2 new ones.

## Database

| Table          | Purpose                                                   |
| -------------- | --------------------------------------------------------- |
| `users`        | accounts; passwords stored as `password_hash()` hashes    |
| `polls`        | one row per poll (`user_id` = creator, NULL for default)  |
| `poll_options` | the choices of each poll                                  |
| `votes`        | one row per vote; `UNIQUE (poll_id, user_id)` = 1 vote per user per poll |

Deleting a poll also deletes its options and votes (`ON DELETE CASCADE`).

## API (`/api`)

| File               | Method | Purpose                       |
| ------------------ | ------ | ----------------------------- |
| `register.php`     | POST   | create account                |
| `login.php`        | POST   | log in (PHP session)          |
| `logout.php`       | POST   | log out                       |
| `me.php`           | GET    | current logged-in user        |
| `polls.php`        | GET    | all polls + results + my vote |
| `create_poll.php`  | POST   | create a poll                 |
| `vote.php`         | POST   | vote in a poll                |
| `delete_poll.php`  | POST   | delete your own poll          |

## Troubleshooting

- **"Database connection failed"**: MySQL isn't running, or `api/config.php` has the wrong
  credentials, or `database.sql` wasn't imported.
- **"Unexpected server response"**: you're not on `http://localhost/...`; PHP isn't running.
- **Login works then immediately logs out**: make sure cookies are enabled for localhost.
