const { Contract } = require('../model')
const { Op } = require('sequelize')

async function getContract(id, profileId) {
    return await Contract.findOne({
        where: {
            id,
            [Op.or]: [{ clientId: profileId }, { contractorId: profileId }],
        },
    })
}

async function getContracts(profileId) {
    return await Contract.findAll({
        where: {
            status: {
                [Op.ne]: 'terminated',
            },
            [Op.or]: [{ clientId: profileId }, { contractorId: profileId }],
        },
    })
}

module.exports = { getContract, getContracts }