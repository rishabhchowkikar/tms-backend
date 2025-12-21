const bcrypt = require('bcryptjs');
const Admin = require('../models/admin.models.js')
const { generateToken } = require('../utils/generateToken.js')
const setTokenCookie = require('../utils/setTokenCookie.js');

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

// login
exports.login = async (req, res) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: "Email/adminname and password are required"
            })
        }

        // find admin by email or adminname
        const admin = await Admin.findOne({
            $or: [
                { email: identifier.toLowerCase() },
                { adminname: identifier }
            ]
        }).select('+passwordHash');

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "Invalid Credentails"
            })
        }

        const match = await admin.comparePassword(password);
        if (!match) {
            return res.status(401).json({
                success: false,
                message: "Invalid Credentials"
            });
        }

        const token = generateToken(admin);
        // Inside login after generating token:

        // Set cookie
        setTokenCookie(res, token);

        res.status(200).json({
            success: true,
            message: "Login Successfully",
            data: {
                token,
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
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login',
            error: error.message
        });
    }
}

// LOGOUT – Just client-side (delete token from frontend)
exports.logout = (req, res) => {
    res.cookie("authtms-token", '', {
        httpOnly: true,
        expires: new Date(0)
    })

    res.status(200).json({
        message: 'Logged out successfully',
        success: true
    });
};

// GET CURRENT ADMIN
exports.getMe = async (req,res) =>{
    try {
        const admin = req.admin;

        res.status(200).json({
            success: true,
            message: "User authenticated successfully",
            data:{
                admin:{
                    id: admin._id,
                    adminname: admin.adminname,
                    email: admin.email,
                    role: admin.role,
                    depotId: admin.depotId
                }
            }
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
}