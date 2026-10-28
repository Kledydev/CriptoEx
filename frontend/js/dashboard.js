// Verificar autenticación
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/';
}

let currentSessionId = null;

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '/';
});

// Nueva sesión
document.getElementById('newSessionBtn').addEventListener('click', () => {
    currentSessionId = null;
    document.getElementById('messages').innerHTML = '';
    loadSessions();
});

// Cargar sesiones
async function loadSessions() {
    try {
        const response = await fetch('/api/sessions', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const sessions = await response.json();
            const sessionsList = document.getElementById('sessionsList');
            
            if (sessions.length === 0) {
                sessionsList.innerHTML = '<p style="color: #999;">No hay sesiones aún</p>';
                return;
            }
            
            sessionsList.innerHTML = sessions.map(session => `
                <div class="session-item" data-id="${session.id}">
                    ${session.title}
                </div>
            `).join('');
            
            // Agregar event listeners a las sesiones
            document.querySelectorAll('.session-item').forEach(item => {
                item.addEventListener('click', () => {
                    currentSessionId = item.dataset.id;
                    loadSessionMessages(currentSessionId);
                });
            });
        }
    } catch (error) {
        console.error('Error cargando sesiones:', error);
    }
}

// Cargar mensajes de una sesión
async function loadSessionMessages(sessionId) {
    try {
        const response = await fetch(`/api/sessions/${sessionId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const session = await response.json();
            const messagesDiv = document.getElementById('messages');
            
            messagesDiv.innerHTML = session.messages.map(msg => `
                <p><strong>${msg.role === 'user' ? 'Tú' : 'CriptoEx'}:</strong> ${msg.content}</p>
            `).join('');
            
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    } catch (error) {
        console.error('Error cargando mensajes:', error);
    }
}

// Enviar mensaje
document.getElementById('chatForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const messageInput = document.getElementById('message');
    const message = messageInput.value;
    const messagesDiv = document.getElementById('messages');
    
    if (!message.trim()) return;
    
    // Mostrar mensaje del usuario
    messagesDiv.innerHTML += `<p><strong>Tú:</strong> ${message}</p>`;
    messageInput.value = '';
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
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
        
        if (response.ok) {
            const data = await response.json();
            currentSessionId = data.session_id;
            
            messagesDiv.innerHTML += `<p><strong>CriptoEx:</strong> ${data.response}</p>`;
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            
            loadSessions();
        } else {
            messagesDiv.innerHTML += `<p style="color: red;"><strong>Error:</strong> No se pudo obtener respuesta</p>`;
        }
    } catch (error) {
        messagesDiv.innerHTML += `<p style="color: red;"><strong>Error:</strong> Error de conexión</p>`;
        console.error('Error:', error);
    }
});

// Cargar sesiones al iniciar
loadSessions();