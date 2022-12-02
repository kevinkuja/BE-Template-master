const { Job, Contract, sequelize } = require('../model')
const { Op } = require('sequelize')
const profileService = require('./profile.service')


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

async function payJob(job_id, profileId) {
	await sequelize.transaction(async (t) => {
		const job = await getUnpaidJob(job_id, profileId, t)

		if (!job) throw new Error(404)
		const client = await profileService.getProfile(job.Contract.ClientId, t)
		if (!client) throw new Error(404)

		const contractor = await profileService.getProfile(
			job.Contract.ContractorId,
			t
		)
		if (!contractor) throw new Error(404)
		//Check condition
		if (client.balance < job.price) throw new Error(400)

		await profileService.updateBalance(contractor, job.price, t)
		await profileService.updateBalance(client, -job.price, t)

		await Job.update(
			{ paid: true, paymentDate: new Date() },
			{ where: { id: job_id } },
			{ transaction: t }
		)
	})
}

async function depositToUser(userId, amount) {
	await sequelize.transaction(async (t) => {
		const activeUnpaidJobs = await getActiveUnpaidJobs(userId, t)

		const client = await profileService.getProfile(userId, t)
		if (!client || client.type != 'client') throw new Error(404)

		const debt = activeUnpaidJobs.reduce((amount, job) => amount + job.price, 0)
		//Check condition
		if (amount > debt * 0.25) throw new Error(400)

		await profileService.updateBalance(client, amount, t)
	})
}

module.exports = { getActiveUnpaidJobs, getUnpaidJob, payJob, depositToUser}
