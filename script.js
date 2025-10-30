// load saved events or start empty
let events = JSON.parse(localStorage.getItem("events")) || [];

// grab DOM elements
const addBtn = document.getElementById("add");
const avg7Btn = document.getElementById("avg-7");
const totalSpan = document.getElementById("total");
const todaySpan = document.getElementById("today");
const listPre = document.getElementById("list");
const avgValueSpan = document.getElementById("avg-value");
const chartCanvas = document.getElementById("chart");
const ctx = chartCanvas.getContext("2d");

// ---------- helpers ----------
function saveEvents() {
  localStorage.setItem("events", JSON.stringify(events));
}

function getDayKey(date) {
  // YYYY-MM-DD
  return date.toISOString().slice(0, 10);
}

function countToday() {
  const todayKey = getDayKey(new Date());
  return events.filter(ts => ts.startsWith(todayKey)).length;
}

function buildCountsByDay() {
  const counts = {};
  for (const ts of events) {
    const key = ts.slice(0, 10); // first 10 chars = date
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

// average over last n days including today
function averageLastNDays(n) {
  const countsByDay = buildCountsByDay();
  const now = new Date();
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = getDayKey(d);
    sum += countsByDay[key] || 0;
  }
  return sum / n;
}

// build array of counts per day since first event
function getCountsSinceStart() {
  if (events.length === 0) {
    return [];
  }

  // sort ISO strings = chronological
  const sorted = [...events].sort();
  const firstDate = new Date(sorted[0]);
  const lastDate = new Date(sorted[sorted.length - 1]);

  const firstMs = firstDate.getTime();
  const lastMs = lastDate.getTime();

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const totalDays = Math.floor((lastMs - firstMs) / MS_PER_DAY) + 1;

  const counts = new Array(totalDays).fill(0);

  for (const ts of sorted) {
    const d = new Date(ts);
    const diffDays = Math.floor((d.getTime() - firstMs) / MS_PER_DAY);
    counts[diffDays] += 1;
  }

  return counts;
}

// ---------- rendering ----------
function drawChart() {
  const counts = getCountsSinceStart();
  const w = chartCanvas.width;
  const h = chartCanvas.height;

  ctx.clearRect(0, 0, w, h);

  if (counts.length === 0) {
    ctx.fillStyle = "#000";
    ctx.fillText("no data yet", 10, 20);
    return;
  }

  // make cumulative
  const cumulative = [];
  let running = 0;
  for (const c of counts) {
    running += c;
    cumulative.push(running);
  }

  const maxVal = Math.max(...cumulative);

  const leftPad = 30;
  const bottomPad = 20;
  const topPad = 10;
  const rightPad = 10;

  const chartWidth = w - leftPad - rightPad;
  const chartHeight = h - topPad - bottomPad;

  const stepX = chartWidth / Math.max(cumulative.length - 1, 1);

  // axes
  ctx.strokeStyle = "#000";
  ctx.beginPath();
  ctx.moveTo(leftPad, topPad);
  ctx.lineTo(leftPad, h - bottomPad);
  ctx.lineTo(w - rightPad, h - bottomPad);
  ctx.stroke();

  // line
  ctx.strokeStyle = "#3f51b5";
  ctx.beginPath();
  for (let i = 0; i < cumulative.length; i++) {
    const val = cumulative[i];
    const x = leftPad + i * stepX;
    const y = h - bottomPad - (maxVal === 0 ? 0 : (val / maxVal) * chartHeight);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // points + x labels
  ctx.fillStyle = "#3f51b5";
  for (let i = 0; i < cumulative.length; i++) {
    const val = cumulative[i];
    const x = leftPad + i * stepX;
    const y = h - bottomPad - (maxVal === 0 ? 0 : (val / maxVal) * chartHeight);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();

    if (i % 5 === 0) {
      ctx.fillStyle = "#000";
      ctx.fillText(i.toString(), x - 3, h - 5);
      ctx.fillStyle = "#3f51b5";
    }
  }

  // y max label
  ctx.fillStyle = "#000";
  ctx.fillText(maxVal.toString(), 2, topPad + 10);
}

function render() {
  totalSpan.textContent = events.length;
  todaySpan.textContent = countToday();

  const countsByDay = buildCountsByDay();
  const sortedDays = Object.keys(countsByDay).sort().reverse(); // newest first
  const subset = sortedDays.slice(0, 20);

  let lines = "";
  for (const day of subset) {
    lines += `${day} => ${countsByDay[day]}\n`;
  }
  listPre.textContent = lines || "no data yet";

  drawChart();
}

// ---------- event handlers ----------
addBtn.addEventListener("click", () => {
  const now = new Date().toISOString();
  events.push(now);
  saveEvents();
  render();
});

avg7Btn.addEventListener("click", () => {
  const avg = averageLastNDays(7);
  avgValueSpan.textContent = avg.toFixed(2);
});

// first paint
render();
