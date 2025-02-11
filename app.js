const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require("cors");
const connectDB = require('./config/db');
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');
const ttsRoute = require('./routes/tts');
const speechToTextRoute = require('./routes/speech-to-text');
const visionRoutes = require('./routes/vision');
const formatRoutes = require('./routes/format');
const hearingScheduleRoutes = require('./routes/hearingSchedule');
const adminModuleRoutes = require('./routes/adminModule');
const caseRoutes = require('./routes/case');
const clientRoutes = require('./routes/client');
const lawFirmRoutes = require('./routes/lawFirm');
const teamMemberRoutes = require('./routes/teamMember');

dotenv.config();
const app = express();

const corsOptions = {
   origin: '*', 
   credentials: true,
   optionSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Swagger configuration
const swaggerOptions = {
    swaggerDefinition: {
      openapi: "3.0.0",
      info: {
        title: "Your API",
        version: "1.0.0",
      },
      servers: [
        {
          url: "https://app.lejit.ai/backend", // Change this to your API URL
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
    apis: ["./routes/*.js"], // Your API route files
  };
  

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
console.log("Swagger UI is available at https://app.lejit.ai/backend/api-docs");

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/tts', ttsRoute);
app.use('/api/speech-to-text', speechToTextRoute);
app.use('/api/vision', visionRoutes);
app.use('/api/format', formatRoutes);
app.use('/api/hearing-schedule', hearingScheduleRoutes);
app.use('/api/adminModule', adminModuleRoutes);
app.use('/api/case', caseRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/law-firm', lawFirmRoutes);
app.use('/api/team-member', teamMemberRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});