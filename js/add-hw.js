const fs = require('fs');
const path = require('path');

const content = process.env.INPUT_CONTENT;
const deadline = process.env.INPUT_DEADLINE;

// 计算该日期所在周的周一
const dueDate = new Date(deadline);
const dayOfWeek = dueDate.getDay(); // 0=周日, 1=周一...
const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

const weekMonday = new Date(dueDate);
weekMonday.setDate(dueDate.getDate() + diffToMonday);

const weekFileName = `week-${weekMonday.toISOString().split('T')[0]}.html`;
const filePath = path.join(process.cwd(), weekFileName);

// 计算周日
const weekSunday = new Date(weekMonday);
weekSunday.setDate(weekMonday.getDate() + 6);

const weekLabel = `${weekMonday.toISOString().split('T')[0]} - ${weekSunday.toISOString().split('T')[0]}`;

// HTML 模板
function createTemplate(weekLabel) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>2E HW List</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f7fa;
    }
    h1 {
      color: #2d3436;
      text-align: center;
      margin-bottom: 10px;
    }
    .week-range {
      text-align: center;
      color: #636e72;
      font-size: 1.1em;
      margin-bottom: 30px;
    }
    .date-group {
      background: white;
      margin: 20px 0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .date-header {
      background: #0078d4;
      color: white;
      padding: 12px 20px;
      font-weight: 600;
      font-size: 1.1em;
    }
    .task-list {
      padding: 10px 20px;
    }
    .task-card {
      border-left: 4px solid #0078d4;
      background: #f8f9fa;
      padding: 14px 18px;
      margin: 12px 0;
      border-radius: 0 8px 8px 0;
    }
    .task-content {
      font-size: 1.05em;
      color: #2d3436;
      line-height: 1.5;
    }
    .task-time {
      color: #b2bec3;
      font-size: 0.8em;
      margin-top: 6px;
    }
    .back-link {
      text-align: center;
      margin-top: 40px;
    }
    .back-link a {
      color: #0078d4;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <h1>📅 2E HW List</h1>
  <div class="week-range">${weekLabel}</div>

  <!-- DATE-GROUPS -->

  <div class="back-link">
    <a href="index.html">← Return to content page</a>
  </div>
</body>
</html>`;
}

// 读取或创建文件
let html;
if (fs.existsSync(filePath)) {
  html = fs.readFileSync(filePath, 'utf8');
} else {
  html = createTemplate(weekLabel);
}

const now = new Date().toLocaleString('zh-CN', {
  timeZone: 'Asia/Shanghai', year: 'numeric' ,month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
});

// 检查日期分组是否存在
const dateMarker = `<!-- DATE-${deadline} -->`;
const taskCard = `
      <div class="task-card">
        <div class="task-content">${content}</div>
        <div class="task-time"> Added on ${now}</div>
      </div>`;

if (html.includes(dateMarker)) {
  // 已存在该日期，直接添加
  html = html.replace(dateMarker, taskCard + '\n      ' + dateMarker);
} else {
  // 创建新日期分组
  const newDateGroup = `
    <div class="date-group">
      <div class="date-header">📆 ${deadline}</div>
      <div class="task-list">
        ${taskCard}
        <!-- DATE-${deadline} -->
      </div>
    </div>`;

  // 提取所有日期并排序
  const dateRegex = /<!-- DATE-(\d{4}-\d{2}-\d{2}) -->/g;
  const dates = [];
  let m;
  while ((m = dateRegex.exec(html)) !== null) dates.push(m[1]);

  if (dates.length === 0) {
    // 第一个日期
    html = html.replace('<!-- DATE-GROUPS -->', newDateGroup + '\n    <!-- DATE-GROUPS -->');
  } else {
    dates.push(deadline);
    dates.sort();
    const pos = dates.indexOf(deadline);

    if (pos === 0) {
      // 插到最前面
      html = html.replace('<!-- DATE-GROUPS -->', newDateGroup + '\n    <!-- DATE-GROUPS -->');
    } else {
      // 插到前一个日期后面
      const prevDate = dates[pos - 1];
      const prevMarker = `<!-- DATE-${prevDate} -->`;
      const idx = html.indexOf(prevMarker);
      const after = html.slice(idx);
      const endMatch = after.match(/(\s*<\/div>\s*<\/div>)/);
      if (endMatch) {
        const insertAt = idx + endMatch.index + endMatch[0].length;
        html = html.slice(0, insertAt) + '\n' + newDateGroup + html.slice(insertAt);
      } else {
        html = html.replace(prevMarker, prevMarker + newDateGroup);
      }
    }
  }
}

fs.writeFileSync(filePath, html);
console.log(`Added to ${weekFileName}: ${content}`);

function updateIndex() {
  try {
    const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
    const indexPath = path.join(workspace, 'index.html');

    console.log('Workspace:', workspace);
    console.log('Index path:', indexPath);
    console.log('Week file:', weekFileName);

    let indexHtml;
    if (!fs.existsSync(indexPath)) {
      console.log('index.html not found, creating...');
      indexHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>备忘录总览</title>
<style>
body{font-family:system-ui;max-width:800px;margin:0 auto;padding:40px 20px;background:#f5f7fa}
h1{text-align:center;color:#2d3436}
.week-list{display:flex;flex-direction:column;gap:16px}
.week-link{background:white;padding:24px;border-radius:16px;text-decoration:none;color:#2d3436;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 8px rgba(0,0,0,0.08)}
.week-dates{font-size:1.2em;font-weight:600;color:#0078d4}
.timestamp{text-align:center;color:#b2bec3;font-size:0.8em;margin-top:40px}
</style>
</head>
<body>
<h1>📋 备忘录总览</h1>
<div class="week-list" id="weekList">
<!-- WEEK-LINKS -->
</div>
<div class="timestamp">最后更新: <!-- TIMESTAMP --></div>
</body>
</html>`;
      fs.writeFileSync(indexPath, indexHtml);
      console.log('Created index.html');
    } else {
      indexHtml = fs.readFileSync(indexPath, 'utf8');
      console.log('Read existing index.html');
    }

    if (!indexHtml.includes('<!-- WEEK-LINKS -->')) {
      console.log('ERROR: WEEK-LINKS marker not found!');
      return;
    }

    if (indexHtml.includes(`href="${weekFileName}"`)) {
      console.log('Link already exists');
      return;
    }

    const weekStart = weekMonday.toISOString().split('T')[0].replace(/-/g, '/');
    const weekEnd = weekSunday.toISOString().split('T')[0].replace(/-/g, '/');

    const newLink = `<a href="${weekFileName}" class="week-link"><div class="week-dates">${weekStart} - ${weekEnd}</div><div>→</div></a>`;

    indexHtml = indexHtml.replace('<!-- WEEK-LINKS -->', newLink + '\n<!-- WEEK-LINKS -->');

    const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    indexHtml = indexHtml.replace(/<!-- TIMESTAMP -->/, timestamp);

    fs.writeFileSync(indexPath, indexHtml);
    console.log('Updated index.html successfully');
  } catch (err) {
    console.error('updateIndex error:', err);
  }
}


// 执行更新
updateIndex();
