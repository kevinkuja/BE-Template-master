const { Profile } = require('../model')

async function getProfile(profileId, t) {
	return await Profile.findOne(
		{
			where: { id: profileId },
		},
		{ transaction: t }
	)
}

async function updateBalance(profile, amount, t) {
	await Profile.update(
		{ balance: profile.balance + amount },
		{ where: { id: profile.id } },
		{ transaction: t }
	)
}

module.exports = { getProfile, updateBalance }
