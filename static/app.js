// -------- Elements --------
const chat = document.getElementById("chat");
const input = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

const profileModal = document.getElementById("profileModal");
const closeModal = document.getElementById("closeModal");
const editProfileBtn = document.getElementById("editProfileBtn");
const profileForm = document.getElementById("profileForm");

// -------- State --------
let profile = JSON.parse(localStorage.getItem("fitnessProfile") || "null");
let history = JSON.parse(localStorage.getItem("chatHistory") || "[]"); // {role: "user"|"assistant", content: string}

// -------- Modal functions --------
function showModal() {
  if (profile) {
    for (const [k, v] of Object.entries(profile)) {
      if (profileForm.elements[k]) profileForm.elements[k].value = v;
    }
  }
  profileModal.style.display = "flex";
}

function hideModal() {
  profileModal.style.display = "none";
}

// -------- Load on page start --------
window.addEventListener("load", () => {
  if (!profile) {
    showModal();
  }
  renderHistory();
  if (history.length === 0) greeting();
});

// -------- Chat UI helpers --------
function addMessage(content, role = "bot") {
  const wrap = document.createElement("div");
  wrap.className = `message ${role}`;
  wrap.innerText = content;
  chat.appendChild(wrap);
  chat.scrollTop = chat.scrollHeight;
}

function addTyping() {
  const wrap = document.createElement("div");
  wrap.className = "message bot";
  wrap.dataset.typing = "1";
  wrap.innerText = "…";
  chat.appendChild(wrap);
  chat.scrollTop = chat.scrollHeight;
  return wrap;
}

function removeTyping(node) {
  if (node && node.parentNode) node.parentNode.removeChild(node);
}

function renderHistory() {
  chat.innerHTML = ""; // Clear existing
  history.forEach(msg => addMessage(msg.content, msg.role === "user" ? "user" : "bot"));
}

// -------- Events: Modal --------
editProfileBtn.addEventListener("click", showModal);
closeModal.addEventListener("click", hideModal);

profileForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(profileForm).entries());
  data.age = Number(data.age || 0);
  data.weight = Number(data.weight || 0);
  data.height = Number(data.height || 0);
  data.activity = data.activity || "";
  data.goal = (data.goal || "").toLowerCase();
  data.diet = (data.diet || "").toLowerCase();
  data.allergies = (data.allergies || "").trim();

  profile = data;
  localStorage.setItem("fitnessProfile", JSON.stringify(profile));
  hideModal();
  addMessage("Profile saved! Ask for a diet/workout plan anytime, or just chat.", "bot");
  saveHistory();
});

// -------- Send message --------
sendBtn.addEventListener("click", onSend);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") onSend();
});

function onSend(intentHint = "") {
  const text = input.value.trim();
  if (!text && !intentHint) return;

  const userMessage = text || (
    intentHint === "variation" ? "next" :
    intentHint === "diet" ? "Please generate a personalized diet plan." :
    intentHint === "workout" ? "Please generate a personalized workout plan." :
    intentHint === "shopping" ? "Please generate a shopping list for this week's meals." : ""
  );

  addMessage(userMessage, "user");
  history.push({ role: "user", content: userMessage });
  saveHistory();
  input.value = "";

  const typing = addTyping();
  fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: userMessage,
      history,
      profile,
      intentHint
    })
  })
  .then(async (res) => {
    const json = await res.json();
    removeTyping(typing);
    const reply = json.reply || "Sorry, I had trouble replying.";
    addMessage(reply, "bot");
    history.push({ role: "assistant", content: reply });
    saveHistory();
  })
  .catch(err => {
    removeTyping(typing);
    addMessage(`Network error: ${err.message}`, "bot");
    history.push({ role: "assistant", content: `Network error: ${err.message}` });
    saveHistory();
  });
}

function saveHistory() {
  localStorage.setItem("chatHistory", JSON.stringify(history));
}

// -------- Suggestions chips --------
document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    const intent = chip.dataset.intent || "";
    if (!profile && (intent === "diet" || intent === "workout" || intent === "shopping" || intent === "variation")) {
      addMessage("Please complete your profile first (Edit Profile).", "bot");
      showModal();
      return;
    }
    onSend(intent);
  });
});

// -------- Greeting --------
function greeting() {
  addMessage(
    "Hi! I’m your fitness & diet buddy. " +
    "You can ask me anything, or use the chips below to get a personalized diet/workout plan. " +
    "Use “Edit Profile” to update your details anytime.",
    "bot"
  );
  history.push({ role: "assistant", content: "Hi! I’m your fitness & diet buddy. You can ask me anything, or use the chips below to get a personalized diet/workout plan. Use “Edit Profile” to update your details anytime." });
  saveHistory();
}
