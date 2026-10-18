-- =====================================================
--  Adds 2 more default polls to an EXISTING database.
--  Use this ONLY if you already imported the tables earlier.
--  phpMyAdmin: click your database -> Import -> this file -> Go
--  Import it once.
-- =====================================================

SET NAMES utf8mb4;

-- Default poll #2
INSERT INTO `polls` (`user_id`, `question`, `icon`)
VALUES (NULL, 'Which programming language is best for beginners?', '💻');
SET @p2 = LAST_INSERT_ID();
INSERT INTO `poll_options` (`poll_id`, `text`, `description`, `position`) VALUES
    (@p2, 'Python',     'Simple, readable syntax',        1),
    (@p2, 'JavaScript', 'Runs in every web browser',      2),
    (@p2, 'Java',       'Strongly typed and widely used', 3),
    (@p2, 'C++',        'Fast and close to the hardware', 4);

-- Default poll #3
INSERT INTO `polls` (`user_id`, `question`, `icon`)
VALUES (NULL, 'What is your favorite cuisine?', '🍽️');
SET @p3 = LAST_INSERT_ID();
INSERT INTO `poll_options` (`poll_id`, `text`, `description`, `position`) VALUES
    (@p3, 'Indian',  'Rich spices and curries',    1),
    (@p3, 'Italian', 'Pizza, pasta and more',      2),
    (@p3, 'Chinese', 'Noodles, rice and stir-fry', 3),
    (@p3, 'Mexican', 'Tacos, burritos and salsa',  4);
