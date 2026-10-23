import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
import { chromium } from 'playwright-core';
const out=process.argv[2], N=+process.argv[3]||192;fs.mkdirSync(out,{recursive:true});
const dir=path.resolve('scripts/loop');
const srv=http.createServer((q,r)=>{const f=path.join(dir,q.url==='/'?'loop.html':decodeURIComponent(q.url.slice(1)));if(!fs.existsSync(f)){r.writeHead(404);return r.end()}r.writeHead(200,{'content-type':f.endsWith('.svg')?'image/svg+xml':'text/html'});fs.createReadStream(f).pipe(r)});
await new Promise(r=>srv.listen(0,r));
const exe=['/opt/pw-browsers/chromium-1194/chrome-linux/chrome','/opt/pw-browsers/chromium/chrome-linux/chrome'].find(p=>fs.existsSync(p));
const b=await chromium.launch({executablePath:exe,args:['--no-sandbox']});
const pg=await b.newPage({viewport:{width:1200,height:1200}});
await pg.goto(`http://localhost:${srv.address().port}/`);
for(let i=0;i<N;i++){await pg.evaluate(u=>render(u),i/N);await pg.screenshot({path:path.join(out,`f${String(i).padStart(4,'0')}.png`)})}
await b.close();srv.close();
