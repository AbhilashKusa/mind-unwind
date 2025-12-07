# MindUnwind Project Manual

## What is MindUnwind?
**MindUnwind** is a task organization tool designed to help you dump your thoughts and organize them effectively. It uses AI (Gemini 3.0 Pro) to intelligently process your commands and manage your tasks.

## Project Structure
The project is divided into two main parts:
1.  **Client (`client/`)**: The visible part of the app (the website). Built with React and Vite. 
    *   Files are now located in `client/src/`.
2.  **Server (`server/`)**: The brain of the app. Built with Node.js and Express. It connects to the database.
3.  **Database**: Uses PostgreSQL to store your tasks and users.

## How to Run

### Option 1: The Easy Way (Docker)
If you have Docker installed, you can run the whole app with one command:
1.  Open your terminal in this folder (`d:\mind-unwind`).
2.  Run: `docker-compose up --build`
3.  Open `http://localhost:3000` in your browser.

### Option 2: The Manual Way (Development)
If you want to edit code, run it manually:

**1. Database**
Ensure you have PostgreSQL running locally with:
- User: `postgres`
- Password: `root`
- Database: `mindUnwind`

**2. Server**
```bash
cd server
npm install
npm start
```
(Runs on port 3001)

**3. Client**
```bash
cd client
npm install
npm run dev
```
(Runs on port 3000)

## Running Tests
To check if everything is working correctly:
- **Server Tests**: `cd server` then `npm test`
- **Client Tests**: `cd client` then `npm test`

## Troubleshooting
- **"Connection Error"**: Make sure the server is running on port 3001.
- **Port Conflicts**: If ports 3000 or 3001 are busy, close other apps or use the Docker setup which manages this.
