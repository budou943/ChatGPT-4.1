// --- 状態管理用 ---
let sessions = [];
let currentSessionIdx = 0;
let apiKey = "";
let isSidebarOpen = false;
const DEFAULT_PROMPT = "あなたは親切な日本語のアシスタントです。";

function newSession(name) {
  return {
    name: name || "新しいチャット",
    history: [{ role: "system", content: DEFAULT_PROMPT }],
    model: "gpt-4.1"
  };
}

// --- ローカルストレージ保存＆復元 ---
function saveAll() {
  localStorage.setItem("g4u_sessions", JSON.stringify(sessions));
  localStorage.setItem("g4u_curidx", String(currentSessionIdx));
  localStorage.setItem("g4u_apikey", apiKey || "");
}

function loadAll() {
  try {
    sessions = JSON.parse(localStorage.getItem("g4u_sessions") || "[]");
    if (!Array.isArray(sessions) || sessions.length === 0) {
      sessions = [newSession("会話1")];
    }
    sessions.forEach(sess => {
      if (!Array.isArray(sess.history)) {
        sess.history = [{ role: "system", content: DEFAULT_PROMPT }];
      }
      sess.history.forEach(msg => {
        if (msg.role !== "assistant" && msg.model !== undefined) {
          delete msg.model;
        }
      });
      if (!sess.model) {
        sess.model = "gpt-4.1";
      }
    });
  } catch {
    sessions = [newSession("会話1")];
  }
  try {
    currentSessionIdx = Math.min(
      Math.max(0, Number(localStorage.getItem("g4u_curidx") || 0)),
      sessions.length - 1
    );
  } catch {
    currentSessionIdx = 0;
  }
  try {
    apiKey = localStorage.getItem("g4u_apikey") || "";
    if (apiKey) document.getElementById("apikeyInput").value = apiKey;
  } catch {}
}

// --- サイドバー開閉制御 ---
function openSidebar() {
  document.getElementById("sidebarOverlay").style.display = "block";
  document.getElementById("sidebar").classList.add("open");
  isSidebarOpen = true;
}
function closeSidebar() {
  document.getElementById("sidebarOverlay").style.display = "none";
  document.getElementById("sidebar").classList.remove("open");
  isSidebarOpen = false;
}
document.getElementById("sidebarOverlay").onclick = closeSidebar;
document.getElementById("closeSidebarBtn").onclick = closeSidebar;
document.getElementById("openSidebarBtn").onclick = openSidebar;
document.addEventListener("keydown", e => {
  if (isSidebarOpen && (e.key === "Escape" || e.code === "Escape")) {
    closeSidebar();
  }
});

// --- APIキー入力 ---
document.getElementById("apikeyInput").oninput = function() {
  apiKey = this.value.trim();
  saveAll();
};

// --- セッションリスト描画 & 操作 ---
function renderSessionList() {
  const pl = document.getElementById("sessionList");
  pl.innerHTML = "";
  sessions.forEach((sess, i) => {
    const row = document.createElement("div");
    row.className = "sessrow" + (i === currentSessionIdx ? " selected" : "");
    row.tabIndex = 0;
    row.onclick = () => { currentSessionIdx = i; saveAll(); renderAll(); closeSidebar(); };
    row.onkeydown = ev => { if (ev.key === "Enter") { currentSessionIdx = i; saveAll(); renderAll(); closeSidebar(); } };
    const sessionName = sess.name.trim() || `無題 ${i + 1}`;
    row.innerHTML = `
      <span class="sessname" title="${sessionName}">${sessionName}</span>
      <button title="削除" ${sessions.length <= 1 ? "disabled" : ""}>🗑</button>
    `;
    row.querySelector("button").onclick = ev => {
      ev.stopPropagation();
      if (sessions.length > 1 && confirm("このセッションを削除しますか？")) {
        sessions.splice(i, 1);
        if (currentSessionIdx >= sessions.length) {
          currentSessionIdx = sessions.length - 1;
        }
        saveAll();
        renderAll();
      }
    };
    pl.appendChild(row);
  });
}

// --- 新規セッション追加 ---
document.getElementById("newSessionBtn").onclick = function() {
  const base = "会話" + (sessions.length + 1);
  let name = prompt("新しいセッション名を入力:", base);
  if (name === null) return;
  name = name.trim() || base;
  sessions.push(newSession(name));
  currentSessionIdx = sessions.length - 1;
  saveAll();
  renderAll();
  closeSidebar();
};

// --- チャット描画 ---
function renderChat() {
  const sess = sessions[currentSessionIdx];
  const chat = document.getElementById("chat");
  chat.innerHTML = "";
  sess.history.filter(m => m.role !== "system").forEach(msg => {
    const div = document.createElement("div");
    div.className = "msg " + msg.role;
    if (msg.role === "assistant" && msg.model) {
      const span = document.createElement("span");
      span.className = "model-name";
      span.textContent = msg.model;
      div.appendChild(span);
    }
    if (msg.role === "assistant") {
      div.innerHTML += DOMPurify.sanitize(marked.parse(msg.content || ""));
    } else {
      div.textContent = msg.content;
    }
    chat.appendChild(div);
  });
  setTimeout(() => chat.scrollTo(0, chat.scrollHeight + 120), 30);
}

// --- 入力バー描画 ---
function renderInputBar() {
  const sess = sessions[currentSessionIdx];
  const sel = document.getElementById("modelSelect");
  sel.value = Array.from(sel.options).some(o => o.value === sess.model) ? sess.model : sel.options[0].value;
}

// --- 全体再描画 ---
function renderAll() {
  renderSessionList();
  renderChat();
  renderInputBar();
  document.title = "Chat - " + (sessions[currentSessionIdx].name.trim() || `無題 ${currentSessionIdx + 1}`);
}

// --- モデル選択変更 ---
document.getElementById("modelSelect").onchange = function() {
  sessions[currentSessionIdx].model = this.value;
  saveAll();
};

// --- メッセージ送信 & API 呼び出し ---
let sending = false;
async function sendMessage(msg) {
  if (sending) return;
  if (!apiKey) {
    alert("APIキーを入力してください。");
    openSidebar();
    return;
  }

  const sess = sessions[currentSessionIdx];
  sess.history.push({ role: "user", content: msg });
  renderChat();
  sending = true;

  // Thinking 表示
  const tdiv = document.createElement("div");
  tdiv.className = "msg assistant thinking";
  tdiv.innerText = "アシスタントが考えています...";
  document.getElementById("chat").appendChild(tdiv);
  tdiv.scrollIntoView();

  // モデルごとにエンドポイントとパラメータを切り替え
  const model = sess.model;
  let url, body;

  if (model.startsWith("o")) {
    // oシリーズ: Chat Completions API
    url = "https://api.openai.com/v1/chat/completions";
    body = {
      model: model,
      messages: sess.history,
      max_completion_tokens: 1024
    };
  } else {
    // GPTシリーズ: Chat Completions API
    url = "https://api.openai.com/v1/chat/completions";
    body = {
      model: model,
      messages: sess.history,
      max_tokens: 1024,
      temperature: 0.7
    };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    tdiv.remove();

    if (data.error) {
      sess.history.push({
        role: "assistant",
        content: "[APIエラー] " + data.error.message,
        model: model
      });
    } else {
      // レスポンス形式を吸収
      const reply = data.choices?.[0]?.message?.content
                  || data.choices?.[0]?.text
                  || "（無応答）";
      sess.history.push({ role: "assistant", content: reply, model: model });
    }
  } catch (e) {
    tdiv.remove();
    sess.history.push({ role: "assistant", content: "[通信エラー] " + e, model: model });
  } finally {
    saveAll();
    renderAll();
    sending = false;
  }
}

// --- チャットフォーム送信・textarea高さリセット ---
const msgInput = document.getElementById("msgInput");
const chatForm = document.getElementById("chatForm");

// textarea自動リサイズ (最大3行まで)
msgInput.addEventListener('input', function () {
  this.style.height = 'auto';
  const lineHeight = parseFloat(getComputedStyle(this).lineHeight);
  const maxLines = 3;
  this.style.height = Math.min(this.scrollHeight, lineHeight * maxLines) + 'px';
});

// Enterで送信（Shift+Enterで改行）
msgInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    document.getElementById("sendBtn").click();
  }
  // Shift+Enter → 改行
});

chatForm.onsubmit = function(e) {
  e.preventDefault();
  if (sending) return;
  const inp = msgInput;
  const text = inp.value.trim();
  if (!text) return;
  inp.value = "";
  inp.style.height = 'auto';
  sendMessage(text);
};

// --- セッション名ダブルクリック編集 ---
document.getElementById("sessionList").ondblclick = function(ev) {
  const row = ev.target.closest(".sessrow");
  if (!row || !ev.target.classList.contains("sessname")) return;
  const idx = [...this.children].indexOf(row);
  if (idx < 0) return;
  const current = sessions[idx].name.trim() || `無題 ${idx+1}`;
  const name = prompt("セッション名を変更:", current);
  if (name !== null) {
    sessions[idx].name = name.trim() || `無題 ${idx+1}`;
    saveAll();
    renderAll();
  }
};

// --- モバイル時ビューポート調整 ---
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", () => {
    setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 130);
  });
}

// 初期化
loadAll();
renderAll();