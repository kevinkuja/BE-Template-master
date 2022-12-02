const { Job, Contract, Profile, sequelize } = require('../model')
const { Op } = require('sequelize')

async function getBestProfession(start, end) {
	const result = await Job.findOne({
		where: {
			paid: true,
			paymentDate: {
				[Op.lte]: end,
				[Op.gte]: start,
			},
		},
		include: {
			model: Contract,
			include: {
				model: Profile,
				as: 'Contractor',
				attributes: ['profession'],
			},
		},
		group: ['profession'],
		limit: 1,
		order: [[sequelize.fn('sum', sequelize.col('price')), 'DESC']],
	})
	return result && result.Contract && result.Contract.Contractor
		? result.Contract.Contractor.profession
		: null
}

async function getBestClients(start, end, limit = 2) {
	return (
		await Job.findAll({
			attributes: [[sequelize.fn('sum', sequelize.col('price')), 'paid']],
			where: {
				paid: true,
				paymentDate: {
					[Op.lte]: end,
					[Op.gte]: start,
				},
			},
			include: {
				model: Contract,
				include: {
					model: Profile,
					as: 'Client',
					attributes: [
						'id',
						[sequelize.literal("firstName || ' ' || lastName"), 'fullName'],
					],
				},
			},
			group: ['Contract.Client.id'],
			limit,
			order: [[sequelize.fn('sum', sequelize.col('price')), 'DESC']],
		})
	).map((profile) => ({
		id: profile.Contract.Client.id,
		fullName: profile.Contract.Client.dataValues.fullName,
		paid: profile.paid,
	}))
}

module.exports = { getBestProfession, getBestClients }
