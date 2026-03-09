const loginForm = document.getElementById('loginForm');

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    // TODO: Replace with an API call to your backend
    if (email === 'admin@example.com' && password === 'password') {
      window.location.href = 'dashboard.html';
      return;
    }

    alert('Invalid credentials: try admin@example.com / password');
  });
}
