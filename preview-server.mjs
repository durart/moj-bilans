/**
 * Podgląd lokalny / StackBlitz. Bez zależności npm.
 * NIE jest częścią aplikacji GitHub Pages ani danych użytkownika.
 */
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = process.cwd();
const mime = {
  '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8',
  '.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8',
};
const port = Number(process.env.PORT) || 3000;
const host = '0.0.0.0';
http.createServer(async (req,res) => {
  if(req.method!=='GET' && req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  let pathname;
  try {pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}
  catch{res.writeHead(400);res.end();return;}
  const file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(file!==root && !file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  try{
    const s=await stat(file);
    if(!s.isFile()) throw new Error('Not a file');
    const buffer=await readFile(file);
    res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:buffer);
  }catch{
    res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Nie znaleziono pliku');
  }
}).listen(port,host,()=>console.log('Mój Bilans — test: http://localhost:'+port));
