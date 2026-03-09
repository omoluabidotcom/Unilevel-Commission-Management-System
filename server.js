const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static public files
app.use(express.static(path.join(__dirname, 'public')));

// API routes
const authRouter = require('./src/routes/auth');
const usersRouter = require('./src/routes/users');
const commissionsRouter = require('./src/routes/commissions');
const settingsRouter = require('./src/routes/settings');

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/commissions', commissionsRouter);
app.use('/api/settings', settingsRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
