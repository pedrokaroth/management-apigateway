const moment = require('moment')
const Promise = require('bluebird')
const { apiGateway } = require('./src/factories/awsFactory')

module.exports.handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: new Date().toISOString()
      }
    )
  }
}

module.exports.usage = async (event) => {
  const startUsage = moment().startOf('month')
  const usageDates = []

  while (startUsage.isSameOrBefore()) {
    usageDates.push(startUsage.clone())
    startUsage.add(1, 'days')
  }

  const usagePlanId = 'j74g9p'
  const keyId = 'es6tziwo66'

  const { quota: { limit } } = await apiGateway.getUsagePlan({ usagePlanId }).promise()

  const usage = await Promise.map(usageDates, date => {
    return apiGateway.getUsage({
      keyId,
      usagePlanId,
      startDate: date.startOf('day').format('YYYY-MM-DD'),
      endDate: date.endOf('day').format('YYYY-MM-DD')
    }).promise()
  })

  const usages = usage.reduce((usages, { startDate: date, items }) => {
    usages.push({
      date,
      usage: {
        consumed: items[keyId] ? items[keyId][0][0] : 0,
        remaining: items[keyId] ? items[keyId][0][1] : limit
      }
    })
    return usages
  }, [])

  return {
    statusCode: 200,
    body: JSON.stringify({
      usages
    })
  }
}
