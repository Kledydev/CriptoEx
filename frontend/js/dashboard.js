// ========================================
// CRIPTOEX - DASHBOARD.JS
// ========================================

// Verificar autenticación al cargar
(function init() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }
    
    const username = localStorage.getItem('username') || 'admin';
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = username;
    
    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupEventListeners);
    } else {
        setupEventListeners();
    }
})();

let currentSessionId = null;
let isProcessing = false;

function setupEventListeners() {
    console.log('✅ Dashboard.js cargado correctamente');
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            window.location.href = '/';
        });
    }
    
    // Nueva sesión
    const newSessionBtn = document.getElementById('newSessionBtn');
    if (newSessionBtn) {
        newSessionBtn.addEventListener('click', () => {
            currentSessionId = null;
            const messagesDiv = document.getElementById('messages');
            if (messagesDiv) {
                messagesDiv.innerHTML = getWelcomeHTML();
                attachSuggestionListeners();
            }
            loadSessions();
        });
    }
    
    // Enviar con Enter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // Enviar con botón
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
    
    // Cargar sesiones iniciales
    loadSessions();
    attachSuggestionListeners();
}

async function sendMessage() {
    if (isProcessing) return;
    
    const input = document.getElementById('searchInput');
    const sendBtn = document.getElementById('sendBtn');
    const message = input ? input.value.trim() : '';
    
    if (!message) {
        console.log('⚠️ Mensaje vacío');
        return;
    }
    
    isProcessing = true;
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.textContent = 'Enviando...';
    }
    
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) {
        console.error('❌ No se encontró el contenedor de mensajes');
        isProcessing = false;
        return;
    }
    
    // Remover estado de bienvenida
    const welcome = messagesDiv.querySelector('.welcome-state');
    if (welcome) welcome.remove();
    
    // Agregar mensaje del usuario
    appendMessage('user', message);
    if (input) input.value = '';
    
    // Mostrar loading
    const loadingId = appendLoading();
    
    try {
        const token = localStorage.getItem('token');
        console.log('📤 Enviando mensaje:', message);
        
        const response = await fetch('/api/agents/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                message: message,
                session_id: currentSessionId
            })
        });
        
        console.log('📥 Respuesta recibida:', response.status);
        
        removeLoading(loadingId);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Datos:', data);
            
            currentSessionId = data.session_id;
            appendMessage('assistant', data.response);
            loadSessions();
        } else {
            let errorMessage = 'No se pudo obtener respuesta';
            try {
                const errorData = await response.json();
                console.error('❌ Error del servidor:', errorData);
                
                if (typeof errorData.detail === 'string') {
                    errorMessage = errorData.detail;
                } else if (errorData.detail && typeof errorData.detail === 'object') {
                    errorMessage = JSON.stringify(errorData.detail);
                } else {
                    errorMessage = `Error ${response.status}`;
                }
            } catch (e) {
                errorMessage = `Error ${response.status}: ${response.statusText}`;
            }
            appendError(errorMessage);
        }
    } catch (error) {
        console.error('❌ Error de conexión:', error);
        removeLoading(loadingId);
        appendError('Error de conexión con el servidor');
    } finally {
        isProcessing = false;
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Enviar';
        }
        if (messagesDiv) {
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    }
}

function attachSuggestionListeners() {
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const msg = chip.dataset.msg;
            console.log('💡 Sugerencia clickeada:', msg);
            const input = document.getElementById('searchInput');
            if (input) {
                input.value = msg;
                sendMessage();
            }
        });
    });
}

function getWelcomeHTML() {
    return `
        <div class="welcome-state">
            <h2 class="welcome-title">Bienvenido a CriptoEx</h2>
            <p class="welcome-subtitle">
                Haz una pregunta sobre criptomonedas para comenzar.
                Tu agente buscará en la web y en su base de conocimientos.
            </p>
            <div class="suggestions">
                <button class="suggestion-chip" data-msg="¿Qué es el bitcoin?">¿Qué es el bitcoin?</button>
                <button class="suggestion-chip" data-msg="Precio actual de Ethereum">Precio de Ethereum</button>
                <button class="suggestion-chip" data-msg="¿Qué es DeFi?">¿Qué es DeFi?</button>
                <button class="suggestion-chip" data-msg="Noticias recientes sobre crypto">Noticias crypto</button>
            </div>
        </div>
    `;
}

function appendMessage(role, content) {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return;
    
    const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    const messageEl = document.createElement('div');
    messageEl.className = 'message';
    messageEl.innerHTML = `
        <div class="message-header">
            <span class="message-tag ${role}">${role === 'user' ? 'TÚ' : 'CRYPTOEX'}</span>
            <span class="message-time">${time}</span>
        </div>
        <div class="message-content ${role === 'user' ? 'user-content' : ''}">
            ${formatContent(content)}
        </div>
    `;
    messagesDiv.appendChild(messageEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function appendError(message) {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return;
    
    const errorEl = document.createElement('div');
    errorEl.className = 'error-bubble';
    errorEl.textContent = `Error: ${message}`;
    messagesDiv.appendChild(errorEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function appendLoading() {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return null;
    
    const id = 'loading-' + Date.now();
    const loadingEl = document.createElement('div');
    loadingEl.id = id;
    loadingEl.className = 'loading-indicator';
    loadingEl.innerHTML = `
        <div class="loading-dots"><span></span><span></span><span></span></div>
        <span>CriptoEx está pensando...</span>
    `;
    messagesDiv.appendChild(loadingEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    return id;
}

function removeLoading(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.remove();
}

function formatContent(content) {
    if (!content) return '';
    if (typeof content !== 'string') content = JSON.stringify(content);
    
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
    content = content.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
    content = content.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1</a>');
    content = content.replace(/\n/g, '<br>');
    return content;
}

async function loadSessions() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/sessions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const sessions = await response.json();
            const sessionsList = document.getElementById('sessionsList');
            
            if (!sessionsList) return;
            
            if (!sessions || sessions.length === 0) {
                sessionsList.innerHTML = '<div class="sidebar-item"><span>No hay sesiones aún</span></div>';
                return;
            }
            
            sessionsList.innerHTML = sessions.map(session => `
                <div class="sidebar-item ${session.id === currentSessionId ? 'active' : ''}" 
                     data-id="${session.id}">
                    <span>${session.title || 'Sin título'}</span>
                </div>
            `).join('');
            
            document.querySelectorAll('.sidebar-item[data-id]').forEach(item => {
                item.addEventListener('click', () => {
                    currentSessionId = item.dataset.id;
                    loadSessionMessages(currentSessionId);
                    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                });
            });
        }
    } catch (error) {
        console.error('Error cargando sesiones:', error);
    }
}

async function loadSessionMessages(sessionId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/sessions/${sessionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const session = await response.json();
            const messagesDiv = document.getElementById('messages');
            if (!messagesDiv) return;
            
            messagesDiv.innerHTML = '';
            
            if (session.messages && session.messages.length > 0) {
                session.messages.forEach(msg => {
                    appendMessage(msg.role, msg.content);
                });
            }
        }
    } catch (error) {
        console.error('Error cargando mensajes:', error);
    }
}