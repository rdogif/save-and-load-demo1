const chat = document.getElementById("chat");
const form = document.getElementById("messageForm");
const input = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const statusText = document.getElementById("statusText");

const history = [
  { role: "assistant", content: "ooo ooo hello" },
  { role: "assistant", content: "what u need smart human" }
];

let waiting = false;
let typingRow = null;

function scrollToBottom() {
  chat.scrollTop = chat.scrollHeight;
}

function addMessage(text, sender, extraClass = "") {
  const row = document.createElement("div");
  row.className = `message-row ${sender}`;

  if (sender === "monkey") {
    const avatar = document.createElement("div");
    avatar.className = "mini-avatar";
    avatar.textContent = "🐵";
    avatar.setAttribute("aria-hidden", "true");
    row.appendChild(avatar);
  }

  const bubble = document.createElement("div");
  bubble.className = `bubble ${sender === "user" ? "user-bubble" : "monkey-bubble"} ${extraClass}`.trim();
  bubble.textContent = text;
  row.appendChild(bubble);

  chat.appendChild(row);
  scrollToBottom();
  return row;
}

function showTyping() {
  removeTyping();

  typingRow = document.createElement("div");
  typingRow.className = "message-row monkey";

  const avatar = document.createElement("div");
  avatar.className = "mini-avatar";
  avatar.textContent = "🐵";
  avatar.setAttribute("aria-hidden", "true");

  const bubble = document.createElement("div");
  bubble.className = "bubble monkey-bubble typing-bubble";
  bubble.setAttribute("aria-label", "Monkey is typing");
  bubble.innerHTML = "<span></span><span></span><span></span>";

  typingRow.append(avatar, bubble);
  chat.appendChild(typingRow);
  statusText.textContent = "typing...";
  scrollToBottom();
}

function removeTyping() {
  if (typingRow) {
    typingRow.remove();
    typingRow = null;
  }
  statusText.textContent = "online";
}

function resizeInput() {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 112)}px`;
}

function setWaiting(value) {
  waiting = value;
  sendButton.disabled = value;
  input.disabled = value;
}

async function askMonkey(message) {
  const apiUrl = window.MONKEY_API_URL;

  if (!apiUrl || apiUrl.includes("PASTE_YOUR_WORKER_URL")) {
    throw new Error("Add your Cloudflare Worker URL inside config.js first.");
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message,
      history: history.slice(-16)
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  if (!Array.isArray(data.messages) || data.messages.length === 0) {
    throw new Error("Monkey forgot how to talk.");
  }

  return data.messages;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  const message = input.value.trim();
  if (!message || waiting) return;

  addMessage(message, "user");
  history.push({ role: "user", content: message });

  input.value = "";
  resizeInput();
  setWaiting(true);
  showTyping();

  try {
    const replies = await askMonkey(message);

    for (let i = 0; i < replies.length; i += 1) {
      await delay(i === 0 ? 600 : 500 + Math.min(replies[i].length * 16, 900));
      removeTyping();

      const reply = String(replies[i]).trim();
      if (!reply) continue;

      addMessage(reply, "monkey");
      history.push({ role: "assistant", content: reply });

      if (i < replies.length - 1) {
        await delay(200);
        showTyping();
      }
    }
  } catch (error) {
    removeTyping();
    addMessage(error.message || "Monkey broke something.", "monkey", "error-bubble");
  } finally {
    removeTyping();
    setWaiting(false);
    input.focus();
  }
});

input.addEventListener("input", resizeInput);

input.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

scrollToBottom();
input.focus();
