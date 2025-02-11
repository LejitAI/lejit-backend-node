const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');
const ttsRoute = require('./routes/tts');
const speechToTextRoute = require('./routes/speech-to-text');
const visionRoutes = require('./routes/vision');
const formatRoutes = require('./routes/format');
const hearingScheduleRoutes = require('./routes/hearingSchedule');
const adminModuleRoutes = require('./routes/adminModule');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

dotenv.config();
const app = express();
app.use(cors({ origin: '*', credentials: true, optionSuccessStatus: 200 }));

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Swagger setup
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'My API',
            version: '1.0.0',
            description: 'API documentation for my Node.js app',
        },
        servers: [{ url: 'https://app.lejit.ai//backend' }],
    },
    apis: ['./routes/*.js'], // Scan route files for API documentation
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/tts', ttsRoute);
app.use('/api/speech-to-text', speechToTextRoute);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/vision', visionRoutes);
app.use('/api/format', formatRoutes);
app.use('/api/hearing-schedule', hearingScheduleRoutes);
app.use('/api/adminModule', adminModuleRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Swagger Docs available at https://app.lejit.ai//backend/api-docs`);
});
