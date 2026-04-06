# CodeGPT - AI-Powered Web Application

A full-stack, stateless "CodeGPT" AI web application with a modern, glassmorphism UI.

## Features
- **Modern User Interface**: Dark theme with glassmorphism effects, smooth animations, and a developer-focused design.
- **Stateless Architecture**: No database required. Fully sessionless.
- **Node/Express Backend**: Securely proxy interactions with the Google Gemini API.
- **Dual Mode AI Generation**: 
  - *Generate Code*: Instantly outputs clean structure code snippets based on prompts.
  - *Solve Problem*: Explain code step-by-step and provide detailed solutions.
- **Robust Output UI**: Features syntax highlighting (VSCode Dark theme fallback), Markdown rendering, "Copy to Clipboard", and "Download to File".

## Tech Stack
- Frontend: React (Vite), Tailwind CSS v4, Axios, React Syntax Highlighter, Lucide React
- Backend: Node.js, Express.js, @google/genai (Gemini AI SDK), dotenv

## Project Structure
```
/client   -> React frontend
/server   -> Node.js + Express backend
```

## Setup Instructions

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### 2. Backend Setup
1. Navigate to the server folder: `cd server`
2. Install dependencies: `npm install`
3. Create a `.env` file in the `/server` directory and add your Google Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   PORT=5000
   ```
4. Start the backend server:
   ```bash
   node server.js
   ```

### 3. Frontend Setup
1. Navigate to the client folder (in a new terminal): `cd client`
2. Install dependencies: `npm install`
3. Start the development server:
   ```bash
   npm run dev
   ```

Once both servers are running, open the URL provided by Vite (usually `http://localhost:5173`) in your browser to interact with the application!
