# 🚀 Z-Coder

Z-Coder is a full-stack platform I built to help developers and competitive programmers seamlessly track, sync, and execute their coding problems in one place. 
It includes a custom Chrome Extension that syncs your current problem directly to a cloud database, and a web dashboard to manage and compile your code.

**🔗 Live Demo:** [https://z-coder-ten.vercel.app](https://z-coder-ten.vercel.app)

---

## ✨ Features
* **Chrome Extension Sync:** Instantly bookmark coding problems from any website straight to your dashboard.
* **Isolated Code Execution:** Run C++ and Python code directly in the browser. Powered by the Wandbox API to safely compile and execute standard input/output.
* **Secure Authentication:** JWT-based user login and registration system with encrypted passwords.
* **Cloud Database:** Persistent storage for users and bookmarked problems using PostgreSQL.

## 🛠️ Tech Stack
* **Frontend:** React, Vite, Tailwind CSS
* **Backend:** Node.js, Express.js
* **Database:** PostgreSQL (hosted on Railway)
* **Extension:** Native Chrome Extension APIs (Manifest V3)
* **Deployment:** Vercel (Client) & Railway (API)

---

## 💻 Local Setup
If you want to run this project locally on your own machine, follow these steps:

### 1. Clone the repository
```bash
git clone [https://github.com/YOUR_USERNAME/Z-Coder.git](https://github.com/YOUR_USERNAME/Z-Coder.git)
cd Z-Coder
```

### 2. Set up the Backend
```bash
cd backend
npm install

# Create a .env file in the backend folder and add your database credentials:
# DB_USER, DB_PASSWORD, DB_HOST, DB_NAME, DB_PORT, and JWT_SECRET

node server.js
```

### 3. Set up the Frontend
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```

### 4. Load the Chrome Extension
1. Open Chrome and navigate to `chrome://extensions/`.
2. Toggle **Developer mode** on (top right).
3. Click **Load unpacked** and select the extension folder from this repository.
