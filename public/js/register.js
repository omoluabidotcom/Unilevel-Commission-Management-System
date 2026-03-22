const registerForm = document.getElementById('registerForm');

if (registerForm) {
  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    const sponsorId = document.getElementById('sponsorId').value.trim();

    try {
      // Validate inputs
      if (!fullName || !email || !password) {
        throw new Error('Please fill in all required fields');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          phone: phone || null,
          password,
          confirmPassword,
          sponsorId: sponsorId || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body?.message || 'Registration failed');
      }

      const body = await res.json();
      alert(body?.message || 'Account created successfully. Please sign in.');

      // Registration does not auto-login; send user to login page
      window.location.href = '/';
    } catch (err) {
      alert(err.message);
    }
  });
}
