// grab references to key DOM elements used throughout the app
const hamburger = document.querySelector('.hamburger');
const mainNav = document.querySelector('.main-nav');
const tbrBtn = document.querySelector('.tbr-btn');
const app = document.querySelector('#app');
const displayName = document.querySelectorAll('.display-name');

// module level states - these need to live outside of any single function 
// because event listeners like edit button are triggered after the function
// that fetches this data has finished running
let currentBook = null;
let currentUserBooks = [];

// toggle mobile nav menu
hamburger.addEventListener('click', (e) => {
    mainNav.classList.toggle('open')
});

// close the mobile nav so after a nav link is clicked, it doesn't stay open
document.querySelectorAll('.main-nav a').forEach(link => {
    link.addEventListener('click', () => {
        mainNav.classList.remove('open');
    });
});

// checks if user already has a valid section
// currently unused - renderApp() now handles the initial render and 
// requireAuth() does the same check on a per-click basis instead
async function init() {
    const response = await fetch('/api/auth/me');
    if (response.ok) {
        renderApp();
    } else {
        renderLogin();
        loginResponse();
    }
}

// renders the login form into #app
function renderLogin() {
    app.innerHTML = `
    <div class="login-container">
        <h2>Login</h2>
        <form id="login-form">
            <label for="username">Username</label>
            <input type="text" id="username" name="username" placeholder="Enter username" required>
            <label for="password">Password</label>
            <input type="password" id="password" name="password" placeholder="Enter password" required>
            <!-- Submit Button -->
            <button type="submit">Sign In</button>
        </form>
        <p class="error-message" id="login-error"></p>
        <p>Don't have an account?</p>
        <button onclick="renderSignup(); signUpResponse()">Sign up</button>
    </div>
    `
};

// attaches the submit handler to the login form
// must be called right after renderLogin() since the form has to exist
// in the DOM before a listener can be attached to it
async function loginResponse() {
    document.querySelector('#login-form').addEventListener("submit", async (event) => {
        // don't let the button submit
        event.preventDefault();

        const username = document.querySelector("#username").value;
        const password = document.querySelector("#password").value;

        // api call to login
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })

        if (response.ok) {
            // login succeeded - session cookie is set, so we can move on to the app
            renderApp();
        } else if (response.status === 401) {
            // 401 means bad credentials
            document.querySelector('#login-error').textContent = "Invalid username or password";
        } else {
            // this means something else went wrong and i should troubleshoot
            document.querySelector('#login-error').textContent = "Something went wrong. Please try again later.";
        }
    })
}

// destroys the session on the server and sends the user back to the login screen
async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    renderLogin();
    loginResponse();
}

// render the signup form
function renderSignup() {
    app.innerHTML = `
    <div class="login-container">
        <h2>Sign Up</h2>
        <form id="sign-up-form">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" placeholder="Enter username" required>
                <label for="display-name">Display Name</label>
                <input type="text" id="display-name" name="display-name" placeholder="Enter display name" required>
                <label for="password">Password</label>
                <input type="password" id="password" name="password" placeholder="Enter password" required>
                <label for="secret">Secret Code</label>
                <input type="text" id="secret" name="secret" placeholder="Enter secret code" required>
            <button type="submit">Sign Up</button>
        </form>
        <p class="error-message"></p>
    </div>
        `
}

// attaches the submit handler to the sign-up form
// must be called right after renderSignup(), same reasoning as loginResponse()
async function signUpResponse() {
    const form = document.querySelector('#sign-up-form');
    const errMsg = document.querySelector('.error-message');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const username = document.querySelector("#username").value;
        const password = document.querySelector("#password").value;
        const displayName = document.querySelector('#display-name').value;
        const secretCode = document.querySelector('#secret').value;

        
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ secretCode, username, password, displayName })
        })

        if (response.ok) {
            // registration succeeded: log them straight in with the same
            // credentials they just submitted, instead of making them
            // re-enter everything on the login form
            const autoLoginResponse = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (autoLoginResponse.ok) {
                renderApp();
            } else {
                // this shouldn't happen, but it's good to fall back to a manual login
                // if it does fail for some reason
                renderLogin();
                loginResponse();
            }
        } else {
            // The server sends back a specific reason (wrong invite code,
            // username already taken, etc.) — show that instead of a generic message
            const data = await response.json();
            errMsg.textContent = data.error;
        }

        
    })
}

// Renders the main app shell: sets the default #app content to the About page,
// and wires up the nav links to load the right page when clicked
function renderApp() {
    app.innerHTML = renderAbout();

    document.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');

            // every protected page is wrapped in requireAuth(). this checks
            // if the user is actually logged in before loading the page, and 
            // shows them the login form instead if they aren't
            if (page === 'books') requireAuth(renderBooks);
            else if (page === 'authors') requireAuth(renderAuthors);
            else if (page === 'genres') requireAuth(renderGenres);
            else if (page === 'tags') requireAuth(renderTags);
            else if (page === 'shelf') requireAuth(renderShelf);
            else if (page === 'tbr') requireAuth(renderTBR);
            // logout doesn't care if you're logged in or not - if you call it without
            // an active session it does nothing
            else if (page === 'logout') logout();
        })
        
    })
}

// auth guard - it checks if the user is logged in. if it is, it runs
// the function it was guarding. if not, it sends you to the login form
async function requireAuth(callback) {
    const response = await fetch('/api/auth/me');
    if (response.ok) {
        const data = await response.json();
        displayName.forEach(name => name.innerHTML = data.display_name);
        callback();
    } else {
        renderLogin();
        loginResponse();
    }
}

// renders the about/landing content. this is the default view in #app
// before a user clicks onto a protected page
function renderAbout() {
    return `
        <div id="portfolio">
            <section>
                <h2 class="title">Gillian's Stacks</h2>
                <p><em>A personal library, built one shelf at a time</em></p>
                <p>I built Gillian's Stacks because I wanted a place for my own ebooks that actually felt like mine. For so long I tried different platforms like Goodreads, and nothing stuck. I started using spreadsheets to keep track of what I was reading, and that's when the idea struck: why can't I design my own platform using the same data I've been keeping track of for so long on my own? And from that came Gillian's Stacks, a custom platform built around my needs, and how I like to read.</p>
            </section>
            <section>
                <h2>What it does</h2>
                <p>You can browse the library to see a list of every book available in my library and all its details &mdash; you can see the cover, author, genres, series if relevant, and the description. From there you can log it as read, mark something as currently reading or DNF, track progress, rate it, and leave notes, with start and finish dates for every record (rereads included — each one gets its own entry, not just an overwritten record). Starring a book adds it to your TBR list, which is viewable in "My TBR". "My Shelf" pulls together everything you've been reading into one place, and you can edit your records there, too. Don't worry if you created a record by mistake, you can delete it if you want!</p>
                <p>Down the road, there will be browsing by genre and author, and because this doubles as a fanfiction archive for me, I'll be able to browse by tag as well. Additionally, there will be a book request form, though it'll be more of a log of 'what do I want to read?' as I will be the one sourcing the books.</p>
            </section>
            <section>
                <h2>Why it's built this way</h2>
                <p><strong>No framework? That's on purpose.</strong> This is a vanilla JavaScript single-page app &mdash; no React, no Vue, nothing. My goal was to strengthen my JavaScript skills at a foundational level. To me, that meant understanding how routing, state, and DOM manipulation work before building on top of it.</p>
                <p><strong>Session-based auth, not JWT.</strong> This app is small by design, as it was created for two people: me and my sister. Session auth is simpler to reason about and was the right fit for this scale, rather than reaching for something built for a large-scale system I simply don't need. </p>
                <p><strong>Invite-gated sign-up.</strong> Anyone can register if they have the invite code. This means that future employers (hello!) can create an account to view or even use my app, not just look at screenshots, but it also means that I can avoid spam accounts or random strangers requesting books.</p>
                <p><strong>The look.</strong> It's warm, dark, cozy. I just like it. Aside from keeping on top of accessibility, there's no other reasoning here. </p>
            </section>
            <section>
                <h2>What's under the hood</h2>
                <ul>
                    <li>Self designed and maintained MySQL schema. Books, authors, series, genres, tags, reading records, TBR lists, everything: normalized with foreign keys throughout. </li>
                    <li>Node.js + Express backend, hand-written REST routes for every resource.</li>
                    <li>Full CRUD on reading records &mdash; create, read, update, delete, plus additional confirmation upon deletion of records.</li>
                    <li>Responsive layout, built mobile-first considerations in from the start.</li>
                </ul>
            </section>

            <p>Content written by Gillian Thorne with assistance by AI for clarity.</p>
        </div>
    `
}

// fetches every book in the library and renders them as a list of cards
async function renderBooks() {
    const response = await fetch('/api/books');

    if (response.ok) {
        const data = await response.json();
        app.innerHTML = data.map(book => bookCard(book)).join('');
        console.log(data.length);
        setupTbrButtons(); // attach click handlers to the tbr stars
    } else {
        app.innerHTML = '<p class="error-message">Error!</p>'
    }    
}

// builds the html for a single card on the library list page
// clicking the title brngs you to that book's detail page
function bookCard(book) {
    return `
        <div class="book">
            <img src="${book.cover_path}" class="cover">
            <div class="details">
                <h2 class="title"><a href="#" onclick="renderIndividualBook(${book.id})">${book.title}</a></h2>
                <p class="author">${book.authors ? book.authors.map(a => `<a href="#" onclick="renderAuthorPage(${a.id})">${a.name}</a>`).join(', ') : 'No authors assigned'}</p>
                <p class="genres">${book.genres ? book.genres.map(g => `<a href="#" onclick="renderGenrePage(${g.id})">${g.name}</a>`).join(', ') : 'No genres assigned'}</p>
                <p class="status">Status: <span class="reading-status">${book.status ?? 'unread'}</span></p>
            </div>
            <button class="tbr-btn ${book.tbr_id ? 'active' : ''}" aria-label="Add to TBR"  data-tbr-id="${book.tbr_id || ''}" data-book-id="${book.id}">
                <svg width="40" height="44" viewBox="0 0 46 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M23 0L28.1436 15.8291H44.7932L31.3248 25.6118L36.4684 41.4409L23 31.6582L9.53157 41.4409L14.6752 25.6118L1.20677 15.8291H17.8564L23 0Z" fill="#aaaaaa"/>
                </svg>
            </button>
        </div>
    `
}

// fetches a single book's details plus all of the user's reading records
// for that book - could be more than one if it's a reread
// stores both in module-level state so later event listeners can access
// the data without needing to refetch it
async function renderIndividualBook(id) {
    const bookResponse = await fetch(`/api/books/${id}`);
    const userBookResponse = await fetch(`/api/user_books/book/${id}`);


    if (bookResponse.ok && userBookResponse.ok) {
        const book = await bookResponse.json();
        const userBook = await userBookResponse.json();

        currentBook = book;
        currentUserBooks = userBook

        // Build the whole page in one go: book info, action buttons
        // (Start Reading / Mark as Read), then a card for every reading record
        app.innerHTML = bookData(book) + renderActionButtons(book) + userBook.map(book => userBookData(book)).join("");
        setupActionButtons();
        setupTbrButtons();
        setupEditButtons();
    } else {
        app.innerHTML = '<p class="error-message">Error!</p>'
    }
}

// Builds the Start Reading / Mark as Read buttons shown on every book detail page.
// These are always shown (even if a reading record already exists), since
// rereads are supported — each click creates a brand new record rather than
// editing an existing one.
function renderActionButtons(book) {
        return `
        <div class="action-buttons">
            <button class="action-btn" data-book-id="${book.id}" data-tbr-id="${book.tbr_id ?? ''}" data-action="start">Start Reading</button>
            <button class="action-btn" data-book-id="${book.id}" data-tbr-id="${book.tbr_id ?? ''}" data-action="read">Mark as Read</button>
        </div>
        `
}

// Attaches click handlers to the Start Reading / Mark as Read buttons.
// Both actions create a new user_books record, then remove the book from
// the TBR list if it was on there (since you're no longer just planning to read it).
async function setupActionButtons() {
    const actionBtn = document.querySelectorAll('.action-btn');

    actionBtn.forEach(btn => {
        btn.addEventListener('click', async () => {
            const action = btn.dataset.action;
            const bookId = btn.dataset.bookId;
            const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD for date columns

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
                if (response.ok) {
                    // If this book was on the TBR list, remove it now that
                    // reading has actually started
                    const tbrId = btn.dataset.tbrId;
                    if (tbrId) await fetch(`/api/tbr/${tbrId}`, { method: 'DELETE' });
                    renderIndividualBook(bookId) // refresh the page to show the new record
                };
            // all of this logic repeats above
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
                
                if (response.ok) {
                    const tbrId = btn.dataset.tbrId;
                    if (tbrId) await fetch(`/api/tbr/${tbrId}`, { method: 'DELETE' });
                    renderIndividualBook(bookId)
                };
            }
        })
    })
}

// Builds the top section of the book detail page: cover, title, author,
// publication date, genres, a download link, the description, and the TBR star.
function bookData(book) {
    return `
    <div class="book">
        <img src="${book.cover_path}" class="cover">
        <div class="details">
            <h2 class="title"><a href="#">${book.title}</a></h2>
            <p class="author"><a href="#">${book.authors}</a></p>
            <p class="published">Published <span class="publication-date">${formatDate(book.published_date)}</span></p>
            <p class="genres">${book.genres ? book.genres.split(",").join(", ") : ""}</p>
            <a href="/api/books/${book.id}/download" class="download-btn">Download EPUB</a>
            <div class="summary">${book.description}</div>
        </div>
        <button class="tbr-btn ${book.tbr_id ? 'active' : ''}" aria-label="Add to TBR"  data-tbr-id="${book.tbr_id ?? ''}" data-book-id="${book.id}">
            <svg width="40" height="44" viewBox="0 0 46 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M23 0L28.1436 15.8291H44.7932L31.3248 25.6118L36.4684 41.4409L23 31.6582L9.53157 41.4409L14.6752 25.6118L1.20677 15.8291H17.8564L23 0Z" fill="#aaaaaa"/>
            </svg>
        </button>
    </div>
        `
}

// Builds a card for a single reading record (one read-through of a book).
// Used on both the book detail page and the shelf page — includes the book's
// own title/cover so it makes sense standalone on the shelf, where multiple
// different books are listed together.
function userBookData(record) {
    return `
        <div class="user-log" id="user-book-${record.id}">
            <a href="#" onclick="renderIndividualBook(${record.book_id})"><img src="${record.cover_path}" class="cover"></a>
            <div class="details">
                <div class="log-header">
                    <h2><a href="#" onclick="renderIndividualBook(${record.book_id})">${record.title}</a></h2>
                    <button class="edit-btn" data-record-id="${record.id}">Edit</button>
                </div>
                <h3 class="status">Status: ${record.status === "dnf" ? "DNF" : record.status}</h3>
                <p class="publication">${formatDate(record.date_started)} to ${record.date_finished ? formatDate(record.date_finished) : "present"}</p>
                <div>${record.rating ? renderStars(record.rating) : '<span class="unrated">Unrated</span>'}</div>
                <p class="read-pct">${record.progress_pct}% finished</p>
                <div class="progress-bar">
                    <div class="percent-progress" style="width: ${record.progress_pct}%"></div>
                </div>
                <div class="notes">
                    <p>Notes:</p>
                    <p>${record.notes ?? ""}</p>
                </div>
                <small>Last updated ${formatDateTime(record.updated_at)}</small>
            </div>
        </div>`
}

// Attaches click handlers to every TBR star button on the page.
// Toggling adds/removes the book from the TBR list and updates the button's
// visual state and stored tbr_id to match.
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
            // otherwise, add it
            } else {
                const response = await fetch('/api/tbr', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ book_id: bookId })
                });
                if (response.ok) {
                    // Server returns the new tbr_lists row's id, which we
                    // need to store so a future click can delete the right record
                    const data = await response.json();
                    btn.classList.add('active');
                    btn.dataset.tbrId = data.id;
                } 
            }
        })
    })
}

// Builds a card for a single reading record (one read-through of a book).
// Used on both the book detail page and the shelf page — includes the book's
// own title/cover so it makes sense standalone on the shelf, where multiple
// different books are listed together.
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
                <input name="progress-pct" id="progress-pct-${book.id}" type="number" min="0" max="100" value="${book.progress_pct ?? ""}">

                <label for="rating-${book.id}">Rating</label>
                <input name="rating" id="rating-${book.id}" type="number" min="1" max="5" value="${book.rating ?? ""}">

                <label for="notes-${book.id}">Notes</label>
                <textarea name="notes" id="notes-${book.id}">${book.notes ? book.notes : ""}</textarea>
                <div class="button-section">
                    <button type="submit">Save</button>
                    <button type="button" class="cancel-btn" data-record-id="${book.id}">Cancel</button>
                    <button type="button" class="delete-btn" data-record-id="${book.id}">Delete</button>
                </div>
                </form>
    `
}

// Attaches click handlers to every Edit button on the page.
// Clicking swaps that record's read-only card for the edit form.
function setupEditButtons() {
    const allButtons = document.querySelectorAll('.edit-btn');

    allButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const recordId = btn.dataset.recordId;
            // Pull the full record from module-level state rather than
            // re-fetching — we already have this data from the initial render
            const record = currentUserBooks.find(b => b.id == recordId);

            const cardElement = document.getElementById(`user-book-${recordId}`);
            // outerHTML replaces the whole card element, not just its contents,
            // since the form has its own structure and shouldn't be nested
            // inside the leftover .user-log wrapper
            cardElement.outerHTML = userBookEditForm(record, record.title);

            setupEditForm(); // attach listeners to the form we just inserted
        })
    })
}

// Attaches Save / Cancel / Delete handlers to the currently open edit form.
// Called right after the form is inserted into the DOM by setupEditButtons().
function setupEditForm() {
    const form = document.querySelector('.edit-form');
    const recordId = form.dataset.recordId;

    // Save: sends the updated values to the server, then swaps the form
    // back for a fresh read-only card showing the saved data
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);

        const response = await fetch(`/api/user_books/${recordId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: formData.get('status'),
                // FormData always returns strings, so number fields need
                // explicit conversion to match the database's column types
                progress_pct: Number(formData.get('progress-pct')),
                rating: formData.get('rating') ? Number(formData.get('rating')) : null,
                notes: formData.get('notes'),
                date_started: formData.get('date-started'),
                // empty string isn't a valid date for MySQL — needs to be null instead
                date_finished: formData.get('date-finished') || null
            })
        });

        if (response.ok) {
            // Re-fetch the record fresh rather than reusing what we sent,
            // since the server-set updated_at timestamp will have changed
            const updatedResponse = await fetch(`/api/user_books/${recordId}`);
            const updatedRecord = await updatedResponse.json();

            const formElement = document.querySelector('.edit-form');
            formElement.outerHTML = userBookData(updatedRecord);

            setupEditButtons(); // re-attach listener to the new Edit button

            // Keep module-level state in sync with what's now saved on the server
            const index = currentUserBooks.findIndex(b => b.id == recordId);
            currentUserBooks[index] = updatedRecord;
        }
    })

    // Cancel: discards any unsaved changes and reverts to the original,
    // unedited record data already held in currentUserBooks
    const cancelBtn = form.querySelector('.cancel-btn');
    cancelBtn.addEventListener('click', () => {
        const original = currentUserBooks.find(b => b.id == recordId);
        form.outerHTML = userBookData(original);
        setupEditButtons();
    });

    // Delete: confirms first (since this can't be undone), then removes
    // the record from both the database and the page
    const deleteBtn = form.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', async () => {
        if (confirm("Are you sure you want to delete this record?")) {
            const response = await fetch(`/api/user_books/${recordId}`, { method: 'DELETE' });

            if (response.ok) {
                form.outerHTML = "";

                const index = currentUserBooks.findIndex(b => b.id == recordId);
                currentUserBooks.splice(index, 1);
            }
        }
    })
}

// TODO: build out author browsing — see stretch goals list
function renderAuthors() {
        app.innerHTML = '<p>Author app goes here</p>';
}

// TODO: build out genre browsing — see stretch goals list
function renderGenres() {
        app.innerHTML = '<p>Genres app goes here</p>';
}

// TODO: build out tag browsing — see stretch goals list
function renderTags() {
    app.innerHTML = '<p>Tags app goes here</p>';
}

// Fetches every reading record for the logged-in user across all books,
// and renders them with the same card used on the book detail page —
// each card already includes its own title/cover, so it stands alone here.
async function renderShelf() {
    const response = await fetch('/api/user_books');

    if (response.ok) {
        const data = await response.json();

        currentUserBooks = data;

        app.innerHTML = data.map(book => userBookData(book)).join('');

        setupEditButtons();
    } else {
        app.innerHTML = '<p class="error-message">Error!</p>';
    }
}

// Fetches everything on the user's TBR list and renders each as a card
// with a Start Reading / Mark as Read option, plus the star to remove it.
async function renderTBR() {
    const response = await fetch('/api/tbr');

    if (response.ok) {
        const data = await response.json();

        app.innerHTML = data.map(book => tbrCards(book)).join('');

        setupTbrButtons();
        setupActionButtons();
    } else {
        app.innerHTML = '<p class="error-message">Error!</p>';
    }
}

// Builds a single TBR card: cover, title, author, series, the TBR star
// (always shown as active here, since everything on this page is by
// definition on the TBR list), and action buttons to start/finish reading.
function tbrCards(record) {
    return `
    <div class="tbr-record" id="tbr-record-${record.id}">
        <a href="#" onclick="renderIndividualBook(${record.book_id})"><img src="${record.cover_path}" class="cover"></a>
        <div class="details">
            <div class="log-header">
                <h2><a href="#" onclick="renderIndividualBook(${record.book_id})">${record.title}</a></h2>
                <button class="tbr-btn active" aria-label="Add to TBR"  data-tbr-id="${record.id ?? ''}" data-book-id="${record.book_id}">
                    <svg width="40" height="44" viewBox="0 0 46 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M23 0L28.1436 15.8291H44.7932L31.3248 25.6118L36.4684 41.4409L23 31.6582L9.53157 41.4409L14.6752 25.6118L1.20677 15.8291H17.8564L23 0Z" fill="#aaaaaa"/>
                    </svg>
                </button>
            </div>
            <p>${record.authors}</p>
            <p>${record.series ? record.series : ""}</p>
            <div class="action-buttons">
                <button class="action-btn" data-book-id="${record.book_id}" data-tbr-id="${record.id}" data-action="start">Start Reading</button>
                <button class="action-btn" data-book-id="${record.book_id}" data-tbr-id="${record.id}" data-action="read">Mark as Read</button>
            </div>
        </div> 
    </div>
    `
}

// Converts a MySQL date/timestamp string to just the YYYY-MM-DD portion.
// Used for <input type="date"> values, which require exactly this format.
function formatDate(dateString) {
    if (!dateString) return '';
    return dateString.slice(0, 10);
}

// Converts a UTC timestamp string from the database into a readable
// "YYYY-MM-DD HH:MM:SS" string in the browser's local timezone.
// Uses Intl.DateTimeFormat rather than manual offset math, since that
// correctly handles daylight saving time changes automatically.
function formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const parts = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    }).formatToParts(date);

    const get = type => parts.find(p => p.type === type).value;
    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

function renderStars(rating) {
    return Array(rating).fill(`<svg width="20" height="20" viewBox="0 0 46 44" fill="#c9a96e" xmlns="http://www.w3.org/2000/svg"><path d="M23 0L28.1436 15.8291H44.7932L31.3248 25.6118L36.4684 41.4409L23 31.6582L9.53157 41.4409L14.6752 25.6118L1.20677 15.8291H17.8564L23 0Z" fill="#c9a96e"/></svg>`).join('')
}

// Kick off the app — renders the header/nav (already in index.html) and the
// default About content, then wires up the nav for when the user clicks in
renderApp();
