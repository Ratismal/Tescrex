const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const manifest = require('./src/manifest.json');

const out = path.join('dist', 'tescrex-' + manifest.version + '.zip');

const stream = fs.createWriteStream(out);
const archive = archiver('zip');

archive.pipe(stream);
archive.directory('src', false);
archive.finalize();

console.log('Wrote to', out);