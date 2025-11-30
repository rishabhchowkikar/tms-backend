const jwt = require('jsonwebtoken')

const generateToken = (admin) => {
    return jwt.sign(
        { id: admin._id, role: admin.role, depotId: admin.depotId },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    )
}

module.exports = { generateToken };