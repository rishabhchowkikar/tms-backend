const mongoose = require('mongoose');

const depotSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['main', 'sub'],
        required: true
    },
    parentDepot: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Depot',
        default: null,
        validate: {
            validator: function (v) {
                return this.type === 'sub' ? v !== null : v === null;
            },
            message: 'parentDepot is required for sub-depot and must be null for main depot'
        }
    },
    district: {
        type: String,
        required: true,
        uppercase: true
    },
    commencementDate: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Index for fast queries
depotSchema.index({ code: 1 });
depotSchema.index({ type: 1 });
depotSchema.index({ parentDepot: 1 });

module.exports = mongoose.model('Depot', depotSchema);