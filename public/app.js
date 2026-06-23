const hamburger = document.querySelector('.hamburger');
const mainNav = document.querySelector('.main-nav');
const tbrBtn = document.querySelector('.tbr-btn');
const app = document.querySelector('#app');

hamburger.addEventListener('click', (e) => {
    mainNav.classList.toggle('open')
});

document.querySelectorAll('.main-nav a').forEach(link => {
    link.addEventListener('click', () => {
        mainNav.classList.remove('open');
    });
});

tbrBtn.addEventListener('click', () => {
    tbrBtn.classList.toggle('active');
});

async function init() {
    const response = await fetch('/api/auth/me');
    if (response.ok) {
        console.log("response.ok")
        renderApp();
    } else {
        renderLogin();
        loginResponse();
    }
}

init()

function renderLogin() {
    app.innerHTML = `
    <div class="login-container">
        <h2>Login</h2>
        <form id="login-form">
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" placeholder="Enter username" required>
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" placeholder="Enter password" required>
            </div>
            <!-- Submit Button -->
            <button type="submit">Sign In</button>
            <p class="error-message" id="login-error"></p>
        </form>
    </div>
    `
};

async function loginResponse() {
    document.querySelector('#login-form').addEventListener("submit", async (event) => {
        event.preventDefault();

        const username = document.querySelector("#username").value;
        const password = document.querySelector("#password").value;

        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })

        if (response.ok) {
            renderApp();
        } else {
            document.querySelector('#login-error').textContent = "Invalid username or password";
        }
    })
}

function renderApp() {
    console.log("Render app")
    app.innerHTML = '<p>App goes here</p>';

    document.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (link.getAttribute('data-page') === 'books') renderBooks();
            else if (link.getAttribute('data-page') === 'authors') renderAuthors();
            else if (link.getAttribute('data-page') === 'genres') renderGenres();
            else if (link.getAttribute('data-page') === 'tags') renderTags();
            else if (link.getAttribute('data-page') === 'shelf') renderShelf();
            else if (link.getAttribute('data-page') === 'tbr') renderTBR();
            else if (link.getAttribute('data-page') === 'logout') logout();
        })
        
    })
}

async function renderBooks() {
    const response = await fetch('/api/books');

    if (response.ok) {
        const data = await response.json();

        app.innerHTML = data.map(book => bookCard(book)).join('')
        setupTbrButtons()
    } else {
        app.innerHTML = '<p class="error-message">Error!</p>'
    }

    
}

function bookCard(book) {
    return `
        <div class="book">
            <img src="${book.cover_path}" class="cover">
            <div class="details">
                <h2 class="title"><a href="#" onClick="renderIndividualBook(${book.id})">${book.title}</a></h2>
                <p class="author"><a href="#">${book.authors}</a></p>
                <p class="genres">${book.genres.split(",").join(", ")}</p>
                <p class="status">Status: <span class="reading-status">${book.status ? book.status : 'unread'}</span></p>
            </div>
            <button class="tbr-btn ${book.tbr_id ? 'active' : ''}" aria-label="Add to TBR"  data-tbr-id="${book.tbr_id || ''}" data-book-id="${book.id}">
                <svg width="40" height="44" viewBox="0 0 46 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M23 0L28.1436 15.8291H44.7932L31.3248 25.6118L36.4684 41.4409L23 31.6582L9.53157 41.4409L14.6752 25.6118L1.20677 15.8291H17.8564L23 0Z" fill="#aaaaaa"/>
                </svg>
            </button>
        </div>
    `
}

async function renderIndividualBook(id) {
    const bookResponse = await fetch(`/api/books/${id}`);
    const userBookResponse = await fetch(`/api/user_books/book/${id}`);


    if (bookResponse.ok && userBookResponse.ok) {
        const book = await bookResponse.json();
        app.innerHTML = `${bookData(book)}`;

        const userBook = await userBookResponse.json();

        app.innerHTML += userBook.map(book => userBookData(book)).join("");
        setupTbrButtons()
    } else {
        app.innerHTML = '<p class="error-message">Error!</p>'
    }
}

function bookData(book) {
    return `
    <div class="book">
        <img src="${book.cover_path}" class="cover">
        <div class="details">
            <h2 class="title"><a href="#">${book.title}</a></h2>
            <p class="author"><a href="#">${book.authors}</a></p>
            <p class="published">Published <span class="publication-date">${book.published_date}</span></p>
            <p class="genres">${book.genres.split(",").join(", ")}</p>
            <a href="/api/books/${book.id}/download" class="download-btn">Download EPUB</a>
            <div class="summary">${book.description}</div>
        </div>
        <button class="tbr-btn ${book.tbr_id ? 'active' : ''}" aria-label="Add to TBR"  data-tbr-id="${book.tbr_id || ''}" data-book-id="${book.id}">
            <svg width="40" height="44" viewBox="0 0 46 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M23 0L28.1436 15.8291H44.7932L31.3248 25.6118L36.4684 41.4409L23 31.6582L9.53157 41.4409L14.6752 25.6118L1.20677 15.8291H17.8564L23 0Z" fill="#aaaaaa"/>
            </svg>
        </button>
    </div>
        `
}

function userBookData(book) {
    return `
    <div class="user-log">
        <h2 class="status">Status: ${book.status}</h2>
        <p>${formatDate(book.date_started)} to ${book.date_finished ? formatDate(book.date_finished) : "present"}</p>
        <div>${Array(book.rating).fill(`<svg width="20" height="20" viewBox="0 0 46 44" fill="#c9a96e" xmlns="http://www.w3.org/2000/svg"><path d="M23 0L28.1436 15.8291H44.7932L31.3248 25.6118L36.4684 41.4409L23 31.6582L9.53157 41.4409L14.6752 25.6118L1.20677 15.8291H17.8564L23 0Z" fill="#c9a96e"/></svg>`).join('')}</div>
        <p class="read-pct">${book.progress_pct}% finished</p>
        <div class="notes">
            <p>Notes:</p>
            <p>${book.notes}</p>
        </div>
        <small>Last updated ${book.updated_at}</small>
    </div>`
}

function setupTbrButtons() {
    const allButtons = document.querySelectorAll('.tbr-btn');

    allButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            // get the book id, isActive will be a boolean
            const bookId = btn.dataset.bookId;
            const tbrId = btn.dataset.tbrId;
            const isActive = btn.classList.contains('active');

            // if the tbr button is active, deactivate it (remove the record from the database)
            if (isActive) {
                const response = await fetch(`/api/tbr/${tbrId}`, { method: 'DELETE' });
                if (response.ok) btn.classList.remove('active');
                btn.dataset.tbrId = '';
            } else {
                const response = await fetch('/api/tbr', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ book_id: bookId })
                });
                if (response.ok) {
                    const data = await response.json();
                    btn.classList.add('active');
                    btn.dataset.tbrId = data.id;
                } 
            }
        })
    })
}

function renderAuthors() {
        app.innerHTML = '<p>Author app goes here</p>';
}

function renderGenres() {
        app.innerHTML = '<p>Genres app goes here</p>';
}

function renderTags() {
    app.innerHTML = '<p>Tags app goes here</p>';
}

function renderShelf() {
    app.innerHTML = '<p>Shelf app goes here</p>';
}

function renderTBR() {
    app.innerHTML = '<p>TBR app goes here</p>';
}

function logout() {
    // logout function goes here
    renderLogin()
}

function formatDate(dateString) {
    if (!dateString) return '';
    return dateString.slice(0, 10);
}