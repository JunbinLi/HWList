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
  <link rel="stylesheet" href="css/subfileStyle.css">
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
      indexHtml = `<!doctype html>
<html lang="en-US">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>2E HW List</title>
  <link rel="stylesheet" href="css/style.css">
  <meta name="description" content="">

  <meta property="og:title" content="">
  <meta property="og:type" content="">
  <meta property="og:url" content="">
  <meta property="og:image" content="">
  <meta property="og:image:alt" content="">

  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" href="/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="icon.png">

  <link rel="manifest" href="site.webmanifest">
  <meta name="theme-color" content="#fafafa">
</head>

<body>

  <!-- Add your site or application content here -->
  <script src="js/app.js"></script>
  <h1>2E HW List--Content Page</h1>
  <h4>The following are links to every week HW List</h4>
  <br>
  <div class="week-list" id="weekList">
    <!-- WEEK-LINKS -->
    <a href="week-2026-04-13.html">This week (0413-0419)</a>
  </div>

  <div class="timestamp">Last Update: <!-- TIMESTAMP --></div>



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

    // Extract all existing week links and sort them by date
    const weekLinkRegex = /<a href="(week-\d{4}-\d{2}-\d{2}\.html)"[^>]*>.*?<\/a>/gs;
    const links = [];
    let match;

    while ((match = weekLinkRegex.exec(indexHtml)) !== null) {
      links.push(match[0]);
    }

    // Add the new link to the array
    links.push(newLink);

    // Extract dates from filenames and sort links by date
    links.sort((a, b) => {
      const dateA = a.match(/week-(\d{4}-\d{2}-\d{2})/)[1];
      const dateB = b.match(/week-(\d{4}-\d{2}-\d{2})/)[1];
      return dateA.localeCompare(dateB);
    });

    // Reconstruct the week links section
    const sortedLinksHtml = links.join('\n');

    // Replace the entire week links section with the sorted version
    const weekListRegex = /(<div class="week-list"[^>]*>)\s*(?:.*?\n)*?\s*(<!-- WEEK-LINKS -->)/s;
    indexHtml = indexHtml.replace(weekListRegex, `$1\n    ${sortedLinksHtml}\n    $2`);

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
