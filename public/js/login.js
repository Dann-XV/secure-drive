document.getElementById('togglePassword').addEventListener('click', () => {
    const input = document.getElementById('password');
    const icon = document.querySelector('#togglePassword i');
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('message');

    // Basic validation
    if (!email || !password) {
        messageDiv.textContent = 'Please fill in all fields.';
        return;
    }
    if (password.length < 6) {
        messageDiv.textContent = 'Password must be at least 6 characters.';
        return;
    }

    try {
        const response = await fetch('/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            window.location.href = '/drive.html';
        } else {
            messageDiv.textContent = data.message || 'Login failed.';
            messageDiv.className = '';
        }
    } catch (error) {
        messageDiv.textContent = 'An error occurred. Please try again.';
        messageDiv.className = '';
    }
});