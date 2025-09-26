import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './src/backend/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
console.log('Express app initialized');

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Body:`, req.body);
  next();
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'src/frontend'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Serve node_modules for ES module imports
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// Routes
app.use('/api', routes);
console.log('Routes mounted at /api');

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/frontend/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error middleware:', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;