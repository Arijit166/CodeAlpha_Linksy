# 🌐 Linksy

**Linksy** is a social media web application where users can:  
✨ Create posts  
❤️ Like and comment on posts  
👥 Follow and unfollow other users  
🤝 Get follow suggestions based on following patterns  
🙍 Manage their profile  
🔑 Sign up and sign in securely  

Built with **Node.js (Express)** 🖥️, **MongoDB (Mongoose)** 🍃, and **HTML, CSS, EJS, JavaScript** 🎨.

---

## 🚀 Features

- 🔐 **Authentication**: Sign up, sign in, session middleware  
- 📝 **Posts**: Create, read, like, and comment  
- 🤝 **Follow System**: Follow/unfollow + personalized suggestions  
- 🙍 **Profiles**: User profile & view others’ profiles  
- 🖼️ **Views**: Clean EJS templates + partials  
- ⚠️ **Errors**: Custom error page  

---

## 🛠️ Tech Stack

- 🎨 **Frontend**: HTML, CSS, JavaScript, EJS  
- 🖥️ **Backend**: Node.js, Express  
- 🍃 **Database**: MongoDB (Mongoose)  
- 🖼️ **Templating**: EJS  
- 🔐 **Auth**: Custom middleware  

---

## 📂 Folder Structure
```
Linksy/
│── middleware/
│ └── auth.js
│
│── models/
│ ├── post.js
│ └── user.js
│
│── partials/
│ └── nav.ejs
│
│── routes/
│ ├── auth.js
│ ├── home.js
│ ├── posts.js
│ ├── profile.js
│ └── users.js
│
│── utils/
│ └── helpers.js
│
│── views/
│ ├── create-post.ejs
│ ├── error.ejs
│ ├── index.ejs
│ ├── profile.ejs
│ ├── signIn.ejs
│ └── user-profile.ejs
│
│── .env
│── .gitignore
│── app.js
│── LICENSE
│── package.json
│── package-lock.json
│── README.md
```
---

## 🔑 Environment Variables

Create a `.env` file at the project root with:

```
DATABASE_URL=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
```
#### ⚠️ Note: No backticks or quotes — just KEY=value on each line.
---

## 🏃 Getting Started

Clone the repo 📥

```
git clone https://github.com/Arijit166/CodeAlpha_Linksy
cd CodeAlpha_Linksy
```
### Install dependencies 📦

```
npm install
```
 Configure environment ⚙️

 Create .env file and add DATABASE_URL.

### Run the server ▶️

```
npm start
```
## App will run at 👉 http://localhost:3000
## 🌍Live Deployment: https://codealpha-linksy.onrender.com

### 📜 Scripts

```
▶️ npm start — start the server

🔄 npm run dev — start with nodemon (development mode)
```
---
## 📄 License

Licensed under the MIT License ✅.

---
## 🤝 Contributing

Contributions are always welcome!
💡 Fork the repo → 🌱 Create a branch → 🛠️ Make changes → 🔁 Submit a PR

---
## Let’s build Linksy together! 🚀
