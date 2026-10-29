// ========================================
// CRIPTOEX - DASHBOARD
// ========================================

// Constantes (declaradas al inicio para evitar errores de inicialización)
const COLLECTION_SUGGESTIONS = {
    'Bitcoin': [
        '¿Qué es el halving de Bitcoin?',
        'Precio actual de Bitcoin',
        '¿Cómo funciona la minería de Bitcoin?'
    ],
    'Ethereum': [
        '¿Qué son los smart contracts?',
        'Precio actual de Ethereum',
        '¿Qué es el gas en Ethereum?'
    ],
    'DeFi': [
        '¿Qué es DeFi?',
        '¿Qué es un liquidity pool?',
        'Principales riesgos de DeFi'
    ],
    'Trading': [
        '¿Qué es el análisis técnico?',
        '¿Qué es una ballena en el mercado?',
        'Gestión de riesgo en trading'
    ]
};

// Estado global
const token = localStorage.getItem('token');
let currentSessionId = null;
let activeCollection = null;
let collectionsData = [];
let isProcessing = false;

// Autenticación
if (!token) {
    window.location.href = '/';
}

// Inicialización cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

function init() {
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.textContent = localStorage.getItem('username') || 'admin';
    }
    setupEventListeners();
    loadSessions();
    loadCollections();
    attachSuggestionListeners();
}

// ========================================
// LISTENERS PRINCIPALES
// ========================================
function setupEventListeners() {
    console.log('Dashboard.js cargado correctamente');

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
            activeCollection = null;
            document.querySelectorAll('.sidebar-item[data-collection]')
                .forEach(i => i.classList.remove('active'));
            const messagesDiv = document.getElementById('messages');
            if (messagesDiv) {
                messagesDiv.innerHTML = getWelcomeHTML();
                attachSuggestionListeners();
            }
            document.querySelector('.search-section').style.display = 'block';
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

    // Tabs superiores
    setupTabs();

    // Colecciones (delegación de eventos)
    setupCollections();
}

// ========================================
// ENVIAR MENSAJE
// ========================================
async function sendMessage() {
    if (isProcessing) return;

    const input = document.getElementById('searchInput');
    const sendBtn = document.getElementById('sendBtn');
    const message = input ? input.value.trim() : '';

    if (!message) return;

    isProcessing = true;
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.textContent = 'Enviando...';
    }

    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) {
        isProcessing = false;
        return;
    }

    // Quitar vistas especiales y volver al chat
    const welcome = messagesDiv.querySelector('.welcome-state');
    if (welcome) welcome.remove();
    const specialView = messagesDiv.querySelector('.collection-view, .knowledge-view, .sources-view, .empty-view');
    if (specialView) specialView.remove();

    appendMessage('user', message);
    if (input) input.value = '';

    const loadingId = appendLoading();

    try {
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

        removeLoading(loadingId);

        if (response.ok) {
            const data = await response.json();
            currentSessionId = data.session_id;
            appendMessage('assistant', data.response);
            loadSessions();
            loadCollections();
        } else {
            let errorMessage = 'No se pudo obtener respuesta';
            try {
                const errorData = await response.json();
                if (typeof errorData.detail === 'string') {
                    errorMessage = errorData.detail;
                } else {
                    errorMessage = `Error ${response.status}`;
                }
            } catch (e) {
                errorMessage = `Error ${response.status}: ${response.statusText}`;
            }
            appendError(errorMessage);
        }
    } catch (error) {
        console.error('Error de conexión:', error);
        removeLoading(loadingId);
        appendError('Error de conexión con el servidor');
    } finally {
        isProcessing = false;
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Enviar';
        }
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
}

// ========================================
// TABS SUPERIORES
// ========================================
function setupTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            switchView(tab.dataset.tab);
        });
    });
}

function switchView(view) {
    const searchSection = document.querySelector('.search-section');

    if (view === 'chat') {
        searchSection.style.display = 'block';
        if (currentSessionId) {
            loadSessionMessages(currentSessionId);
        } else {
            const messagesDiv = document.getElementById('messages');
            messagesDiv.innerHTML = getWelcomeHTML();
            attachSuggestionListeners();
        }
    } else if (view === 'knowledge') {
        searchSection.style.display = 'none';
        loadKnowledgeView();
    } else if (view === 'sources') {
        searchSection.style.display = 'none';
        loadSourcesView();
    }
}

// ========================================
// COLECCIONES
// ========================================
function setupCollections() {
    document.addEventListener('click', (e) => {
        const collectionItem = e.target.closest('.sidebar-item[data-collection]');
        if (!collectionItem) return;

        const name = collectionItem.dataset.collection;
        console.log('Colección clickeada:', name);

        if (activeCollection === name) {
            activeCollection = null;
            collectionItem.classList.remove('active');
            loadSessions();
            switchView('chat');
        } else {
            activeCollection = name;
            document.querySelectorAll('.sidebar-item[data-collection]')
                .forEach(i => i.classList.remove('active'));
            collectionItem.classList.add('active');
            loadSessions();
            renderCollectionView(name);
        }
    });
}

async function loadCollections() {
    try {
        const response = await fetch('/api/collections', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            collectionsData = data.collections;

            collectionsData.forEach(collection => {
                const countEl = document.querySelector(
                    `.sidebar-item[data-collection="${collection.name}"] .sidebar-count`
                );
                if (countEl) countEl.textContent = collection.count;
            });
        }
    } catch (error) {
        console.error('Error cargando colecciones:', error);
    }
}

function renderCollectionView(name) {
    const messagesDiv = document.getElementById('messages');
    const collection = collectionsData.find(c => c.name === name);
    const count = collection ? collection.count : 0;
    const suggestions = COLLECTION_SUGGESTIONS[name] || [];

    document.querySelector('.search-section').style.display = 'none';
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

    messagesDiv.innerHTML = `
        <div class="collection-view">
            <div class="view-header">
                <h2 class="view-title">Colección: ${name}</h2>
                <p class="view-subtitle">
                    ${count} ${count === 1 ? 'sesión relacionada' : 'sesiones relacionadas'}
                </p>
            </div>
            <p class="collection-hint">
                Haz una pregunta sobre ${name} o abre una sesión existente desde el panel izquierdo.
            </p>
            <div class="suggestions">
                ${suggestions.map(msg => `
                    <button class="suggestion-chip" data-msg="${msg}">${msg}</button>
                `).join('')}
            </div>
        </div>
    `;

    attachSuggestionListeners();
}

// ========================================
// SESIONES
// ========================================
async function loadSessions() {
    try {
        const response = await fetch('/api/sessions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return;

        const sessions = await response.json();
        const sessionsList = document.getElementById('sessionsList');
        if (!sessionsList) return;

        // Filtrar por colección activa
        let filteredSessions = sessions;
        if (activeCollection) {
            const collection = collectionsData.find(c => c.name === activeCollection);
            if (collection) {
                filteredSessions = sessions.filter(s => collection.session_ids.includes(s.id));
            }
        }

        if (!filteredSessions || filteredSessions.length === 0) {
            sessionsList.innerHTML = '<div class="sidebar-item"><span>No hay sesiones aún</span></div>';
            return;
        }

        sessionsList.innerHTML = filteredSessions.map(session => `
            <div class="sidebar-item ${session.id === currentSessionId ? 'active' : ''}"
                 data-id="${session.id}">
                <span class="session-title">${session.title || 'Sin título'}</span>
                <button class="delete-session-btn" data-id="${session.id}" title="Eliminar sesión" aria-label="Eliminar sesión">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `).join('');

        // Abrir sesión
        document.querySelectorAll('.sidebar-item[data-id]').forEach(item => {
            item.addEventListener('click', () => {
                currentSessionId = item.dataset.id;

                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelector('.tab[data-tab="chat"]').classList.add('active');
                document.querySelector('.search-section').style.display = 'block';

                loadSessionMessages(currentSessionId);
                document.querySelectorAll('.sidebar-item[data-id]').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });

        // Eliminar sesión
        document.querySelectorAll('.delete-session-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const sessionId = btn.dataset.id;
                if (confirm('¿Eliminar esta sesión? Esta acción no se puede deshacer.')) {
                    await deleteSession(sessionId);
                }
            });
        });
    } catch (error) {
        console.error('Error cargando sesiones:', error);
    }
}

async function deleteSession(sessionId) {
    try {
        const response = await fetch(`/api/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            if (currentSessionId === sessionId) {
                currentSessionId = null;
                const messagesDiv = document.getElementById('messages');
                if (messagesDiv) {
                    messagesDiv.innerHTML = getWelcomeHTML();
                    attachSuggestionListeners();
                }
            }
            loadSessions();
            loadCollections();
        }
    } catch (error) {
        console.error('Error eliminando sesión:', error);
    }
}

async function loadSessionMessages(sessionId) {
    try {
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

// ========================================
// VISTA: CONOCIMIENTOS
// ========================================
async function loadKnowledgeView() {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = `
        <div class="loading-indicator">
            <div class="loading-dots"><span></span><span></span><span></span></div>
            <span>Cargando base de conocimientos...</span>
        </div>
    `;

    try {
        const response = await fetch('/api/knowledge', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Error al cargar conocimientos');

        const data = await response.json();

        if (data.sections.length === 0) {
            messagesDiv.innerHTML = `
                <div class="empty-view">
                    <h2 class="view-title">Base de conocimientos vacía</h2>
                    <p class="view-subtitle">Agrega documentos en backend/knowledge/ para indexarlos.</p>
                </div>
            `;
            return;
        }

        messagesDiv.innerHTML = `
            <div class="knowledge-view">
                <div class="view-header">
                    <h2 class="view-title">Base de conocimientos</h2>
                    <p class="view-subtitle">
                        ${data.total_sections} secciones indexadas en ChromaDB
                        (colección: <code>${data.vector_collection}</code>)
                    </p>
                </div>
                <div class="knowledge-grid">
                    ${data.sections.map(section => `
                        <div class="knowledge-card">
                            <h3 class="knowledge-card-title">${section.title}</h3>
                            <p class="knowledge-card-content">${section.content.replace(/\n/g, '<br>')}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error cargando conocimientos:', error);
        messagesDiv.innerHTML = '<div class="error-bubble">No se pudo cargar la base de conocimientos.</div>';
    }
}

// ========================================
// VISTA: FUENTES
// ========================================
async function loadSourcesView() {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = `
        <div class="loading-indicator">
            <div class="loading-dots"><span></span><span></span><span></span></div>
            <span>Cargando fuentes consultadas...</span>
        </div>
    `;

    try {
        const response = await fetch('/api/sources', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Error al cargar fuentes');

        const data = await response.json();

        if (data.sources.length === 0) {
            messagesDiv.innerHTML = `
                <div class="empty-view">
                    <h2 class="view-title">Sin fuentes aún</h2>
                    <p class="view-subtitle">
                        Cuando el agente consulte páginas web o incluya enlaces
                        en sus respuestas, aparecerán aquí.
                    </p>
                </div>
            `;
            return;
        }

        const domainChips = Object.entries(data.domains)
            .sort((a, b) => b[1] - a[1])
            .map(([domain, count]) => `
                <span class="domain-chip">
                    <span class="domain-name">${domain}</span>
                    <span class="domain-count">${count}</span>
                </span>
            `).join('');

        const sourceCards = data.sources.map(source => `
            <div class="source-card">
                <div class="source-card-header">
                    <span class="source-domain">${source.domain}</span>
                    <span class="source-time">${formatTimestamp(source.timestamp)}</span>
                </div>
                <a href="${source.url}" target="_blank" rel="noopener noreferrer" class="source-url">
                    ${source.url}
                </a>
                <p class="source-session">Sesión: ${source.session_title}</p>
            </div>
        `).join('');

        messagesDiv.innerHTML = `
            <div class="sources-view">
                <div class="view-header">
                    <h2 class="view-title">Fuentes consultadas</h2>
                    <p class="view-subtitle">
                        ${data.total_sources} enlaces extraídos de las respuestas del agente
                    </p>
                </div>
                <div class="domain-summary">${domainChips}</div>
                <div class="sources-list-grid">${sourceCards}</div>
            </div>
        `;
    } catch (error) {
        console.error('Error cargando fuentes:', error);
        messagesDiv.innerHTML = '<div class="error-bubble">No se pudieron cargar las fuentes.</div>';
    }
}

function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    try {
        const date = new Date(timestamp);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return '';
    }
}

// ========================================
// RENDERIZADO DE MENSAJES
// ========================================
function attachSuggestionListeners() {
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const msg = chip.dataset.msg;
            const input = document.getElementById('searchInput');
            if (input) {
                // Si estamos en una vista sin barra de búsqueda, mostrarla
                document.querySelector('.search-section').style.display = 'block';
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelector('.tab[data-tab="chat"]').classList.add('active');
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