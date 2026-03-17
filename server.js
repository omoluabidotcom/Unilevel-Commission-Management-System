const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config({ override: true });
if (!process.env.DB_HOST && fs.existsSync(path.join(__dirname, '.env.example'))) {
  dotenv.config({ path: path.join(__dirname, '.env.example'), override: true });
}

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static public files
app.use(express.static(path.join(__dirname, 'public')));

// API routes
const authRouter          = require('./src/routes/auth');
const usersRouter         = require('./src/routes/users');
const commissionsRouter   = require('./src/routes/commissions');
const settingsRouter      = require('./src/routes/settings');
const purchasesRouter     = require('./src/routes/purchases');
const notificationsRouter = require('./src/routes/notifications');
const profileRouter       = require('./src/routes/profile');
const { ensureProfilePictureColumn } = require('./src/db/connection');

app.use('/api/auth',          authRouter);
app.use('/api/users',         usersRouter);
app.use('/api/commissions',   commissionsRouter);
app.use('/api/settings',      settingsRouter);
app.use('/api/purchases',     purchasesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/profile',       profileRouter);
app.use('/api/tree/users',    usersRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

function startServer(bindPort) {
  const server = app.listen(bindPort, () => {
    console.log(`Server listening on http://localhost:${bindPort}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${bindPort} is in use. Trying ${bindPort + 1}...`);
      startServer(bindPort + 1);
      return;
    }
    console.error('Server error:', err);
    process.exit(1);
  });
}

// Migrate profile_picture column to MEDIUMTEXT on startup
ensureProfilePictureColumn().then(() => startServer(port));