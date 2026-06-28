const fs = require('fs');
const path = require('path');
const EPub = require('epub2').default;
const sharp = require('sharp');
const db = require('./server/db');

const EPUB_FOLDER = './epubs';
const COVERS_FOLDER = './public/covers';

// creates the file directories if they don't exist
if (!fs.existsSync(COVERS_FOLDER)) {
    fs.mkdirSync(COVERS_FOLDER, { recursive: true });
}

async function importEpubs() {
    const files = fs.readdirSync(EPUB_FOLDER).filter(f => f.endsWith('.epub'));

    if (files.length === 0) {
        console.log('No epub files found in the epubs folder');
        return;
    }

    console.log(`Found ${files.length} epub files, importing now...`);

    for (const file of files) {
        try {
            await importSingleEpub(file);
        } catch (err) {
            console.error(`Failed to import ${file}`, err);
        }
    }

    console.log('Import complete!');
    process.exit(0);
}

async function  importSingleEpub(filename) {
    const filepath = path.join(EPUB_FOLDER, filename);
    console.log(`Importing ${filename}...`);
    
    const epub = await EPub.createAsync(filepath);

    const title = epub.metadata.title || filename.replace('.epub', '');
    const description = epub.metadata.description || null;
    const published_date = epub.metadata.date || null;

    console.log(`   Title: ${title}`);

    let cover_path = null;

    try {
        const coverData = await epub.getImageAsync(epub.metadata.cover);
        if (coverData) {
            const coverFilename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
            const coverPath = path.join(COVERS_FOLDER, coverFilename);
            await sharp(coverData[0]).jpeg().toFile(coverPath);
            cover_path = `/covers/${coverFilename}`;
            console.log(`   Cover saved: ${cover_path}`);
        }
    } catch (err) {
        console.log(`   No cover found for ${title}`);
    }

    const authorName = epub.metadata.creator || 'Unknown';
    console.log(`  Author: ${authorName}`);

    const [existingAuthor] = await db.query(
        'SELECT * FROM authors WHERE name = ?', [authorName]
    );

    let authorId;
    if (existingAuthor.length > 0) {
        authorId = existingAuthor[0].id;
        console.log(`  Author already exists, skipping...`);
    } else {
        const [authorResult] = await db.query(
            'INSERT INTO authors (name) VALUES (?)', [authorName]
        );
        authorId = authorResult.insertId;
        console.log(`  Author added to database`);
    }

    const [existingBook] = await db.query(`
        SELECT books.* FROM books
        LEFT JOIN book_authors ON books.id = book_authors.book_id
        WHERE books.file_path = ? AND book_authors.author_id = ?`,
        [filepath, authorId]
    );

    if (existingBook.length > 0) {
        console.log(`  Book already exists, skipping...`);
        return;
    }

    const [bookResult] = await db.query(`
        INSERT INTO books (title, description, cover_path, epub_path, published_date)
        VALUES (?, ?, ?, ?, ?)`,
        [title, description, cover_path, filepath, published_date]
    );

    const bookId = bookResult.insertId;
    console.log(`  Book added to database with id ${bookId}`);

    await db.query(
        'INSERT INTO book_authors (book_id, author_id) VALUES (?, ?)',
        [bookId, authorId]
    );

    console.log(`  Successfully imported ${title}`);
}

importEpubs();
