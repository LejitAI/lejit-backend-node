//app.js
const express = require('express');
const dotenv = require('dotenv');
const sequelize = require('./config/db');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');

const cors = require("cors");
const corsOptions = {
   origin:'*', 
   credentials:true,
   optionSuccessStatus:200,
}

dotenv.config();
const app = express();
app.use(cors(corsOptions))

// Connect to PostgreSQL and sync models
sequelize.sync()
  .then(() => {
    console.log('Postgres DB connected and synced');
  })
  .catch((err) => {
    console.error('Unable to connect to Postgres:', err);
  });

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
