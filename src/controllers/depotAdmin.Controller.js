const Staff = require('../models/staff.model.js')
const Depot = require('../models/depot.models.js')
const Admin = require('../models/admin.models.js');
// create or add new driver or conductor
exports.addStaff = async (req, res) => {
    try {
        const { name, code, role, depotId, phone, licenseNumber } = req.body;
        if (!name || !role) {
            return res.status(400).json({
                success: false,
                message: 'Name and role are required'
            });
        }

        if (!['driver', 'conductor'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Role must be driver or conductor'
            });
        }


        const targetDepotId = depotId || req.user.depotId;

        if (req.admin.role !== 'admin' && targetDepotId.toString() !== req.admin.depotId.toString()) {
            return res.status(403).json({ message: "You can only add staff to your own depot" })
        }

        const staff = await Staff.create({
            name, role, phone, licenseNumber: role === 'driver' ? licenseNumber : undefined
            , depotId: targetDepotId
        })

        const populated = await Staff.findById(staff._id).populate('depotId', 'name code type');

        res.status(201).json({
            success: true,
            message: `${role} added successfully`,
            data: {
                id: staff._id,
                name: staff.name,
                code: staff.code,
                role: staff.role,
                depot: populated.depotId
            }
        })
    } catch (error) {
        res.status(500).json({ message: error.message, success: false })
    }
}

// transfer staff to another depot
exports.transferStaff = async (req, res) => {
    try {
        const { staffId, newDepotId } = req.body;

        const staff = await Staff.findById(staffId);
        if (!staff) {
            return res.status(404).json({ success: false, message: "Staff not found" })
        }

        // only allowing super-admin and  depot-admin transferring1 from his own depot
        if (req.admin.role === 'admin' && staff.depotId.toString() !== req.admin.depotId.toString()) {
            return res.status(403).json({ success: false, message: "You can only transfer staff the from your own depot" })
        }

        const newDepot = await Depot.findById(newDepotId);
        if (!newDepot) {
            return res.status(404).json({ success: false, message: "Target Depot not found" })
        }

        staff.depotId = newDepotId; // after finding changing id
        await staff.save()

        const updated = await Staff.findById(staff._id).populate('depotId', 'name code type');

        res.status(200).json({
            success: true,
            message: 'Staff transferred successfully',
            data: updated
        })

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// listing all staff in the depot admin
exports.getMyStaff = async (req, res) => {
    try {
        const staff = await Staff.find({ depotId: req.admin.depotId })
            .select('-__v')
            .sort({ role: 1, name: 1 })

        res.status(200).json({ success: true, count: staff.length, data: staff })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

exports.getAllDepots = async (req, res) => {
    try {
          // Find all depots that are NOT assigned to any admin
        const assignedDepots = await Admin.find({ role: 'admin' }).select('depotId');
        const assignedDepotIds = assignedDepots.map(admin => admin.depotId.toString()); // this gives array of assigned depot ids
        const depots = await Depot.find({_id:{ $nin : assignedDepotIds}}).select('_id name code type district parentDepot').sort({ name: 1 });
        const formattedDepots = depots.map(depot => ({
            id: depot._id,
            name: depot.name,
            code: depot.code,
            type: depot.type,
            district: depot.district,
            parentDepot: depot.parentDepot
        }));
        res.status(200).json({
            success: true,
            count: formattedDepots.length,
            data: formattedDepots
        });
    } catch (error) {
        console.error('Get All Depots Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
}