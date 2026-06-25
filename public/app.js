const hamburger = document.querySelector('.hamburger');
const mainNav = document.querySelector('.main-nav');
const tbrBtn = document.querySelector('.tbr-btn');
const app = document.querySelector('#app');

let currentBook = null;
let currentUserBooks = [];

hamburger.addEventListener('click', (e) => {
    mainNav.classList.toggle('open')
});

document.querySelectorAll('.main-nav a').forEach(link => {
    link.addEventListener('click', () => {
        mainNav.classList.remove('open');
    });
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
                <h2 class="title"><a href="#" onclick="renderIndividualBook(${book.id})">${book.title}</a></h2>
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
        const userBook = await userBookResponse.json();

        currentBook = book;
        currentUserBooks = userBook

        console.log(book.id);

        app.innerHTML = bookData(book) + renderActionButtons(book.id) + userBook.map(book => userBookData(book)).join("");
        setupActionButtons();
        setupTbrButtons();
        setupEditButtons();
    } else {
        app.innerHTML = '<p class="error-message">Error!</p>'
    }
}

function renderActionButtons(bookId) {
        return `
        <div class="action-buttons">
            <button class="action-btn" data-book-id="${bookId}" data-action="start">Start Reading</button>
            <button class="action-btn" data-book-id="${bookId}" data-action="read">Mark as Read</button>
        </div>
        `
}

async function setupActionButtons() {
    const actionBtn = document.querySelectorAll('.action-btn');

    actionBtn.forEach(btn => {
        btn.addEventListener('click', async () => {
            const action = btn.dataset.action;
            const bookId = btn.dataset.bookId;
            const today = new Date().toISOString().slice(0, 10);

            if (action === 'start') {
                const response = await fetch('/api/user_books', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        book_id: bookId,
                        status: "reading",
                        progress_pct: 0,
                        date_started: today
                     })
                })
                if (response.ok) renderIndividualBook(bookId);
            } else if (action === 'read') {
                const response = await fetch('/api/user_books', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        book_id: bookId,
                        status: "read",
                        progress_pct: 100,
                        date_started: today,
                        date_finished: today
                     })
                })
                if (response.ok) renderIndividualBook(bookId);
            }
        })
    })
}

function bookData(book) {
    return `
    <div class="book">
        <img src="${book.cover_path}" class="cover">
        <div class="details">
            <h2 class="title"><a href="#">${book.title}</a></h2>
            <p class="author"><a href="#">${book.authors}</a></p>
            <p class="published">Published <span class="publication-date">${formatDate(book.published_date)}</span></p>
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
    console.log(book.updated_at);
    return `
    <div class="user-log" id="user-book-${book.id}">
        <div class="log-header">
            <h2 class="status">Status: ${book.status}</h2>
            <button class="edit-btn" data-record-id="${book.id}">Edit</button>
        </div>
        <p>${formatDate(book.date_started)} to ${book.date_finished ? formatDate(book.date_finished) : "present"}</p>
        <div>${Array(book.rating).fill(`<svg width="20" height="20" viewBox="0 0 46 44" fill="#c9a96e" xmlns="http://www.w3.org/2000/svg"><path d="M23 0L28.1436 15.8291H44.7932L31.3248 25.6118L36.4684 41.4409L23 31.6582L9.53157 41.4409L14.6752 25.6118L1.20677 15.8291H17.8564L23 0Z" fill="#c9a96e"/></svg>`).join('')}</div>
        <p class="read-pct">${book.progress_pct}% finished</p>
        <div class="notes">
            <p>Notes:</p>
            <p>${book.notes ? book.notes : ""}</p>
        </div>
        <small>Last updated ${
            formatDateTime(book.updated_at)}</small>
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

function userBookEditForm(book, bookTitle) {
    return `
        <form class="edit-form" data-record-id="${book.id}">
            <h2>Editing record for ${bookTitle}</h2>
                <label for="date-started-${book.id}">Date Started</label>
                <input name="date-started" id="date-started-${book.id}" type="date" value="${book.date_started ? formatDate(book.date_started) : ""}">
                
                <label for="date-finished-${book.id}">Date Finished</label>
                <input name="date-finished" id="date-finished-${book.id}" type="date" value="${book.date_finished ? formatDate(book.date_finished) : ""}">

                <label for="status-${book.id}">Status</label>
                <select name="status" id="status-${book.id}">
                    <option value="unread" ${book.status === "unread" ? "selected" : ""}>Unread</option>
                    <option value="reading" ${book.status === "reading" ? "selected" : ""}>Reading</option>
                    <option value="read" ${book.status === "read" ? "selected" : ""}>Read</option>
                    <option value="dnf" ${book.status === "dnf" ? "selected" : ""}>DNF</option>
                </select>

                <label for="progress-pct-${book.id}">Progress</label>
                <input name="progress-pct" id="progress-pct-${book.id}" type="number" min="0" max="100" value="${book.progress_pct ? book.progress_pct : ""}">

                <label for="rating-${book.id}">Rating</label>
                <input name="rating" id="rating-${book.id}" type="number" min="1" max="5" value="${book.rating ? book.rating : ""}">

                <label for="notes-${book.id}">Notes</label>
                <textarea name="notes" id="notes-${book.id}">${book.notes ? book.notes : ""}</textarea>

                <button type="submit">Save</button>
                <button type="button" class="cancel-btn" data-record-id="${userBook.id}">Cancel</button>
        </form>
    `
}

function setupEditButtons() {
    const allButtons = document.querySelectorAll('.edit-btn');

    allButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const recordId = btn.dataset.recordId;
            // find b where b id == recordId
            const record = currentUserBooks.find(b => b.id == recordId);
            console.log(record);

            const cardElement = document.getElementById(`user-book-${recordId}`);
            cardElement.outerHTML = userBookEditForm(record, currentBook.title);

            setupEditForm();
        })
    })
}

function setupEditForm() {
    const form = document.querySelector('.edit-form');

    const recordId = form.dataset.recordId;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);

        const response = await fetch(`/api/user_books/${recordId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: formData.get('status'),
                progress_pct: Number(formData.get('progress-pct')),
                rating: formData.get('rating') ? Number(formData.get('rating')) : null,
                notes: formData.get('notes'),
                date_started: formData.get('date-started'),
                date_finished: formData.get('date-finished') || null
            })
        });

        if (response.ok) {
            const updatedResponse = await fetch(`/api/user_books/${recordId}`);
            const updatedRecord = await updatedResponse.json();

            const formElement = document.querySelector('.edit-form');
            formElement.outerHTML = userBookData(updatedRecord);

            setupEditButtons();

            const index = currentUserBooks.findIndex(b => b.id == recordId);
            currentUserBooks[index] = updatedRecord;
        }
    })

    const cancelBtn = form.querySelector('.cancel-btn');
    cancelBtn.addEventListener('click', () => {
        const original = currentUserBooks.find(b => b.id == recordId);
        form.outerHTML = userBookData(original);
        setupEditButtons();
    });
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

async function renderShelf() {
    app.innerHTML = '<p>Shelf app goes here</p>';
}

function shelfCard(record) {
    return `
        <div class="user-log" id="user-book-${record.id}">
            <a href="#" onclick="renderIndividualBook(${record.book_id})"><img src="${record.cover_path}" class="cover"></a>
            <div class="details">
                <a href="#" onclick="renderIndividualBook(${record.book_id})"><h2>${record.title}</h2></a>
                <div class="log-header">
                    <h3 class="status">Status: ${record.status}</h3>
                    <button class="edit-btn" data-record-id="${record.id}">Edit</button>
                </div>
                <p>${formatDate(record.date_started)} to ${record.date_finished ? formatDate(record.date_finished) : "present"}</p>
                <div>${Array(record.rating).fill(`<svg width="20" height="20" viewBox="0 0 46 44" fill="#c9a96e" xmlns="http://www.w3.org/2000/svg"><path d="M23 0L28.1436 15.8291H44.7932L31.3248 25.6118L36.4684 41.4409L23 31.6582L9.53157 41.4409L14.6752 25.6118L1.20677 15.8291H17.8564L23 0Z" fill="#c9a96e"/></svg>`).join('')}</div>
                <p class="read-pct">${record.progress_pct}% finished</p>
                <div class="notes">
                    <p>Notes:</p>
                    <p>${record.notes ? record.notes : ""}</p>
                </div>
                <small>Last updated ${formatDateTime(record.updated_at)}</small>
            </div>
            
        </div>
    `
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

function formatDateTime(dateString) {
    if (!dateString) return '';
    console.log('raw value:', dateString);
    const date = new Date(dateString);
    console.log('parsed date:', date.toString());

    const parts = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    }).formatToParts(date);

    const get = type => parts.find(p => p.type === type).value;
    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}