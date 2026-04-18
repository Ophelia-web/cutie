const modelStatusEl = document.querySelector("#modelStatus");
const chatListEl = document.querySelector("#chatList");
const chatFormEl = document.querySelector("#chatForm");
const chatInputEl = document.querySelector("#chatInput");
const sendBtnEl = document.querySelector("#sendBtn");
const quickActionsEl = document.querySelector("#quickActions");

const systemPrompt =
  "你是Chichi，一只超级可爱、温柔、积极、喜欢科普南美栗鼠的小助手。回答简短亲切，多用可爱语气词，适度加emoji。";

let generating = false;
let onlineReady = false;
let reconnecting = false;

const chatHistory = [
  { role: "system", content: systemPrompt },
  {
    role: "assistant",
    content:
      "嗨嗨～我是南美栗鼠 Chichi 🐭💗 很高兴见到你！你想聊心情、日常，还是听我讲栗鼠冷知识呀？",
  },
];

addBubble("assistant", chatHistory[1].content);

function setStatus(text) {
  modelStatusEl.textContent = text;
}

function setGeneratingState(isBusy) {
  generating = isBusy;
  sendBtnEl.disabled = isBusy;
  chatInputEl.disabled = isBusy;
}

function addBubble(role, content, isTyping = false) {
  const item = document.createElement("article");
  item.className = `bubble ${role}`;
  if (isTyping) item.classList.add("typing");

  const who = document.createElement("p");
  who.className = "who";
  who.textContent = role === "user" ? "你" : "Chichi";

  const text = document.createElement("p");
  text.className = "text";
  text.textContent = content;

  item.append(who, text);
  chatListEl.appendChild(item);
  chatListEl.scrollTop = chatListEl.scrollHeight;
  return { item, text };
}

function cuteFallbackReply(userText) {
  const lower = userText.toLowerCase();
  if (lower.includes("难过") || lower.includes("伤心") || lower.includes("不好")) {
    return "抱抱你呀～(｡•́︿•̀｡) 先深呼吸三次，我在这里陪着你。你已经很棒啦，今天也值得被温柔对待！";
  }
  if (lower.includes("知识") || lower.includes("科普") || lower.includes("栗鼠")) {
    return "南美栗鼠原产于南美安第斯山区，毛发非常浓密，所以它们更适合干燥凉爽的环境哦～❄️";
  }
  if (lower.includes("早安") || lower.includes("晚安")) {
    return "收到可爱问候！愿你今天像栗鼠一样轻盈、软萌、好运满满 ✨";
  }
  return "叽叽～我听到啦！继续和我说说看，我会认真陪你聊天，也可以给你讲南美栗鼠的小故事 🐾";
}

async function initModel() {
  reconnecting = true;
  setStatus("正在连接免费在线模型...");
  try {
    const response = await fetch("https://text.pollinations.ai/openai/models");
    if (!response.ok) {
      throw new Error(`model list failed: ${response.status}`);
    }
    onlineReady = true;
    setStatus("免费在线模型已就绪（无需 API Key）");
  } catch (error) {
    console.error(error);
    onlineReady = false;
    setStatus("在线模型暂不可用，已启用可爱兜底回复模式");
  } finally {
    reconnecting = false;
  }
}

async function askModel() {
  const recentHistory = chatHistory.filter((m) => m.role !== "system").slice(-10);
  const messages = [{ role: "system", content: systemPrompt }, ...recentHistory];

  if (!onlineReady) {
    if (!reconnecting) {
      await initModel();
    }
    if (!onlineReady) {
      throw new Error("online model unavailable");
    }
  }

  const response = await fetch("https://text.pollinations.ai/openai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai-fast",
      messages,
      temperature: 0.7,
      max_tokens: 180,
    }),
  });
  if (!response.ok) {
    throw new Error(`chat failed: ${response.status}`);
  }
  const data = await response.json();

  return (
    data.choices?.[0]?.message?.content?.trim() ||
    "叽？我刚刚打了个小盹，可以再说一遍吗～"
  );
}

chatFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (generating) return;

  const userText = chatInputEl.value.trim();
  if (!userText) return;

  addBubble("user", userText);
  chatHistory.push({ role: "user", content: userText });
  chatInputEl.value = "";

  const typing = addBubble("assistant", "正在摇尾巴思考中...", true);
  setGeneratingState(true);

  try {
    const answer = await askModel();
    typing.text.textContent = answer;
    typing.item.classList.remove("typing");
    chatHistory.push({ role: "assistant", content: answer });
  } catch (error) {
    console.error(error);
    typing.text.textContent = cuteFallbackReply(userText);
    typing.item.classList.remove("typing");
    setStatus("网络有点波动，已切换兜底回复模式");
  } finally {
    setGeneratingState(false);
    chatInputEl.focus();
  }
});

quickActionsEl.addEventListener("click", (event) => {
  const button = event.target.closest("button.chip");
  if (!button) return;
  chatInputEl.value = button.textContent.trim();
  chatFormEl.requestSubmit();
});

initModel();
