const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8081;

// ✅ 确保 uploads 目录存在
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ multer 配置
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    /*const id = uuidv4();
    const ext = path.extname(file.originalname); // 保留原始扩展名
    cb(null, `${id}${ext}`);*/
    cb(null, path.basename(file.originalname));
  }
});

// 支持的文件类型
const allowedMimeTypes = [
  // 图片
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // 文档
  'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  // 压缩包
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/gzip',
  // APK
  'application/vnd.android.package-archive',
  // 通用二进制
  'application/octet-stream'
];

const allowedExts = [
  '.zip', '.rar', '.7z',
  '.gz', '.tar', '.tgz', '.tar.gz',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.ppt', '.pptx', '.txt',
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  '.apk'
];


const upload = multer({
  storage,
  limits: { fileSize: 2000 * 1024 * 1024 }, // 最大 2000MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedMimeTypes.includes(file.mimetype)||allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`文件类型不允许: ${file.mimetype}`));
    }
  }
});


app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  req.setTimeout(0);
  res.setTimeout(0);
  next();
});


// ✅ 首页
app.get('/', (req, res) => {
  res.send(`
    <title>文件中转站</title>
    <h2>文件中转站</h2>
    <form action="/upload" method="post" enctype="multipart/form-data">
      <input type="file" name="file" required />
      <button type="submit">上传文件</button>
    </form>
    <a href="/files" class="btn">查看所有已上传文件</a>
  `);
});

// ✅ 上传接口
app.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).send(`❌ 上传失败: ${err.message}`);
    }

    const fileName = req.file.filename;
    const originalName = req.file.originalname;
    const url = `http://${req.headers.host}/download/${fileName}`;
    res.send(`
      <p>✅ 上传成功</p>
      <p>原始文件名：${originalName}</p>
      <p>下载链接：</p>
      <a href="${url}">${url}</a>
    `);
  });
});

// ✅ 下载接口
app.get('/download/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('❌ 文件不存在');
  }

  // 根据扩展名动态设置 MIME
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = {
    '.apk': 'application/vnd.android.package-archive',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.gz': 'application/gzip',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
  };

  const mimeType = mimeMap[ext] || 'application/octet-stream';

  res.download(filePath, req.params.filename, {
    headers: { 'Content-Type': mimeType }
  });
});

//查看文件列表接口
app.get('/files', (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            return res.status(500).send('无法读取上传目录');
        }

        let html = `
          <!DOCTYPE html>
          <html lang="zh-CN">
          <head>
            <meta charset="UTF-8">
            <title>文件中转站 - 文件列表</title>
            <style>
              body { font-family: "Segoe UI", sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; }
              h1 { color: #2c3e50; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { padding: 12px 15px; border: 1px solid #ddd; text-align: left; }
              th { background-color: #f4f6f9; color: #2c3e50; }
              tr:nth-child(even) { background-color: #f9f9f9; }
              tr:hover { background-color: #f1f5ff; }
              .filename { font-family: monospace; }
              .action a { color: #0066cc; text-decoration: none; }
              .action a:hover { text-decoration: underline; }
              .empty { color: #777; font-style: italic; }
              .back { margin-top: 30px; }
            </style>
          </head>
          <body>
            <h1>文件中转站 - 文件列表</h1>

            ${files.length === 0 ? 
              '<p class="empty">目前没有任何文件已被上传...</p>' : 
              `<table>
                  <thead>
                      <tr>
                          <th>文件名</th>
                          <th>下载链接</th>
                          <th>操作</th>
                      </tr>
                  </thead>
                  <tbody>
                  `}

                  ${files.map(file => {
                    const url = `/download/${encodeURIComponent(file)}`; // 防止特殊字符问题
                    const fullUrl = `http://${req.headers.host}${url}`;
                    return `
                      <tr>
                          <td class="filename">${file}</td>
                          <td><small>${fullUrl}</small></td>
                          <td class="action">
                              <a href="${url}" download>下载</a>
                          </td>
                      </tr>
                    `;
                  }).join('')}

              ${files.length > 0 ? '</tbody></table>' : ''}

              <div class="back">
                  <a href="/">← 返回上传页面</a>
              </div>
          </body>
          </html>`;

        res.send(html);
    });
});

// ✅ 启动服务器
const server=app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 文件中转站运行在 http://0.0.0.0:${PORT}`);
});


server.timeout = 0;
server.requestTimeout = 0;
server.headersTimeout = 0;
server.keepAliveTimeout = 0;