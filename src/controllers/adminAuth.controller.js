const bcrypt = require('bcryptjs');
const Admin = require('../models/admin.models.js')
const { generateToken } = require('../utils/generateToken.js')

// SIGNUP – Only for first Super Admin (or later by Super Admin)
exports.signup = async (req, res, next) => {
    try {
        const { adminname, email, password, role } = req.body
        if (!adminname || !email || !password || !role) {
            return res.status(400).json({
                message: 'All fields (username, email, password, role) are required',
                success: false
            });
        }

        if (
            adminname.trim() === "" ||
            email.trim() === "" ||
            password.trim() === ""
        ) {
            return res.status(400).json({
                message: 'Fields cannot be empty'
            });
        }

        if (role === 'superadmin') {
            const existingSuperAdmin = await Admin.findOne({ role: 'superadmin' });
            if (existingSuperAdmin) return res.status(400).json({ message: 'Super Admin already Exist', success: false })
        }


        const passwordHash = await bcrypt.hash(password, 12);
        const newSuperAdmin = await Admin.create({ adminname, email, passwordHash, role, depotId: null });

        return res.status(201).json({
            message: 'Super Admin created successfully',
            success: true,
            payload: {
                _id: newSuperAdmin._id,
                adminname: newSuperAdmin.adminname,
                email: newSuperAdmin.email,
                role: newSuperAdmin.role
            }
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        })
    }
}

// Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email }).select('+passwordHash');
        if (!admin) return res.status(401).json({ message: "Invalid email or password", success: false })

        const isMatch = await admin.comparePassword(password);
        if (!isMatch) return res.status(401).json({ message: "Invalid email or password", success: false })

        const token = generateToken(admin);

        return res.status(200).json({
            message: "Login successful",
            success: true,
            payload: {
                token: token,
                admin: {
                    id: admin._id,
                    adminname: admin.adminname,
                    email: admin.email,
                    role: admin.role,
                    depotId: admin.depotId
                }
            }
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        })
    }
}

// LOGOUT – Just client-side (delete token from frontend)
exports.logout = (req, res) => {
    res.status(200).json({
        message: 'Logged out successfully',
        success: true
    });
};