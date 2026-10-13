/* ==========================================================
   ChatApp — WhatsApp Web style demo
   Features: chat list, search, unread filter, send/receive,
   delivery ticks, typing indicator + auto replies, emoji picker,
   new chat, clear chat, dark mode, localStorage persistence,
   responsive (mobile back navigation).
   ========================================================== */

const STORAGE_KEY = 'chatapp.v1';
const THEME_KEY = 'chatapp.theme';

const COLORS = ['#e17076', '#7bc862', '#e5ca77', '#65aadd', '#a695e7', '#ee7aae', '#6ec9cb', '#faa774'];
const EMOJIS = ('😀 😁 😂 🤣 😊 😍 😘 😎 🤔 😅 😢 😭 😡 👍 👎 🙏 👏 🙌 💪 🔥 ✨ 🎉 ❤️ 💔 😴 🤝 👀 🚀 💻 ☕ 🍕 🎂 ✅ ❌ 💯 🙂 😉 🥳 😇').split(' ');

const REPLIES = [
  'Haha, nice! 😄', 'Okay, sounds good 👍', 'Let me check and get back to you.',
  'Sure, no problem!', 'Can we talk about it tomorrow?', 'Really? Tell me more 👀',
  'I was just thinking the same.', 'Thanks for letting me know 🙏', 'On my way!',
  'That works for me.', 'Send me the details please.', '😂😂😂', 'Great job! 🔥',
];

/* ---------- State ---------- */
let chats = [];
let activeId = null;
let filter = 'all';
let query = '';
let typingTimers = {};

/* ---------- DOM ---------- */
const $ = (id) => document.getElementById(id);
const el = {
  sidebar: $('sidebar'), chatPane: $('chatPane'), chatList: $('chatList'),
  search: $('searchInput'), emptyState: $('emptyState'), chatView: $('chatView'),
  chatName: $('chatName'), chatStatus: $('chatStatus'), chatAvatar: $('chatAvatar'),
  messages: $('messages'), input: $('msgInput'), sendBtn: $('sendBtn'),
  emojiBtn: $('emojiBtn'), emojiPanel: $('emojiPanel'), backBtn: $('backBtn'),
  clearBtn: $('clearBtn'), themeBtn: $('themeBtn'), themeIcon: $('themeIcon'),
  newChatBtn: $('newChatBtn'), modal: $('modal'), newName: $('newName'),
  cancelNew: $('cancelNew'), createNew: $('createNew'),
};

/* ---------- Helpers ---------- */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const initials = (name) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const colorFor = (name) => COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const escapeHTML = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const timeStr = (ts) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

function dayLabel(ts) {
  const d = new Date(ts), now = new Date();
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

function listTime(ts) {
  const label = dayLabel(ts);
  return label === 'Today' ? timeStr(ts) : label === 'Yesterday' ? 'Yesterday' : new Date(ts).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
}

const tickSVG = (status) => {
  const cls = status === 'read' ? 'tick-read' : '';
  if (status === 'sent') {
    return `<svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 8.5l3 3 7-7"/></svg>`;
  }
  return `<svg class="h-4 w-4 ${cls}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M1 8.5l3 3 7-7M6.5 10.5l1 1 7-7"/></svg>`;
};

/* ---------- Storage ---------- */
function seedChats() {
  const now = Date.now(), min = 60000, hr = 3600000, day = 86400000;
  return [
    { id: uid(), name: 'Qayum', unread: 2, online: true, messages: [
      { id: uid(), from: 'me', text: 'Did you finish the Docker assignment?', ts: now - day - hr, status: 'read' },
      { id: uid(), from: 'them', text: 'Almost! Stuck on the multi-stage build 😅', ts: now - 40 * min, status: 'read' },
      { id: uid(), from: 'them', text: 'Can you help me later?', ts: now - 38 * min, status: 'read' },
    ]},
    { id: uid(), name: 'DevOps Batch 🚀', unread: 0, online: false, messages: [
      { id: uid(), from: 'them', text: 'Reminder: Jenkins pipeline demo at 11 AM tomorrow.', ts: now - 3 * hr, status: 'read' },
      { id: uid(), from: 'me', text: 'Noted, thanks!', ts: now - 2 * hr, status: 'read' },
    ]},
    { id: uid(), name: 'Mom ❤️', unread: 0, online: false, messages: [
      { id: uid(), from: 'them', text: 'Have you had dinner?', ts: now - 5 * hr, status: 'read' },
      { id: uid(), from: 'me', text: 'Yes, just finished ❤️', ts: now - 5 * hr + 2 * min, status: 'read' },
    ]},
    { id: uid(), name: 'DAD ❤️', unread: 1, online: true, messages: [
      { id: uid(), from: 'them', text: 'Bro, check this Kubernetes cheat sheet 🔥', ts: now - 2 * day, status: 'read' },
    ]},
    { id: uid(), name: 'Abdul', unread: 0, online: false, messages: [
      { id: uid(), from: 'me', text: 'See you at the lab tomorrow.', ts: now - 3 * day, status: 'read' },
    ]},
  ];
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    chats = raw ? JSON.parse(raw) : seedChats();
  } catch { chats = seedChats(); }
}
const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(chats)); } catch {} };
const getChat = (id) => chats.find((c) => c.id === id);
const lastMsg = (c) => c.messages[c.messages.length - 1];

/* ---------- Rendering: chat list ---------- */
function renderList() {
  const q = query.trim().toLowerCase();
  const items = chats
    .filter((c) => (filter === 'unread' ? c.unread > 0 : true))
    .filter((c) => c.name.toLowerCase().includes(q) || c.messages.some((m) => q && m.text.toLowerCase().includes(q)))
    .sort((a, b) => (lastMsg(b)?.ts || 0) - (lastMsg(a)?.ts || 0));

  if (!items.length) {
    el.chatList.innerHTML = `<li class="p-8 text-center text-sm text-slate-500">No chats found</li>`;
    return;
  }

  el.chatList.innerHTML = items.map((c) => {
    const m = lastMsg(c);
    const preview = m ? (m.from === 'me' ? 'You: ' : '') + escapeHTML(m.text) : 'No messages yet';
    return `
      <li class="chat-item ${c.id === activeId ? 'active' : ''}" data-id="${c.id}">
        <div class="relative">
          <div class="avatar h-12 w-12" style="background:${colorFor(c.name)}">${escapeHTML(initials(c.name))}</div>
          ${c.online ? '<span class="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-wa-panel bg-wa-green"></span>' : ''}
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-2">
            <h3 class="truncate font-medium">${escapeHTML(c.name)}</h3>
            <span class="shrink-0 text-xs ${c.unread ? 'text-wa-green font-medium' : 'text-slate-500'}">${m ? listTime(m.ts) : ''}</span>
          </div>
          <div class="flex items-center justify-between gap-2">
            <p class="truncate text-sm text-slate-500 dark:text-slate-400">${preview}</p>
            ${c.unread ? `<span class="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-wa-green px-1.5 text-xs font-semibold text-white">${c.unread}</span>` : ''}
          </div>
        </div>
      </li>`;
  }).join('');
}

/* ---------- Rendering: messages ---------- */
function renderMessages(scroll = true) {
  const chat = getChat(activeId);
  if (!chat) return;

  let html = '', lastDay = '';
  chat.messages.forEach((m) => {
    const day = dayLabel(m.ts);
    if (day !== lastDay) { html += `<div class="day-chip">${day}</div>`; lastDay = day; }
    const out = m.from === 'me';
    html += `
      <div class="mb-1 flex ${out ? 'justify-end' : 'justify-start'}">
        <div class="bubble ${out ? 'out' : 'in'}">
          ${escapeHTML(m.text)}
          <span class="meta">${timeStr(m.ts)}${out ? tickSVG(m.status) : ''}</span>
        </div>
      </div>`;
  });

  if (typingTimers[chat.id]) {
    html += `<div class="mb-1 flex justify-start"><div class="bubble in"><span class="typing-dots"><span></span><span></span><span></span></span></div></div>`;
  }

  el.messages.innerHTML = html;
  if (scroll) el.messages.scrollTop = el.messages.scrollHeight;
}

function renderHeader() {
  const chat = getChat(activeId);
  if (!chat) return;
  el.chatName.textContent = chat.name;
  el.chatAvatar.textContent = initials(chat.name);
  el.chatAvatar.style.background = colorFor(chat.name);
  el.chatStatus.textContent = typingTimers[chat.id] ? 'typing…' : chat.online ? 'online' : 'last seen recently';
}

/* ---------- Actions ---------- */
function openChat(id) {
  activeId = id;
  const chat = getChat(id);
  chat.unread = 0;
  save();

  el.emptyState.classList.add('hidden');
  el.chatView.classList.remove('hidden');
  // Mobile: show chat pane, hide sidebar
  el.sidebar.classList.add('max-md:hidden');
  el.chatPane.classList.remove('max-md:hidden');

  renderHeader();
  renderMessages();
  renderList();
  el.input.focus();
}

function closeChat() {
  activeId = null;
  el.chatView.classList.add('hidden');
  el.emptyState.classList.remove('hidden');
  el.sidebar.classList.remove('max-md:hidden');
  el.chatPane.classList.add('max-md:hidden');
  renderList();
}

function sendMessage() {
  const text = el.input.value.trim();
  if (!text || !activeId) return;
  const chat = getChat(activeId);
  const msg = { id: uid(), from: 'me', text, ts: Date.now(), status: 'sent' };
  chat.messages.push(msg);
  el.input.value = '';
  autoGrow();
  hideEmoji();
  save();
  renderMessages();
  renderList();

  // Simulated delivery → read → reply
  setTimeout(() => updateStatus(chat.id, msg.id, 'delivered'), 600);
  setTimeout(() => updateStatus(chat.id, msg.id, 'read'), 1600);
  simulateReply(chat.id);
}

function updateStatus(chatId, msgId, status) {
  const chat = getChat(chatId);
  const m = chat?.messages.find((x) => x.id === msgId);
  if (!m) return;
  m.status = status;
  save();
  if (activeId === chatId) renderMessages(false);
}

function simulateReply(chatId) {
  const chat = getChat(chatId);
  if (typingTimers[chatId]) return;
  chat.online = true;

  setTimeout(() => {
    typingTimers[chatId] = true;
    if (activeId === chatId) { renderHeader(); renderMessages(); }

    setTimeout(() => {
      delete typingTimers[chatId];
      chat.messages.push({
        id: uid(), from: 'them',
        text: REPLIES[Math.floor(Math.random() * REPLIES.length)],
        ts: Date.now(), status: 'read',
      });
      if (activeId === chatId) { renderHeader(); renderMessages(); }
      else chat.unread += 1;
      save();
      renderList();
    }, 1400 + Math.random() * 1200);
  }, 1800);
}

function createChat() {
  const name = el.newName.value.trim();
  if (!name) return;
  const chat = { id: uid(), name, unread: 0, online: false, messages: [] };
  chats.unshift(chat);
  save();
  closeModal();
  openChat(chat.id);
}

function clearChat() {
  const chat = getChat(activeId);
  if (!chat || !confirm(`Clear all messages with ${chat.name}?`)) return;
  chat.messages = [];
  save();
  renderMessages();
  renderList();
}

/* ---------- UI helpers ---------- */
function autoGrow() {
  el.input.style.height = 'auto';
  el.input.style.height = Math.min(el.input.scrollHeight, 112) + 'px';
}
const hideEmoji = () => el.emojiPanel.classList.add('hidden');
function openModal() { el.modal.classList.remove('hidden'); el.newName.value = ''; el.newName.focus(); }
function closeModal() { el.modal.classList.add('hidden'); }

function buildEmojiPanel() {
  el.emojiPanel.innerHTML = EMOJIS.map((e) => `<button type="button" class="emoji-btn" data-emoji="${e}">${e}</button>`).join('');
}

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  el.themeIcon.innerHTML = theme === 'dark'
    ? '<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.36 6.36l-.7-.7M6.34 6.34l-.7-.7m12.72 0l-.7.7M6.34 17.66l-.7.7M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>'
    : '<path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>';
  try { localStorage.setItem(THEME_KEY, theme); } catch {}
}

/* ---------- Events ---------- */
el.chatList.addEventListener('click', (e) => {
  const item = e.target.closest('.chat-item');
  if (item) openChat(item.dataset.id);
});

el.search.addEventListener('input', (e) => { query = e.target.value; renderList(); });

document.querySelectorAll('.filter-chip').forEach((btn) => {
  btn.addEventListener('click', () => {
    filter = btn.dataset.filter;
    document.querySelectorAll('.filter-chip').forEach((b) => b.classList.toggle('active', b === btn));
    renderList();
  });
});

el.sendBtn.addEventListener('click', sendMessage);
el.input.addEventListener('input', autoGrow);
el.input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

el.emojiBtn.addEventListener('click', () => el.emojiPanel.classList.toggle('hidden'));
el.emojiPanel.addEventListener('click', (e) => {
  const b = e.target.closest('[data-emoji]');
  if (!b) return;
  el.input.value += b.dataset.emoji;
  el.input.focus();
  autoGrow();
});

el.backBtn.addEventListener('click', closeChat);
el.clearBtn.addEventListener('click', clearChat);
el.themeBtn.addEventListener('click', () => applyTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark'));

el.newChatBtn.addEventListener('click', openModal);
el.cancelNew.addEventListener('click', closeModal);
el.createNew.addEventListener('click', createChat);
el.newName.addEventListener('keydown', (e) => { if (e.key === 'Enter') createChat(); });
el.modal.addEventListener('click', (e) => { if (e.target === el.modal) closeModal(); });

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeModal(); hideEmoji(); if (activeId && window.innerWidth < 768) closeChat(); }
});

/* ---------- Init ---------- */
(function init() {
  let theme = 'dark';
  try { theme = localStorage.getItem(THEME_KEY) || 'dark'; } catch {}
  applyTheme(theme);
  load();
  buildEmojiPanel();
  renderList();
})();