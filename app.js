const express = require('express');
const dotenv = require('dotenv');
const path = require('path'); // Import path module
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');
const ttsRoute = require('./routes/tts');
const speechToTextRoute = require('./routes/speech-to-text');
const visionRoutes = require('./routes/vision');
const formatRoutes = require('./routes/format');




const cors=require("cors");
const corsOptions ={
   origin:'*', 
   credentials:true,            //access-control-allow-credentials:true
   optionSuccessStatus:200,
}
dotenv.config();
const app = express();
app.use(cors(corsOptions)) // Use this after the variable declaration



// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes


// Add the new routes
app.use('/api/tts', ttsRoute);
app.use('/api/speech-to-text', speechToTextRoute);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api', visionRoutes);
app.use('/api', formatRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
