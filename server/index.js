const express = require('express');
const session = require('express-session');
require('dotenv').config();
const authRoutes = require('./routes/auth');

const app = express();

// automatically parse incoming request bodies as json
app.use(express.json());
// everything in 'public' folder is static. this means that when someone goes to my app in the browser, that's where it looks for my html, css, and frontend js
app.use(express.static('public'));
// sets up user sessions so the app remembers who's logged in
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false, // don't resave the session if nothing is changed
    saveUninitialized: false, // don't create a session until someone actually logs in
    cooki0e: { secure: false } // cookies work over regualar http
}));

app.use('/api/auth', authRoutes);

// if there's a port i say, use it. else use 3000. 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})
