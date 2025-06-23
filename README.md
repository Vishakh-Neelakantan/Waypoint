# 🧭 Waypoint

Smart Route Generator – Roundtrip routes for walking, jogging, or cycling.

A full-stack geospatial planner that creates optimized round-trip paths based on your current location, travel mode, and desired distance. Designed to help fitness enthusiasts and urban explorers easily plan efficient and scenic routes.

---
## 🔍 Why name Waypoint?

A Waypoint is a stopping point on a journey. This project helps generate such waypoints to create routes that are goal-oriented, fitness-aware, and always lead back to your starting point.

---

## 🚀 Features

📍 Geolocation-Aware: Instantly fetches user’s location via browser or allows manual input.

🛣️ Route Generation: Computes circular routes based on preferred distance and transport mode.

🧭 Multi-Mode Support: Choose between walking, jogging, or cycling.

🗺️ Dynamic Map Rendering: Visualize routes with interactive map markers and paths.

⚡ Fast & Responsive UI: Built with performance and accessibility in mind.

☁️ Fully Deployed: Backend on Railway, Frontend on Vercel.

---

## 🛠️ Tech Stack

| Layer     | Tech Used                            |
|-----------|--------------------------------------|
| Frontend  | Next.js + Tailwind CSS + Lucide Icons|
| Backend   | FastAPI (Python) + Geopy + OSRM      |
| API Communication | RESTful API (JSON)           |

---

## 🔧 Installation & Setup

1️⃣ Clone the repository

`git clone https://github.com/Vishakh-Neelakantan/Waypoint.git`

2️⃣ Backend Setup (FastAPI)

`cd backend`
`pip install -r requirements.txt`
`uvicorn main:app --reload`


3️⃣ Frontend Setup (Next.js)

`cd ../frontend`
`npm install`
`npm run dev`

🗺️ Route Example
Route generated for 3km walking in Central Park, New York.

---

## 📸🔹 UI
![Screenshot 2025-06-23 170714](https://github.com/user-attachments/assets/e019de92-17d8-4a37-a056-012a9c7f6ed6)

---

## 📈 Future Scope
✅ Elevation data and terrain awareness

✅ Dark/light theme toggle

🔁 Route customization via POIs (parks, lakes)

🔄 Route reshuffling with AI optimization

☁️ Real-time weather overlay

🌍 Language localization

---

## 📄 License
This project is licensed under the MIT License.

---

## 🧑‍💻 Author
Vishakh Neelakantan

Final-year B.Tech CSE student | Aspiring Software Developer



