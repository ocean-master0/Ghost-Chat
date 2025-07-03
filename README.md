<!-- ──────────────────────────────────────────────────────────────── -->
<!--  👻  G H O S T   C H A T – README                               -->
<!-- ──────────────────────────────────────────────────────────────── -->

<p align="center">
  <img src="https://img.shields.io/badge/Ghost%20Chat-%F0%9F%91%BB%20Anonymous%20Messenger-893AB4?style=for-the-badge&logo=ghost&logoColor=white"/>
  <br>
  <img src="https://img.shields.io/badge/Version-1.0.0-0095f6?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Python-3.10%2B-3776ab?style=for-the-badge&logo=python&logoColor=white"/>
  <img src="https://img.shields.io/badge/Flask-SocketIO-5.x-cc0000?style=for-the-badge&logo=python&logoColor=white"/>
  <img src="https://img.shields.io/badge/License-Ghost Safe License-1.0-ff3040?style=for-the-badge"/>
</p>

> ***Ghost Chat*** is an **anonymous, end-to-end volatile** chat platform.  
> Messages & images evaporate after 60 seconds.  
> No database, no traces, pure 🕳️-in-memory spirits.

---

## 🌟 Features

| 🔥 | Feature | Description |
|----|---------|-------------|
| 💬 | **Group Chat** | Invite-code protected rooms (admin approval optional) |
| 🔒 | **Private 1-on-1** | Two-person ephemeral tunnel |
| ⏳ | **Self-Destruct** | Every message / image auto-deletes in **60 s** |
| 📸 | **Image Share**  | Up-to-50 MB, preview before send, same TTL |
| 👻 | **Ghost UI**     | Dark Instagram-style bubbles + floating ghosts |
| 🛡️ | **Privacy Wall** | Screenshot/key-combo blockers; no server logging |

---

## 🚀 Tech Stack

Python · Flask · Flask-SocketIO · Eventlet
HTML5 · CSS3 · JavaScript (ES6)
NoSQL? None-at-all – fully in-memory


---

## ▶️ Quick Start
```
git clone https://github.com/ocean-master0/Ghost-Chat.git
cd ghost_chat
python -m venv venv && source venv/bin/activate # (win: venv\Scripts\activate)
pip install -r requirements.txt
python app.py
```

Open **http://127.0.0.1:5000** in your browser (dark-mode recommended 🌙).

---

## 🖼️ Screenshots

![Screenshot 1](https://github.com/ocean-master0/Ghost-Chat/blob/main/Screenshots/Screenshot%202025-07-03%20182315.png?raw=true)

---

## ⚙️ Configuration

| ENV / CONST | Default | Notes |
|-------------|---------|-------|
| `MAX_CONTENT_LENGTH` | 50 MB | hard-limit for images |
| `AUTO_DELETE_SEC`   | 60    | change in `utils/chat_manager.py` |
| `SECRET_KEY` | Random | regenerate on every boot for extra fog |

---

## 🧩 Project Structure
```
ghost_chat/
├─ app.py # Flask-SocketIO entry-point
├─ utils/chat_manager.py
├─ templates/ # Jinja2 pages
├─ static/
│ ├─ css/style.css # all the ghostly flair
│ └─ js/main.js
└─ README.md - LICENSE
```