const loginForm = document.getElementById('loginForm');

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body?.message || 'Login failed');
      }

      const { token, user } = await res.json();
      window.localStorage.setItem('token', token);
      window.localStorage.setItem('user', JSON.stringify(user));

      if (user.role === 'admin') {
        window.location.href = '/admin/dashboard.html';
        return;
      }

      if (user.role === 'distributor') {
        window.location.href = '/distributor/dashboard.html';
        return;
      }

      // fallback
      window.location.href = '/dashboard.html';
    } catch (err) {
      alert(err.message);
    }
  });
}
