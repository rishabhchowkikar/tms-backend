const { mongoose } = require('mongoose')

const staffSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    code: {
        type: String,
        unique: true,
        uppercase: true,
        trim: true,
    },
    role: {
        type: String,
        enum: ["driver", "conductor"],
        required: true,
    },
    depotId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Depot",
        required: true,
    },
    isActive: {
        type: Boolean,
        default: false,
    },
    phone: String,
    licenseNumber: String,
}, { timestamps: true });

// auto Generate code
staffSchema.pre('save', async function (next) {
    if (!this.code) {
        let code;
        const prefix = this.role === 'driver' ? "DRV" : "CON";
        let isUnique = false;

        while (!isUnique) {
            const randomNumber = Math.floor(1000 + Math.random() * 9000) // 4 digit random number
            code = `${prefix}-${randomNumber}`;
            const existingStaff = await mongoose.models.Staff.findOne({ code })
            if (!existingStaff) isUnique = true;
        }
        this.code = code;
    }
    next()
});

// Index
staffSchema.index({ depotId: 1, role: 1 });
staffSchema.index({ code: 1 });

module.exports = mongoose.model('Staff', staffSchema);