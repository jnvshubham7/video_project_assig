const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const httpServer = createServer(app);

// CORS configuration: accept FRONTEND_URL from env, plus hardcoded list of known URLs
const corsOptions = {
  origin: function(origin, callback) {
    const frontendUrl = process.env.FRONTEND_URL;
    
    // List of allowed origins (for dev + known production URLs)
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://video-filter-iota.vercel.app',
      'https://video-filter-i54p67agb-shubham-kumar-bhoktas-projects.vercel.app'
    ];
    
    // Add FRONTEND_URL if set
    if (frontendUrl && !allowedOrigins.includes(frontendUrl)) {
      allowedOrigins.push(frontendUrl);
    }
    
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      console.log(`[CORS] Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

const io = new Server(httpServer, {
  cors: corsOptions
});

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`✓ User connected: ${socket.id}`);

  // Join organization room for real-time updates
  socket.on('join-org', (organizationId) => {
    socket.join(`org-${organizationId}`);
    console.log(`User ${socket.id} joined organization ${organizationId}`);
  });

  // Leave organization room
  socket.on('leave-org', (organizationId) => {
    socket.leave(`org-${organizationId}`);
    console.log(`User ${socket.id} left organization ${organizationId}`);
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log(`✗ User disconnected: ${socket.id}`);
  });
});

// Connect to MongoDB (validate env and support common names)
const getMongoUri = () => {
  return process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;
};

const connectDB = async () => {
  const uri = getMongoUri();
  if (!uri) {
    console.error('✗ MongoDB Connection Error: no MongoDB URI found in environment.');
    console.error('  Expected `MONGODB_URI` (or MONGO_URI / DATABASE_URL) to be set for this service/environment.');
    console.error('  Check your Railway project -> Environments -> Variables and ensure the variable is applied to this service.');
    process.exit(1);
  }

  // Print masked presence for easier debugging (do not show full secret)
  try {
    const masked = uri.length > 16 ? `${uri.slice(0,8)}...${uri.slice(-8)}` : '***masked***';
    console.log('✓ MongoDB URI present (masked):', masked);

    await mongoose.connect(uri);
    console.log('✓ MongoDB Connected');
  } catch (error) {
    console.error('✗ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

connectDB();

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/videos', require('./routes/videoRoutes'));
app.use('/api/org', require('./routes/organizationRoutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running', socketIO: 'enabled' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ WebSocket enabled`);
});

