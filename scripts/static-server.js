const http = require('http');
const fs = require('fs');
const path = require('path');
const port = process.env.PORT || 8080;
http.createServer((req, res) => {
  try{
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let p = path.join(process.cwd(), urlPath);
    fs.stat(p, (err, stat) => {
      if (err) { res.statusCode = 404; res.end('Not found'); return; }
      if (stat.isDirectory()) p = path.join(p, 'index.html');
      const stream = fs.createReadStream(p);
      stream.on('error', () => { res.statusCode = 404; res.end('Not found'); });
      res.setHeader('Cache-Control', 'no-store');
      stream.pipe(res);
    });
  }catch(e){ res.statusCode = 500; res.end(String(e)); }
}).listen(port, ()=> console.log('Static server on http://localhost:' + port));
