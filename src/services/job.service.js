const { Job, Contract } = require('../model')
const { Op } = require('sequelize')

async function getActiveUnpaidJobs(profileId, transaction) {
	return await Job.findAll(
		{
			where: {
				paid: {
					[Op.not]: true,
				},
			},
			include: {
				model: Contract,
				where: {
					status: 'in_progress',
					[Op.or]: [{ clientId: profileId }, { contractorId: profileId }],
				},
			},
		},
		transaction
	)
}

async function getUnpaidJob(job_id, profileId, t) {
    return await Job.findOne(
        {
            where: {
                id: job_id,
                paid: {
                    [Op.not]: true,
                },
            },
            include: {
                model: Contract,
                where: {
                    clientId: profileId,
                },
            },
        },
        { transaction: t }
    )
}


module.exports = { getActiveUnpaidJobs, getUnpaidJob}
