const express = require('express')
const bodyParser = require('body-parser')
const { sequelize } = require('./model')
const { getProfile } = require('./middleware/getProfile')
const app = express()
app.use(bodyParser.json())
app.set('sequelize', sequelize)
app.set('models', sequelize.models)
const { Op } = require('sequelize')
const { Job, Contract } = require('./model')

const profileService = require('./services/profile.service')
const jobService = require('./services/job.service')
const adminService = require('./services/admin.service')
const contractService = require('./services/contract.service')

/**
 * @returns contract by id and user
 */
app.get('/contracts/:id', getProfile, async (req, res) => {
	const { id } = req.params
	const contract = await contractService.getContract(id, req.profile.id)
	if (!contract) return res.status(404).end()
	res.json(contract)
})

/**
 * @returns all non-terminated contracts by user
 */
app.get('/contracts/', getProfile, async (req, res) => {
	const contracts = await contractService.getContracts(req.profile.id)
	res.json(contracts)
})

/**
 * @returns all unpaid jobs for a user (***either*** a client or contractor), for ***active contracts only***.
 */
app.get('/jobs/unpaid/', getProfile, async (req, res) => {
	const activeUnpaidJobs = await jobService.getActiveUnpaidJobs(req.profile.id)
	res.json(activeUnpaidJobs)
})

/**
 * Pay for a job, a client can only pay if his balance >= the amount to pay. The amount should be moved from the client's balance to the contractor balance.
 */
app.post('/jobs/:job_id/pay', getProfile, async (req, res) => {
	const { job_id } = req.params

	try {
		await sequelize.transaction(async (t) => {
			const job = await jobService.getUnpaidJob(job_id, req.profile.id, t)

			if (!job) return res.status(404).end()
			const client = await profileService.getProfile(job.Contract.ClientId, t)
			if (!client) return res.status(404).end()

			const contractor = await profileService.getProfile(
				job.Contract.ContractorId,
				t
			)
			if (!contractor) return res.status(404).end()
			//Check condition
			if (client.balance < job.price) return res.status(400).end()

			await profileService.updateBalance(contractor, job.price, t)
			await profileService.updateBalance(client, -job.price, t)

			await Job.update(
				{ paid: true, paymentDate: new Date() },
				{ where: { id: job_id } },
				{ transaction: t }
			)
			return res.status(200).end()
		})
	} catch (error) {
		return res.status(400).end()
	}
})

/**
 *  Deposits money into the the the balance of a client, a client can't deposit more than 25% his total of jobs to pay. (at the deposit moment)
 */
app.post('/balances/deposit/:userId', getProfile, async (req, res) => {
	const { userId } = req.params
	const { amount } = req.body
	try {
		await sequelize.transaction(async (t) => {
			const activeUnpaidJobs = await jobService.getActiveUnpaidJobs(userId, t)

			const client = await profileService.getProfile(userId, t)
			if (!client || client.type != 'client') return res.status(404).end()

			const debt = activeUnpaidJobs.reduce(
				(amount, job) => amount + job.price,
				0
			)
			//Check condition
			if (amount > debt * 0.25) return res.status(400).end()

			await profileService.updateBalance(client, amount, t)

			return res.status(200).end()
		})
	} catch (error) {
		return res.status(400).end()
	}
})

/**
 * @returns the profession that earned the most money (sum of jobs paid) for any contactor that worked in the query time range
 */
app.get('/admin/best-profession', getProfile, async (req, res) => {
	const bestProfession = await adminService.getBestProfession(
		req.query.start,
		req.query.end
	)
	res.json(bestProfession)
})

/**
 * @returns returns the clients the paid the most for jobs in the query time period. limit query parameter should be applied, default limit is 2.
 */
app.get('/admin/best-clients', getProfile, async (req, res) => {
	const bestClients = await adminService.getBestClients(
		req.query.start,
		req.query.end,
		req.query.limit
	)
	res.json(bestClients)
})

module.exports = app
