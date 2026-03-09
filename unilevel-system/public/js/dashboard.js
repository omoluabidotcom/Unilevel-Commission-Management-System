const logoutBtn = document.getElementById('logoutBtn');

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    // TODO: Clear auth state, tokens, etc.
    window.location.href = 'index.html';
  });
}
