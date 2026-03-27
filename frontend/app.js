// ══════════════════════════════════════════════════
// Shift Log — Chat Frontend Logic
// ══════════════════════════════════════════════════

const API_URL = '/api/chat';
const messagesContainer = document.getElementById('messages');
const chatContainer = document.getElementById('chat-container');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
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

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;

    messageInput.value = '';
    sendMessage(text);
});

// Enter to send, Shift+Enter for new line (if textarea in future)
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event('submit'));
    }
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
    
    let html = `<div class="schedule-inst-header">
        <h3>${currentInst}</h3>
    </div>`;
    
    html += '<table class="schedule-table"><thead><tr><th>Day</th><th>Time</th><th>Subject</th></tr></thead><tbody>';
    
    let currentDay = null;
    for (const item of pageData) {
        const englishDay = dayMap[item.dia] || item.dia;
        let dayCell = '';
        if (item.dia !== currentDay) {
            const dayItemsCount = pageData.filter(d => d.dia === item.dia).length;
            dayCell = `<td rowspan="${dayItemsCount}" class="day-cell"><strong>${englishDay}</strong></td>`;
            currentDay = item.dia;
        }
        
        html += `<tr>${dayCell}
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

window.goToSchedulePage = function(index) {
    currentInstIndex = index;
    renderSchedulePage();
};
