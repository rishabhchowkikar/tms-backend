const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser')
const { connectDB } = require('./src/utils/db.js');
const adminAuthRoutes = require('./src/routes/adminAuth.routes.js');
const superAdminControllerRoutes = require('./src/routes/superAdmin.routes.js');
const depotAdminControllerRoutes = require('./src/routes/depotAdmin.routes.js')
dotenv.config();
const app = express();

// middleware
app.use(express.json());
app.use(cookieParser())
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
}));

connectDB();


// routes
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/superadmin', superAdminControllerRoutes)
app.use('/api/admin/depot-work-space', depotAdminControllerRoutes)
// health check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'sucess',
        message: 'Backend is running!',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV
    })
})

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    try {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
    } catch (error) {
        console.error(`❌ Server Error: ${error.message}`);
        process.exit(1);
    }
})