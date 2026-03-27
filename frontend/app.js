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
    avatar.textContent = isUser ? '👤' : '⚡';

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
    avatar.className = 'message-avatar';
    avatar.textContent = '⚡';

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
