-- schema.sql – Full schema for Taskify Student Task Manager
-- Run this once in MySQL to set up or migrate the database.

CREATE DATABASE IF NOT EXISTS task_manager;
USE task_manager;

CREATE TABLE IF NOT EXISTS tasks (
  task_id     INT           NOT NULL AUTO_INCREMENT,
  title       VARCHAR(255)  NOT NULL,
  description TEXT,
  due_date    DATE,
  status      ENUM('pending','in-progress','completed') NOT NULL DEFAULT 'pending',
  project     VARCHAR(100)  NOT NULL DEFAULT 'General',
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (task_id)
);

-- If upgrading an existing DB, run this once to add the project column:
-- ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project VARCHAR(100) NOT NULL DEFAULT 'General';

-- Seed data
INSERT INTO tasks (title, description, due_date, status, project) VALUES
  ('Database Design Assignment', 'Create ER diagrams and normalize tables up to 3NF for the library management system.', '2026-04-29', 'pending',     'Computer Science'),
  ('Physics Lab Report',         'Write the conclusion and format the data tables for the pendulum experiment.',          '2026-04-30', 'in-progress', 'Physics'),
  ('Calculus Problem Set 4',     'Complete integration by parts exercises 1-20 from Chapter 7.',                         '2026-04-27', 'completed',   'Mathematics'),
  ('Group Presentation Slides',  'Draft the remaining 5 slides for the marketing strategy presentation.',                 '2026-04-28', 'in-progress', 'Business'),
  ('Read "The Great Gatsby" Ch. 1-3', 'Read the assigned chapters and write a 300-word reflection on the main themes.',  '2026-04-21', 'pending',     'English Literature');
