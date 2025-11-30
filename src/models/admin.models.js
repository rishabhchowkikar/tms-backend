const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
    adminname: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            "Please enter a valid email address"
        ]
    },
    passwordHash: {
        type: String,
        required: true,
        select: false,
    },
    role: {
        type: String,
        enum: ['superadmin', 'admin'],
        required: true,
    },
    depotId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Depot',
        default: null
    }
}, { timestamps: true });


adminSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.passwordHash);
}

module.exports = mongoose.model('Admin', adminSchema);