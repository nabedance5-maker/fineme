// Small upload server + srcset generator
// @ts-nocheck
// Usage: node server/upload-server.js
// POST /upload (multipart/form-data) files[]=...  -> returns JSON with generated urls and srcset

const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { randomUUID } = require('crypto');
// Optional AWS S3 client (lazy require)
let S3Client, PutObjectCommand;
const S3_ENABLED = !!(process.env.UPLOAD_S3_BUCKET && process.env.AWS_REGION && (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE));
if(S3_ENABLED){
  try{
    ({S3Client, PutObjectCommand} = require('@aws-sdk/client-s3'));
    ({ getSignedUrl } = require('@aws-sdk/s3-request-presigner'));
  }catch(e){ console.warn('S3 client or presigner not installed; falling back to local file storage'); }
}

const app = express();

// CORS: allow specific origins via env UPLOAD_ALLOWED_ORIGINS (comma-separated), else allow all for dev
const allowedOriginsEnv = process.env.UPLOAD_ALLOWED_ORIGINS || '';
const allowedOrigins = allowedOriginsEnv.split(',').map(s=> s.trim()).filter(Boolean);
app.use(cors({ origin: function(origin, cb){ if(!origin) return cb(null, true); if(allowedOrigins.length === 0) return cb(null, true); if(allowedOrigins.includes(origin)) return cb(null, true); return cb(new Error('CORS not allowed'), false); } }));

// Security: optional API key check. If UPLOAD_API_KEY is set, require header 'x-api-key' to match.
const REQUIRED_API_KEY = process.env.UPLOAD_API_KEY || '';
function requireApiKey(req, res, next){
  if(!REQUIRED_API_KEY) return next();
  const key = (req.headers['x-api-key'] || req.headers['x-apikey'] || '').toString();
  if(!key || key !== REQUIRED_API_KEY){ return res.status(401).json({ ok:false, error: 'Unauthorized' }); }
  return next();
}

// Multer with limits and allow images and videos
const MAX_FILE_SIZE = Number(process.env.UPLOAD_MAX_FILE_SIZE || (5 * 1024 * 1024)); // default 5MB
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_SIZE, files: 20 }, fileFilter: function(req, file, cb){ if(!file.mimetype) return cb(new Error('Missing mimetype'), false); if(!(file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/'))){ return cb(new Error('Only image or video files are allowed'), false); } cb(null, true); } });

const OUT_DIR = path.resolve(__dirname, '..', 'public', 'assets', 'uploads');
if(!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function safeBasename(name){ return name.replace(/[^a-zA-Z0-9-_.]/g, '_').slice(0,40); }

app.post('/upload', requireApiKey, upload.array('files'), async (req, res) => {
  try{
    const sizesQuery = (req.query.sizes || '320,640,1200').toString();
    const sizes = sizesQuery.split(',').map(s=> Number(s)).filter(Boolean);
    let files = req.files || [];
    // multer.array('files') yields an array; multer.fields may yield an object. Normalize to array.
    if(!Array.isArray(files)){
      files = Object.values(files).flat();
    }
    const hostBase = (req.headers.host) ? `${req.protocol}://${req.headers.host}` : '';
    const results = [];
    // ensure sizes sorted ascending
    sizes.sort((a,b)=> a-b);
    for(const f of files){
      const originalName = f.originalname || 'image';
      const ext = path.extname(originalName) || '.jpg';
      const base = path.basename(originalName, ext);
      const safeBase = safeBasename(base);
      const fileId = randomUUID();
      const urls = {};
      const generated = [];
      const isVideo = f.mimetype && f.mimetype.startsWith('video/');
      if(!isVideo){
        // image: generate resized variants
        for(const s of sizes){
          const outName = `${safeBase}-${fileId}-${s}${ext}`;
          const outPath = path.join(OUT_DIR, outName);
          try{
            await sharp(f.buffer).resize({ width: s }).toFile(outPath);
            const urlPath = `/assets/uploads/${outName}`;
            urls[s] = urlPath;
            generated.push({ size: s, url: urlPath });
          }catch(e){ console.error('sharp failed for', outPath, e); }
        }
      }
      // also write original (best-effort) for both images and videos
      const origOut = `${safeBase}-${fileId}-orig${ext}`;
      const origOutPath = path.join(OUT_DIR, origOut);
      try{ fs.writeFileSync(origOutPath, f.buffer); }catch(e){ console.error('write orig failed', e); }
      // If S3 enabled and client available, upload generated files to S3 and replace URLs
      if(S3_ENABLED && S3Client){
        try{
          const region = process.env.AWS_REGION;
          const bucket = process.env.UPLOAD_S3_BUCKET;
          const client = new S3Client({ region });
          // upload generated files (images) and original (both image/video)
          for(const g of generated){
            const localPath = path.join(OUT_DIR, path.basename(g.url));
            try{
              const body = fs.readFileSync(localPath);
              const key = `uploads/${path.basename(g.url)}`;
              const params = {
                Bucket: bucket,
                Key: key,
                Body: body,
                ContentType: f.mimetype || 'application/octet-stream',
                ACL: 'public-read'
              };
              await client.send(new PutObjectCommand(params));
              if(process.env.UPLOAD_CLOUDFRONT_HOST){
                g.url = `${process.env.UPLOAD_CLOUDFRONT_HOST.replace(/\/$/, '')}/${key}`;
              } else {
                g.url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
              }
            }catch(e){ console.error('S3 upload failed for', localPath, e); }
          }
          // upload original (always)
          try{
            const origBody = fs.readFileSync(origOutPath);
            const origKey = `uploads/${path.basename(origOut)}`;
            await client.send(new PutObjectCommand({ Bucket: process.env.UPLOAD_S3_BUCKET, Key: origKey, Body: origBody, ContentType: f.mimetype || 'application/octet-stream', ACL:'public-read' }));
            // Note: orig public URL will be returned below via originalUrl
          }catch(e){ console.error('S3 upload orig failed', e); }
          // replace urls map and originalUrl
          urls = {};
          generated.forEach(g=> { urls[g.size] = g.url; });
        }catch(e){ console.error('S3 handling failed', e); }
      }
      const fileRecord = { originalName, urls, generated, originalUrl: `/assets/uploads/${origOut}` };
      // build a srcset string for this file (e.g. '/assets/uploads/base-320.jpg 320w, ...')
      const srcset = generated.map(g=> `${g.url} ${g.size}w`).join(', ');
      fileRecord.srcset = srcset;
      results.push(fileRecord);
    }
    // If single file and sizes present, return coverSrcset for convenience
    const coverSrcset = results.length === 1 ? results[0].srcset : null;
    // pick a reasonable gallery url for each result: choose the largest generated size
    const galleryUrls = results.map(r=>{
      if(Array.isArray(r.generated) && r.generated.length){
        return r.generated[r.generated.length-1].url; // largest size
      }
      return r.originalUrl;
    });
    res.json({ ok: true, results, coverSrcset, galleryUrls });
  }catch(e){ console.error(e); res.status(500).json({ ok:false, error: String(e) }); }
});

// Presign endpoint: returns presigned PUT URLs for direct client upload to S3
app.post('/presign', requireApiKey, express.json(), async (req, res) => {
  try{
    if(!S3_ENABLED || !S3Client || !getSignedUrl){ return res.status(501).json({ ok:false, error: 'S3 not configured' }); }
    const { filename, sizes } = req.body || {};
    if(!filename) return res.status(400).json({ ok:false, error: 'filename required' });
    const ext = path.extname(filename) || '.jpg';
    const isVideo = /\.(mp4|webm)$/i.test(ext);
    const arrSizes = (!isVideo && Array.isArray(sizes) && sizes.length) ? sizes.map(Number).filter(Boolean) : (!isVideo ? [320,640,1200] : []);
    const base = path.basename(filename, ext);
    const safeBase = safeBasename(base);
    const fileId = randomUUID();
    const region = process.env.AWS_REGION;
    const bucket = process.env.UPLOAD_S3_BUCKET;
    const client = new S3Client({ region });
    const presigns = [];
    // for images: produce presigned PUTs for requested sizes (resize client-side). For videos: only produce orig presign.
    for(const s of arrSizes){
      const key = `uploads/${safeBase}-${fileId}-${s}${ext}`;
      const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: isVideo ? 'application/octet-stream' : 'image/*', ACL: 'public-read' });
      const signed = await getSignedUrl(client, cmd, { expiresIn: 60 * 60 });
      const publicUrl = process.env.UPLOAD_CLOUDFRONT_HOST ? `${process.env.UPLOAD_CLOUDFRONT_HOST.replace(/\/$/, '')}/${key}` : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
      presigns.push({ size: s, key, presignedUrl: signed, publicUrl });
    }
    // always create key for original
    const origKey = `uploads/${safeBase}-${fileId}-orig${ext}`;
    const origCmd = new PutObjectCommand({ Bucket: bucket, Key: origKey, ContentType: isVideo ? 'video/*' : 'application/octet-stream', ACL: 'public-read' });
    const origSigned = await getSignedUrl(client, origCmd, { expiresIn: 60 * 60 });
    const origPublicUrl = process.env.UPLOAD_CLOUDFRONT_HOST ? `${process.env.UPLOAD_CLOUDFRONT_HOST.replace(/\/$/, '')}/${origKey}` : `https://${bucket}.s3.${region}.amazonaws.com/${origKey}`;
    return res.json({ ok:true, presigns, orig: { key: origKey, presignedUrl: origSigned, publicUrl: origPublicUrl } });
  }catch(e){ console.error('presign error', e); return res.status(500).json({ ok:false, error: String(e) }); }
});

const port = process.env.PORT || 4000;
app.listen(port, ()=> console.log(`Upload server listening on http://localhost:${port}`));
