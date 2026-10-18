-- =====================================================
--  Vote & Polling System - database schema
--  Import this file in phpMyAdmin (Import tab).
-- =====================================================

CREATE DATABASE IF NOT EXISTS vote_poll
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE vote_poll;

SET NAMES utf8mb4;

-- Users (passwords are stored as PHP password_hash() hashes)
CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    username      VARCHAR(30)  NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_username (username)   -- case-insensitive via collation
) ENGINE=InnoDB;

-- Polls (user_id is NULL for the built-in default poll)
CREATE TABLE IF NOT EXISTS polls (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id    INT UNSIGNED NULL,
    question   VARCHAR(140) NOT NULL,
    icon       VARCHAR(16)  NOT NULL DEFAULT '🗳️',
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_polls_user (user_id),
    CONSTRAINT fk_polls_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Options belonging to a poll
CREATE TABLE IF NOT EXISTS poll_options (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    poll_id     INT UNSIGNED NOT NULL,
    text        VARCHAR(80)  NOT NULL,
    description VARCHAR(120) NOT NULL DEFAULT '',
    position    TINYINT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_options_poll (poll_id),
    CONSTRAINT fk_options_poll FOREIGN KEY (poll_id)
        REFERENCES polls (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- One row per vote. UNIQUE (poll_id, user_id) = one vote per user per poll,
-- enforced by the database itself.
CREATE TABLE IF NOT EXISTS votes (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    poll_id    INT UNSIGNED NOT NULL,
    option_id  INT UNSIGNED NOT NULL,
    user_id    INT UNSIGNED NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_votes_poll_user (poll_id, user_id),
    KEY idx_votes_option (option_id),
    CONSTRAINT fk_votes_poll   FOREIGN KEY (poll_id)   REFERENCES polls (id)        ON DELETE CASCADE,
    CONSTRAINT fk_votes_option FOREIGN KEY (option_id) REFERENCES poll_options (id) ON DELETE CASCADE,
    CONSTRAINT fk_votes_user   FOREIGN KEY (user_id)   REFERENCES users (id)        ON DELETE CASCADE
) ENGINE=InnoDB;

-- Default poll (the original EV scooter poll)
INSERT INTO polls (id, user_id, question, icon)
VALUES (1, NULL, 'Which is the Best EV Scooter?', '🛵');

INSERT INTO poll_options (poll_id, text, description, position) VALUES
    (1, 'Bajaj Chetak', 'Premium Electric Scooter',     1),
    (1, 'TVS iQube',    'Smart Electric Scooter',       2),
    (1, 'Ather',        'Performance Electric Scooter', 3),
    (1, 'Ola Electric', 'Modern Electric Scooter',      4);

-- Default poll #2
INSERT INTO polls (user_id, question, icon)
VALUES (NULL, 'Which programming language is best for beginners?', '💻');
SET @p2 = LAST_INSERT_ID();
INSERT INTO poll_options (poll_id, text, description, position) VALUES
    (@p2, 'Python',     'Simple, readable syntax',        1),
    (@p2, 'JavaScript', 'Runs in every web browser',      2),
    (@p2, 'Java',       'Strongly typed and widely used', 3),
    (@p2, 'C++',        'Fast and close to the hardware', 4);

-- Default poll #3
INSERT INTO polls (user_id, question, icon)
VALUES (NULL, 'What is your favorite cuisine?', '🍽️');
SET @p3 = LAST_INSERT_ID();
INSERT INTO poll_options (poll_id, text, description, position) VALUES
    (@p3, 'Indian',  'Rich spices and curries',    1),
    (@p3, 'Italian', 'Pizza, pasta and more',      2),
    (@p3, 'Chinese', 'Noodles, rice and stir-fry', 3),
    (@p3, 'Mexican', 'Tacos, burritos and salsa',  4);
