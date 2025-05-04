const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const users = {};          // In-memory user:password store
const sockets = {};        // Map of username to WebSocket

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true,
}));
app.use(express.static(path.join(__dirname, "public"))); // Serve static files

// 🔐 Protect chat.html
app.get("/chat.html", (req, res, next) => {
    if (!req.session.username) {
        return res.redirect("/login.html");
    }
    next();
});

// Routes
app.post("/signup", (req, res) => {
    const { username, password } = req.body;
    if (users[username]) {
        return res.send("User already exists. <a href='signup.html'>Try again</a>");
    }
    users[username] = password;
    res.redirect("/login.html");
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;
    if (users[username] && users[username] === password) {
        req.session.username = username;
        return res.redirect("/chat.html");
    }
    res.send("Invalid credentials. <a href='login.html'>Try again</a>");
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login.html");
    });
});

app.get("/user", (req, res) => {
    if (req.session.username) {
        res.json({ username: req.session.username });
    } else {
        res.status(401).send("Unauthorized");
    }
});

// WebSocket
wss.on("connection", (ws) => {
    ws.on("message", (message) => {
        const data = JSON.parse(message);

        if (data.type === "init") {
            sockets[data.username] = ws;
        } else if (data.type === "chat") {
            const target = sockets[data.to];
            if (target) {
                target.send(JSON.stringify({
                    from: data.from,
                    message: data.message
                }));
            }
        }
    });
});

// Start server
server.listen(3002, () => {
    console.log("Server started on http://localhost:3002");
  });
  
app.get('/', (req, res) => {
    res.redirect('/login.html');
  });
  

