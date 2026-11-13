// Kohalik staatiliste failide server ilma väliste pakettideta.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, sep, extname } from 'node:path';
const juur = fileURLToPath(new URL('../', import.meta.url));
const valitudPort = process.argv.indexOf('--port');
const port = Number(process.env.PORT || (valitudPort >= 0 ? process.argv[valitudPort + 1] : 8000));
const liides = process.env.HOST || '127.0.0.1';
const tuubid = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};
createServer(async (paringuObjekt, vastus) => {
  try {
    const tee = decodeURIComponent(new URL(paringuObjekt.url, 'http://localhost').pathname);
    let fail = resolve(juur, '.' + tee);
    if (!(fail === resolve(juur) || fail.startsWith(resolve(juur) + sep))) {
      vastus.writeHead(403); vastus.end('Ligipääs keelatud.'); return;
    }
    if ((await stat(fail)).isDirectory()) fail = resolve(fail, 'index.html');
    const sisu = await readFile(fail);
    vastus.writeHead(200, { 'Content-Type': tuubid[extname(fail)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    vastus.end(sisu);
  } catch {
    vastus.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    vastus.end('Faili ei leitud.');
  }
}).listen(port, liides, () => console.log(`Mäng töötab aadressil http://${liides}:${port}`));
