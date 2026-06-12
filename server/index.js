const express = require('express');
const session = require('express-session');
require('dotenv').config();


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
    cookie: { secure: false } // cookies work over regualar http
}));

// routes!
const bookRoutes = require('./routes/books');
app.use('/api/books', bookRoutes);
const authorRoutes = require('./routes/authors');
app.use('/api/authors', authorRoutes);
const genreRoutes = require('./routes/genres');
app.use('/api/genres', genreRoutes);
const tagRoutes = require('./routes/tags');
app.use('/api/tags', tagRoutes);
const userBookRoutes = require('./routes/user_books');
app.use('/api/user_books', userBookRoutes);
const requestRoutes = require('./routes/requests');
app.use('/api/requests', requestRoutes);const seriesRoutes = require('./routes/series');
app.use('/api/series', seriesRoutes);

// if there's a port i say, use it. else use 3000. 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})
