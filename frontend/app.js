// ══════════════════════════════════════════════════
// Shift Log — Chat Frontend Logic
// ══════════════════════════════════════════════════

const API_URL = '/api/chat';
const messagesContainer = document.getElementById('messages');
const chatContainer = document.getElementById('chat-container');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const ghostInput = document.getElementById('ghost-input');
const sendBtn = document.getElementById('send-btn');

// ── Helpers ──────────────────────────────────────

function scrollToBottom() {
    requestAnimationFrame(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    });
}

function formatMarkdown(text) {
    // Bold: **text**
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Inline code: `text`
    text = text.replace(/`(.*?)`/g, '<code>$1</code>');
    // Line breaks
    text = text.replace(/\n/g, '<br>');
    return text;
}

function createMessageElement(content, isUser = false) {
    const msg = document.createElement('div');
    msg.className = `message ${isUser ? 'user-message' : 'bot-message'}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    if (isUser) {
        avatar.textContent = '👤';
    } else {
        avatar.classList.add('is-bot');
        avatar.innerHTML = '<img src="/static/logo.png" class="bot-avatar-img">';
    }

    const bubble = document.createElement('div');
    bubble.className = 'message-content';
    bubble.innerHTML = `<p>${formatMarkdown(content)}</p>`;

    msg.appendChild(avatar);
    msg.appendChild(bubble);

    return msg;
}

function showTypingIndicator() {
    const msg = document.createElement('div');
    msg.className = 'message bot-message';
    msg.id = 'typing-msg';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar is-bot';
    avatar.innerHTML = '<img src="/static/logo.png" class="bot-avatar-img">';

    const bubble = document.createElement('div');
    bubble.className = 'message-content';
    bubble.innerHTML = `
        <div class="typing-indicator">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
        </div>
    `;

    msg.appendChild(avatar);
    msg.appendChild(bubble);
    messagesContainer.appendChild(msg);
    scrollToBottom();
}

function removeTypingIndicator() {
    const typing = document.getElementById('typing-msg');
    if (typing) typing.remove();
}

function setLoading(loading) {
    sendBtn.disabled = loading;
    messageInput.disabled = loading;
    if (!loading) {
        messageInput.focus();
    }
}

// ── Chat Logic ───────────────────────────────────

async function sendMessage(text) {
    // Add user message to chat
    const userMsg = createMessageElement(text, true);
    messagesContainer.appendChild(userMsg);
    scrollToBottom();

    // Show typing indicator
    setLoading(true);
    showTypingIndicator();

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });

        removeTypingIndicator();

        if (!response.ok) {
            throw new Error(`Error ${response.status}`);
        }

        const data = await response.json();

        // Add bot response to chat
        const botMsg = createMessageElement(data.response);
        messagesContainer.appendChild(botMsg);

    } catch (error) {
        removeTypingIndicator();

        let errorText = '⚠️ No se pudo conectar con el servidor.';
        if (error.message.includes('Failed to fetch')) {
            errorText = '⚠️ El servidor no está disponible. ¿Está corriendo FastAPI?';
        }

        const errorMsg = createMessageElement(errorText);
        messagesContainer.appendChild(errorMsg);

        console.error('Error:', error);
    } finally {
        setLoading(false);
        scrollToBottom();
    }
}

// ── Event Listeners ──────────────────────────────

// Command Suggestions Logic
const commands = [
    { cmd: '¿Qué clases tengo hoy?', desc: 'Horario del día' },
    { cmd: '¿Qué tengo pendiente esta semana?', desc: 'Tareas de la semana' },
    { cmd: 'Terminé el TP2 de Algoritmos', desc: 'Marcar tarea completada' },
    { cmd: 'Agregar parcial de Redes para el 15/04', desc: 'Crear nueva tarea' },
    { cmd: '/ayuda', desc: 'Ver todos los comandos disponibles' },
    { cmd: '/horario', desc: 'Ver los horarios de cursada' },
    { cmd: '/tareas', desc: 'Ver las tareas pendientes' },
    { cmd: '/saludo', desc: 'Recibir un saludo del asistente' }
];

const suggestionsContainer = document.getElementById('command-suggestions');
let selectedSuggestionIndex = -1;

function showSuggestions(query) {
    if (query.length < 2 && !query.startsWith('/')) {
        hideSuggestions();
        return;
    }

    query = query.toLowerCase();
    const matched = commands.filter(c => c.cmd.toLowerCase().includes(query));
    if (matched.length === 0) {
        hideSuggestions();
        return;
    }

    suggestionsContainer.innerHTML = '';
    matched.forEach((c, index) => {
        const div = document.createElement('div');
        div.className = `suggestion-item ${index === selectedSuggestionIndex ? 'selected' : ''}`;
        div.innerHTML = `<span class="suggestion-cmd">${c.cmd}</span><span class="suggestion-desc">${c.desc}</span>`;
        div.onmousedown = (e) => {
            e.preventDefault(); // Prevent blur
            messageInput.value = c.cmd + ' ';
            hideSuggestions();
            messageInput.focus();
        };
        suggestionsContainer.appendChild(div);
    });

    suggestionsContainer.classList.add('visible');
}

function hideSuggestions() {
    suggestionsContainer.classList.remove('visible');
    selectedSuggestionIndex = -1;
}

messageInput.addEventListener('input', (e) => {
    const text = messageInput.value;
    const query = text; // Search the whole input text for matches

    // Suggest if typing 2 or more characters or starts with '/'
    if (query.length >= 2 || query.startsWith('/')) {
        selectedSuggestionIndex = -1;
        showSuggestions(query);
    } else {
        hideSuggestions();
    }
});

function updateGhostText() {
    const text = messageInput.value;
    if (!text || (!text.startsWith('/') && text.length < 2)) {
        ghostInput.textContent = '';
        return;
    }

    const query = text.toLowerCase();
    const matched = commands.filter(c => c.cmd.toLowerCase().startsWith(query));

    if (matched.length > 0) {
        // If there's a match that starts with what the user typed, show it as ghost text
        const match = matched[0].cmd;
        // Keep the user's original casing for the typed part
        ghostInput.textContent = text + match.substring(text.length);
    } else {
        ghostInput.textContent = '';
    }
}

// Call updateGhostText whenever input changes or selection changes
messageInput.addEventListener('input', updateGhostText);

messageInput.addEventListener('keydown', (e) => {
    if (suggestionsContainer.classList.contains('visible')) {
        const items = suggestionsContainer.querySelectorAll('.suggestion-item');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedSuggestionIndex = (selectedSuggestionIndex + 1) % items.length;
            updateSuggestionSelection(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedSuggestionIndex = (selectedSuggestionIndex - 1 + items.length) % items.length;
            updateSuggestionSelection(items);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < items.length) {
                const cmd = items[selectedSuggestionIndex].querySelector('.suggestion-cmd').textContent;
                messageInput.value = cmd + ' ';
                hideSuggestions();
            } else if (items.length > 0) {
                if (e.key === 'Tab') {
                    // Find common prefix for terminal-like autocomplete
                    const matchedCmds = Array.from(items).map(item => item.querySelector('.suggestion-cmd').textContent);
                    let commonPrefix = matchedCmds[0];
                    for (let i = 1; i < matchedCmds.length; i++) {
                        let j = 0;
                        while (j < commonPrefix.length && j < matchedCmds[i].length && commonPrefix[j].toLowerCase() === matchedCmds[i][j].toLowerCase()) {
                            j++;
                        }
                        commonPrefix = commonPrefix.substring(0, j);
                    }
                    if (commonPrefix.length > messageInput.value.length) {
                        messageInput.value = commonPrefix;
                        if (matchedCmds.length === 1) {
                            messageInput.value += ' ';
                            hideSuggestions();
                        } else {
                            showSuggestions(commonPrefix);
                        }
                    } else if (matchedCmds.length === 1) {
                        messageInput.value = matchedCmds[0] + ' ';
                        hideSuggestions();
                    }
                } else {
                    const cmd = items[0].querySelector('.suggestion-cmd').textContent;
                    messageInput.value = cmd + ' ';
                    hideSuggestions();
                }
            }
        } else if (e.key === 'Escape') {
            hideSuggestions();
            ghostInput.textContent = '';
        } else if (e.key === 'ArrowRight' && messageInput.selectionStart === messageInput.value.length && ghostInput.textContent) {
            e.preventDefault();
            messageInput.value = ghostInput.textContent + ' ';
            hideSuggestions();
            updateGhostText();
        }
    } else {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatForm.dispatchEvent(new Event('submit'));
        } else if ((e.key === 'Tab' || e.key === 'ArrowRight') && ghostInput.textContent) {
            e.preventDefault();
            messageInput.value = ghostInput.textContent + ' ';
            updateGhostText();
        }
    }
});

function updateSuggestionSelection(items) {
    items.forEach((item, index) => {
        if (index === selectedSuggestionIndex) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

messageInput.addEventListener('blur', () => {
    hideSuggestions();
    ghostInput.textContent = '';
});

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;

    hideSuggestions();
    ghostInput.textContent = '';
    messageInput.value = '';
    sendMessage(text);
});

// Focus input on load
window.addEventListener('load', () => {
    messageInput.focus();
});

// ── Schedule Modal Logic ───────────────────────
const btnSchedule = document.getElementById('btn-schedule');
const scheduleModal = document.getElementById('schedule-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const scheduleTableContainer = document.getElementById('schedule-table-container');

// Map for English translation
const dayMap = {
    'lunes': 'Monday',
    'martes': 'Tuesday',
    'miercoles': 'Wednesday',
    'jueves': 'Thursday',
    'viernes': 'Friday',
    'sabado': 'Saturday',
    'domingo': 'Sunday'
};

let scheduleData = [];
let institutionsList = [];
let currentInstIndex = 0;

function openModal() {
    scheduleModal.classList.add('visible');
    fetchSchedule();
}

function closeModal() {
    scheduleModal.classList.remove('visible');
}

btnSchedule.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
scheduleModal.addEventListener('click', (e) => {
    if (e.target === scheduleModal) closeModal();
});

async function fetchSchedule() {
    scheduleTableContainer.innerHTML = '<div class="typing-indicator" style="justify-content:center; padding: 40px"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';

    try {
        const res = await fetch('/api/horarios');
        if (!res.ok) throw new Error('Error Loading Schedule');
        scheduleData = await res.json();

        if (scheduleData.length === 0) {
            scheduleTableContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><p>No schedules loaded.</p></div>';
            return;
        }

        institutionsList = [...new Set(scheduleData.map(d => d.institucion || 'Institution'))];
        currentInstIndex = 0;

        renderSchedulePage();
    } catch (e) {
        scheduleTableContainer.innerHTML = '<div class="empty-state"><p>⚠️ Error loading schedule data.</p></div>';
        console.error(e);
    }
}

function renderSchedulePage() {
    const currentInst = institutionsList[currentInstIndex];
    const pageData = scheduleData.filter(d => (d.institucion || 'Institution') === currentInst);

    // Detectar el día actual en español
    const diasES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const todayDia = diasES[new Date().getDay()];

    let html = `<div class="schedule-inst-header">
        <h3>${currentInst}</h3>
    </div>`;

    html += '<table class="schedule-table"><thead><tr><th>Day</th><th>Time</th><th>Subject</th></tr></thead><tbody>';

    let currentDay = null;
    for (const item of pageData) {
        const englishDay = dayMap[item.dia] || item.dia;
        const isToday = item.dia === todayDia;
        const rowClass = isToday ? ' class="today-row"' : '';
        let dayCell = '';
        if (item.dia !== currentDay) {
            const dayItemsCount = pageData.filter(d => d.dia === item.dia).length;
            dayCell = `<td rowspan="${dayItemsCount}" class="day-cell${isToday ? ' today-day' : ''}"><strong>${englishDay}</strong></td>`;
            currentDay = item.dia;
        }

        html += `<tr${rowClass}>${dayCell}
            <td class="time-cell">${item.hora_inicio} - ${item.hora_fin}</td>
            <td>${item.materia}</td>
        </tr>`;
    }
    html += '</tbody></table>';

    if (institutionsList.length > 1) {
        html += `<div class="schedule-pagination">`;
        institutionsList.forEach((inst, index) => {
            const isActive = index === currentInstIndex ? 'active' : '';
            html += `<button class="pagination-number-btn ${isActive}" onclick="goToSchedulePage(${index})" title="${inst}">${index + 1}</button>`;
        });
        html += `</div>`;
    }

    scheduleTableContainer.innerHTML = html;
}

window.goToSchedulePage = function (index) {
    currentInstIndex = index;
    renderSchedulePage();
};

// ── Tasks Modal Logic ─────────────────────────
const btnTasks = document.getElementById('btn-tasks');
const tasksModal = document.getElementById('tasks-modal');
const closeTasksBtn = document.getElementById('close-tasks-btn');
const tasksContainer = document.getElementById('tasks-container');

function openTasksModal() {
    tasksModal.classList.add('visible');
    fetchTasks();
}

function closeTasksModal() {
    tasksModal.classList.remove('visible');
}

btnTasks.addEventListener('click', openTasksModal);
closeTasksBtn.addEventListener('click', closeTasksModal);
tasksModal.addEventListener('click', (e) => {
    if (e.target === tasksModal) closeTasksModal();
});

const estadoI18n = {
    'pendiente': 'Pending',
    'en_proceso': 'In Progress',
    'completada': 'Completed',
    'atrasada': 'Overdue'
};

const prioridadI18n = {
    'alta': 'High',
    'media': 'Medium',
    'baja': 'Low'
};

async function fetchTasks() {
    tasksContainer.innerHTML = '<div class="typing-indicator" style="justify-content:center; padding: 40px"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';

    try {
        const res = await fetch('/api/tareas');
        if (!res.ok) throw new Error('Error Loading Tasks');
        const data = await res.json();

        if (data.length === 0) {
            tasksContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✅</div><p>No active tasks. You are all caught up!</p></div>';
            return;
        }

        let html = '<div class="tasks-list">';

        for (const task of data) {
            let descHtml = task.descripcion ? `<p class="task-desc">${task.descripcion}</p>` : '';
            let dateHtml = task.fecha_limite ? `<span class="task-date">📅 ${task.fecha_limite}</span>` : '';
            let subjectBadge = task.materia ? `<span class="badge badge-materia">📚 ${task.materia}</span>` : '';

            html += `
            <div class="task-card">
               <div class="task-card-header">
                   <h4>${task.titulo}</h4>
                   <span class="badge badge-estado-${task.estado}">${estadoI18n[task.estado] || task.estado}</span>
               </div>
               <div class="task-card-body">
                   ${subjectBadge}
                   <span class="badge badge-prioridad-${task.prioridad}">🔥 ${prioridadI18n[task.prioridad] || task.prioridad}</span>
                   ${dateHtml}
               </div>
               ${descHtml}
            </div>`;
        }

        html += '</div>';
        tasksContainer.innerHTML = html;

    } catch (e) {
        tasksContainer.innerHTML = '<div class="empty-state"><p>⚠️ Error loading tasks.</p></div>';
        console.error(e);
    }
}

// ── Help Modal Logic ─────────────────────────
const btnHelp = document.getElementById('btn-help');
const helpModal = document.getElementById('help-modal');
const closeHelpBtn = document.getElementById('close-help-btn');

function openHelpModal() {
    helpModal.classList.add('visible');
}

function closeHelpModal() {
    helpModal.classList.remove('visible');
}

btnHelp.addEventListener('click', openHelpModal);
closeHelpBtn.addEventListener('click', closeHelpModal);
helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) closeHelpModal();
});

// ── Provider Toggle Logic ─────────────────────
const providerToggle = document.getElementById('provider-toggle');
const toggleTrack = providerToggle.querySelector('.toggle-track');
const labelOllama = providerToggle.querySelector('[data-provider="ollama"]');
const labelGroq = providerToggle.querySelector('[data-provider="groq"]');

let currentProvider = localStorage.getItem('llm_provider') || 'ollama';

function updateToggleUI(provider) {
    if (provider === 'groq') {
        toggleTrack.classList.add('cloud');
        labelGroq.classList.add('active');
        labelOllama.classList.remove('active');
    } else {
        toggleTrack.classList.remove('cloud');
        labelOllama.classList.add('active');
        labelGroq.classList.remove('active');
    }
}

async function initProvider() {
    const savedKey = localStorage.getItem('groq_api_key') || '';
    await fetch('/api/provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: currentProvider, api_key: savedKey })
    });
    updateToggleUI(currentProvider);
}

providerToggle.addEventListener('click', async () => {
    const newProvider = currentProvider === 'ollama' ? 'groq' : 'ollama';

    if (newProvider === 'groq') {
        let storedKey = localStorage.getItem('groq_api_key');
        if (!storedKey) {
            storedKey = prompt('Enter your Groq API Key:\n(Get one free at console.groq.com → API Keys)');
            if (!storedKey) return;
            localStorage.setItem('groq_api_key', storedKey);
        }

        const res = await fetch('/api/provider', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'groq', api_key: storedKey })
        });
        const data = await res.json();
        if (data.error) {
            alert('Error: ' + data.error);
            return;
        }
    } else {
        await fetch('/api/provider', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'ollama' })
        });
    }

    currentProvider = newProvider;
    localStorage.setItem('llm_provider', currentProvider);
    updateToggleUI(currentProvider);
});

initProvider();
