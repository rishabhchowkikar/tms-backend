const jwt = require('jsonwebtoken');
const Admin = require('../models/admin.models.js')

const protect = async (req, res, next) => {

    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // If no token
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized',
        });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // finding the user
        const admin = await Admin.findById(decoded.id);
        if (!admin) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        req.admin = admin;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Token invalid or expired',
        });
    }
}

// Super Admin Only
const superAdminOnly = (req, res, next) => {
    if (req.admin.role !== 'superadmin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied – Super Admin only',
        });
    }
    next();
};

// Depot Admin Only (or Super Admin)
const depotAdminOnly = (req, res, next) => {
    if (req.admin.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied – Admin role required',
        });
    }
    next();
};

// Super Admin OR Depot Admin managing his own depot
const restrictToOwnDepot = (req, res, next) => {
    if (req.admin.role === 'superadmin') return next();

    if (req.admin.role === 'admin') {
        const depotIdFromUrl = req.params.depotId || req.body.depotId;
        if (depotIdFromUrl && depotIdFromUrl !== req.admin.depotId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only manage your own depot',
            });
        }
        return next();
    }

    return res.status(403).json({
        success: false,
        message: 'Access denied – Super Admin or Admin role required',
    });
};

module.exports = { protect, superAdminOnly, depotAdminOnly, restrictToOwnDepot };