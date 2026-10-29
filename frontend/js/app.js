// Login functionality
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('errorMsg');
    const submitBtn = document.getElementById('submitBtn');
    
    errorEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Iniciando...';
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('username', username);
            window.location.href = '/dashboard';
        } else {
            const errorData = await response.json();
            errorEl.textContent = errorData.detail || 'Credenciales inválidas';
        }
    } catch (error) {
        errorEl.textContent = 'Error de conexión con el servidor';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Iniciar sesión →';
    }
});