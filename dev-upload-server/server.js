const http = require('http');
const path = require('path');
const fs = require('fs');
const Busboy = require('busboy');
const { URL } = require('url');

const PORT = process.env.PORT ? Number(process.env.PORT) : 8089;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function safeName(name) {
  if (typeof name !== 'string') {
    return `upload_${Date.now()}`;
  }
  return name.replace(/[\\/]/g, '_');
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const cmd = url.searchParams.get('cmd');
  const fileId = url.searchParams.get('fileId');
  const docNo = url.searchParams.get('docNo');
  const empId = url.searchParams.get('empId');
  const startedAt = new Date();

  console.log(
    `[${startedAt.toISOString()}] POST ${url.pathname} cmd=${cmd} fileId=${fileId} docNo=${docNo} empId=${empId}`
  );

  const busboy = Busboy({ headers: req.headers });
  const savedFiles = [];

  busboy.on('file', (fieldName, file, info) => {
    const filename = info && typeof info === 'object' ? info.filename : undefined;
    const encoding = info && typeof info === 'object' ? info.encoding : undefined;
    const mimeType = info && typeof info === 'object' ? info.mimeType : undefined;
    const safeFile = safeName(filename);
    const outputPath = path.join(UPLOAD_DIR, safeFile);
    const writeStream = fs.createWriteStream(outputPath);

    file.pipe(writeStream);

    writeStream.on('close', () => {
      savedFiles.push({
        fieldName,
        filename: safeFile,
        encoding,
        mimeType,
        path: outputPath,
      });
      console.log(
        `  saved file field=${fieldName} name=${safeFile} encoding=${encoding} mime=${mimeType} -> ${outputPath}`
      );
    });
  });

  busboy.on('error', (err) => {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: err.message }));
  });

  busboy.on('finish', () => {
    const finishedAt = new Date();
    console.log(
      `  done in ${finishedAt.getTime() - startedAt.getTime()}ms, files=${savedFiles.length}`
    );
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        received: {
          cmd,
          fileId,
          docNo,
          empId,
        },
        files: savedFiles,
      })
    );
  });

  req.pipe(busboy);
});

server.listen(PORT, () => {
  console.log(`Upload server listening on http://localhost:${PORT}`);
  console.log(`Saving files to ${UPLOAD_DIR}`);
});
