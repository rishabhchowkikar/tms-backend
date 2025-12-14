const bcrypt = require('bcryptjs');
const Admin = require('../models/admin.models.js');
const Depot = require('../models/depot.models.js');
const Staff = require('../models/staff.model.js')

exports.createDepotAdmin = async (req, res) => {
    try {
        const { adminname, email, password, depotId } = req.body;


        // 1. Validate depot exists
        const depot = await Depot.findById(depotId);
        if (!depot) {
            return res.status(404).json({
                success: false,
                message: 'Depot not found. Please select a valid depot.'
            });
        }

        // 2. CHECK: Is this depot already assigned to another admin?
        const existingAdminWithDepot = await Admin.findOne({
            depotId: depotId,
            role: 'admin'
        });

        if (existingAdminWithDepot) {
            return res.status(400).json({
                success: false,
                message: `This depot (${depot.name} - ${depot.code}) is already assigned to admin: ${existingAdminWithDepot.adminname} (${existingAdminWithDepot.email})`
            });
        }

        // 3. Check if email  already used 
        const existingUser = await Admin.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // 4. Create the new admin
        const passwordHash = await bcrypt.hash(password, 10);

        const newAdmin = await Admin.create({
            adminname,
            email,
            passwordHash,
            role: 'admin',
            depotId
        });

        // 5. Return full details with parent depot (if sub-depot)
        const populatedAdmin = await Admin.findById(newAdmin._id)
            .populate({
                path: 'depotId',
                select: 'name code type district parentDepot',
                populate: { path: 'parentDepot', select: 'name code' }
            });

        const depotInfo = populatedAdmin.depotId;

        res.status(201).json({
            success: true,
            message: 'Depot Admin created successfully',
            data: {
                id: newAdmin._id,
                adminname: newAdmin.adminname,
                email: newAdmin.email,
                depot: {
                    id: depotInfo._id,
                    name: depotInfo.name,
                    code: depotInfo.code,
                    type: depotInfo.type,
                    district: depotInfo.district,
                    parentDepot: depotInfo.parentDepot
                        ? { id: depotInfo.parentDepot._id, name: depotInfo.parentDepot.name, code: depotInfo.parentDepot.code }
                        : null
                }
            }
        });
    } catch (error) {
        console.error('Create Depot Admin Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
}

// List all Depot Admins with full depot hierarchy
exports.getAllDepotAdmins = async (req, res) => {
    try {
        const admins = await Admin.find({ role: 'admin' })
            .populate({
                path: 'depotId',
                select: 'name code type district parentDepot',
                populate: {
                    path: 'parentDepot',
                    select: 'name code'
                }
            })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: admins.length,
            data: admins.map(admin => ({
                id: admin._id,
                adminname: admin.adminname,
                email: admin.email,
                createdAt: admin.createdAt,
                depot: admin.depotId ? {
                    id: admin.depotId._id,
                    name: admin.depotId.name,
                    code: admin.depotId.code,
                    type: admin.depotId.type,
                    district: admin.depotId.district,
                    parentDepot: admin.depotId.parentDepot ? {
                        id: admin.depotId.parentDepot._id,
                        name: admin.depotId.parentDepot.name,
                        code: admin.depotId.parentDepot.code
                    } : null
                } : null
            }))
        });
    } catch (error) {
        console.error('Get Depot Admins Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

exports.getAllStaff = async (req, res) => {
    try {
        const staff = await Staff.find({})
            .select('-__v')
            .populate({
                path: "depotId",
                select: "name code type district",
                populate: {
                    path: 'parentDepot',
                    select: "name code"
                }
            })
            .sort({ createdAt: -1 })

        const formattedStaff = staff.map(s => ({
            id: s._id,
            name: s.name,
            code: s.code,
            role: s.role,
            phone: s.phone,
            licenseNumber: s.licenseNumber,
            isActive: s.isActive,
            createdAt: s.createdAt,
            depot: s.depotId ? {
                id: s.depotId._id,
                name: s.depotId.name,
                code: s.depotId.code,
                type: s.depotId.type,
                district: s.depotId.district,
                parentDepot: s.depotId.parentDepot ? {
                    id: s.depotId.parentDepot._id,
                    name: s.depotId.parentDepot.name,
                    code: s.depotId.parentDepot.code
                } : null
            } : null
        }));

        res.json({
            success: true,
            message: 'All staff fetched successfully',
            count: formattedStaff.length,
            data: formattedStaff
        });
    } catch (error) {
        console.error('Get All Staff Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server error',
            error: error.message
        });
    }
}