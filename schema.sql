-- ============================================================
-- schema.sql – Database setup for Student Task Manager
-- Run this in MySQL before starting the Node server.
-- ============================================================

-- 1. Create (or switch to) the database
CREATE DATABASE IF NOT EXISTS task_manager;
USE task_manager;

-- 2. Create the tasks table
CREATE TABLE IF NOT EXISTS tasks (
  task_id     INT           NOT NULL AUTO_INCREMENT,
  title       VARCHAR(255)  NOT NULL,
  description TEXT,
  due_date    DATE,
  status      ENUM('pending', 'in-progress', 'completed') NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (task_id)
);

-- 3. (Optional) seed a few sample tasks so the UI isn't empty on first run
INSERT INTO tasks (title, description, due_date, status) VALUES
  ('Math Assignment #3',    'Chapter 7 problems 1-20',      '2026-04-25', 'pending'),
  ('History Essay',         'Write 5-page essay on WW2',    '2026-04-28', 'in-progress'),
  ('Physics Lab Report',    'Summarize pendulum experiment', '2026-04-22', 'pending'),
  ('Group Project Slides',  'CS 201 final presentation',    '2026-04-29', 'in-progress'),
  ('Biology Reading',       'Chapters 12-14',               '2026-04-21', 'completed');
