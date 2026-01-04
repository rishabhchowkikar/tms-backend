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

exports.getAllDepotsWithAdmins = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        // Total count for pagination
        const totalDepots = await Depot.countDocuments();

        const depots = await Depot.aggregate([
            // Stage 1: Lookup admins for each depot
            {
                $lookup: {
                    from: 'admins', // Collection name (lowercase, pluralized by Mongoose)
                    localField: '_id',
                    foreignField: 'depotId',
                    as: 'admins',
                    pipeline: [
                        { $match: { role: 'admin' } },
                        {
                            $project: {
                                adminname: 1,
                                email: 1,
                                createdAt: 1,
                                updatedAt: 1
                            }
                        }
                    ]
                }
            },

            // Stage 2: Lookup parent depot details
            {
                $lookup: {
                    from: 'depots',
                    localField: 'parentDepot',
                    foreignField: '_id',
                    as: 'parentDepotDetails'
                }
            },
            {
                $unwind: {
                    path: '$parentDepotDetails',
                    preserveNullAndEmptyArrays: true
                }
            },

            // Stage 3: Add field to determine sorting priority
            {
                $addFields: {
                    hasAdmin: { $gt: [{ $size: '$admins' }, 0] },
                    // For secondary sort: newer depots first within same priority
                    sortPriority: {
                        $cond: [
                            { $gt: [{ $size: '$admins' }, 0] },
                            0,  // Has admin → higher priority (comes first)
                            1   // No admin → lower priority
                        ]
                    }
                }
            },

            // Stage 4: Sort - First by hasAdmin (true first), then by createdAt descending
            {
                $sort: {
                    sortPriority: 1,     // 0 first (has admin), then 1
                    createdAt: -1        // Newest first within each group
                }
            },

            // Stage 5: Pagination
            { $skip: skip },
            { $limit: limit },

            // Stage 6: Final projection (clean output)
            {
                $project: {
                    _id: 1,
                    name: 1,
                    code: 1,
                    type: 1,
                    district: 1,
                    commencementDate: 1,
                    isActive: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    hasAdmin: 1,
                    admins: {
                        $cond: [
                            { $gt: [{ $size: '$admins' }, 0] },
                            '$admins',
                            []
                        ]
                    },
                    parentDepot: {
                        $cond: {
                            if: { $eq: ['$parentDepotDetails', null] },
                            then: null,
                            else: {
                                id: '$parentDepotDetails._id',
                                name: '$parentDepotDetails.name',
                                code: '$parentDepotDetails.code'
                            }
                        }
                    }
                }
            }
        ]);

        res.json({
            success: true,
            message: 'Depots fetched successfully',
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalDepots / limit),
                totalDepots,
                hasNextPage: page < Math.ceil(totalDepots / limit),
                hasPrevPage: page > 1
            },
            data: depots
        });

    } catch (error) {
        console.error('Get All Depots With Admins Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};


// Super Admin only: Change password of any depot admin (with same-password protection)
exports.changeAdminPassword = async (req, res) => {
    try {
        const { adminId, newPassword } = req.body;

        // Validate input
        if (!adminId) {
            return res.status(400).json({
                success: false,
                message: "Admin ID is required"
            });
        }

        if (!newPassword || newPassword.trim().length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password is required and must be at least 6 characters long'
            });
        }

        const trimmedNewPassword = newPassword.trim();

        // Find the admin
        const admin = await Admin.findById(adminId).select('+passwordHash'); // Important: include passwordHash

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        // Prevent changing superadmin password
        if (admin.role === 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Cannot change superadmin password using this endpoint'
            });
        }

        // NEW: Check if new password is same as current one
        const isSamePassword = await bcrypt.compare(trimmedNewPassword, admin.passwordHash);
        if (isSamePassword) {
            return res.status(400).json({
                success: false,
                message: 'New password cannot be the same as the current password'
            });
        }

        // Hash the new password
        const passwordHash = await bcrypt.hash(trimmedNewPassword, 10);

        // Update password and timestamp
        admin.passwordHash = passwordHash;
        admin.updatedAt = Date.now();
        await admin.save();

        res.status(200).json({
            success: true,
            message: `Password successfully changed for admin: ${admin.adminname} (${admin.email})`,
            data: {
                adminId: admin._id,
                adminname: admin.adminname,
                email: admin.email,
                updatedAt: admin.updatedAt
            }
        });

    } catch (error) {
        console.error('Change Admin Password Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// GET /api/admins/:adminId/details
// Super Admin clicks on an admin → get full depot hierarchy (parent or children)
exports.getAdminDepotDetails = async (req, res) => {
    try {
        const { adminId } = req.params;

        // 1. Find the admin and populate their depot + parent's basic info
        const admin = await Admin.findById(adminId)
            .select('adminname email role createdAt updatedAt depotId')
            .populate({
                path: 'depotId',
                select: 'name code type district parentDepot isActive commencementDate',
                populate: {
                    path: 'parentDepot',
                    select: 'name code district type'
                }
            });

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        if (admin.role !== 'admin') {
            return res.status(400).json({
                success: false,
                message: 'This endpoint is only for depot admins (role: admin)'
            });
        }

        if (!admin.depotId) {
            return res.status(400).json({
                success: false,
                message: 'This admin is not assigned to any depot'
            });
        }

        const depot = admin.depotId;

        // 2. Unified hierarchy: either parent (if sub) OR sub-depots (if main)
        const hierarchy = {
            parent: null,
            subDepots: []
        };

        if (depot.type === 'main') {
            // MAIN DEPOT → Get all sub-depots + their admins
            const childDepots = await Depot.find({ parentDepot: depot._id })
                .select('name code district isActive _id')
                .lean();

            hierarchy.subDepots = await Promise.all(
                childDepots.map(async (sub) => {
                    const subAdmin = await Admin.findOne({
                        depotId: sub._id,
                        role: 'admin'
                    }).select('adminname email _id');

                    return {
                        depot: {
                            id: sub._id,
                            name: sub.name,
                            code: sub.code,
                            district: sub.district,
                            isActive: sub.isActive
                        },
                        admin: subAdmin ? {
                            adminname: subAdmin.adminname,
                            email: subAdmin.email,
                            id: subAdmin._id
                        } : null
                    };
                })
            );
        } else {
            // SUB DEPOT → Get parent depot + its admin
            if (depot.parentDepot) {
                const parentAdmin = await Admin.findOne({
                    depotId: depot.parentDepot._id,
                    role: 'admin'
                }).select('adminname email _id');

                hierarchy.parent = {
                    depot: {
                        id: depot.parentDepot._id,
                        name: depot.parentDepot.name,
                        code: depot.parentDepot.code,
                        district: depot.parentDepot.district,
                        type: depot.parentDepot.type
                    },
                    admin: parentAdmin ? {
                        adminname: parentAdmin.adminname,
                        email: parentAdmin.email,
                        id: parentAdmin._id
                    } : null
                };
            }
        }

        // Final response
        res.json({
            success: true,
            data: {
                admin: {
                    id: admin._id,
                    adminname: admin.adminname,
                    email: admin.email,
                    createdAt: admin.createdAt,
                    updatedAt: admin.updatedAt
                },
                depot: {
                    id: depot._id,
                    name: depot.name,
                    code: depot.code,
                    type: depot.type,
                    district: depot.district,
                    isActive: depot.isActive,
                    commencementDate: depot.commencementDate
                },
                hierarchy
            }
        });

    } catch (error) {
        console.error('Get Admin Depot Details Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};