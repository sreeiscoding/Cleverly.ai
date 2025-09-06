require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const authMiddleware = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');
const aiRoutes = require('./routes/ai');
const filesRoutes = require('./routes/files');
const paymentsRoutes = require('./routes/payments');
const dictionaryRoutes = require('./routes/dictionary');
const mcqRoutes = require('./routes/mcq');
const questionsRoutes = require('./routes/questions');
const uploadsRoutes = require('./routes/uploads');

const app = express();

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

// Middleware
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: [APP_BASE_URL] }));

// Public routes
app.use('/auth', authRoutes);

// Auth middleware protects routes below
app.use(authMiddleware);

// Protected routes
app.use('/notes', notesRoutes);
app.use('/ai', aiRoutes);
app.use('/files', filesRoutes);
app.use('/payments', paymentsRoutes);
app.use('/dictionary', dictionaryRoutes);
app.use('/mcq', mcqRoutes);
app.use('/questions', questionsRoutes);
app.use('/upload', uploadsRoutes);

// Global error handler
app.use(function (err, req, res, next) {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
