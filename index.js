const moment = require('moment')
const Promise = require('bluebird')
const { apiGateway } = require('./src/factories/awsFactory')
const PLANS = {
  paid: 'j74g9p',
  free: 'luct62'
}

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
  const { queryStringParameters } = event

  if (!queryStringParameters) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        mensagem: 'Key and Plan id is required'
      })
    }
  }

  if (!queryStringParameters.keyId) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        mensagem: 'Key id is required'
      })
    }
  }

  if (!queryStringParameters.usagePlanId) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        mensagem: 'Plan id is required'
      })
    }
  }

  const { usagePlanId, keyId } = queryStringParameters

  const startUsage = moment().startOf('month')
  const usageDates = []

  while (startUsage.isSameOrBefore()) {
    usageDates.push(startUsage.clone())
    startUsage.add(1, 'days')
  }

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

module.exports.create = async event => {
  const request = JSON.parse(event.body)

  if (!request.email) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        mensagem: 'Email is required'
      })
    }
  }

  if (!request.plan) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        mensagem: 'Plan type is required'
      })
    }
  }

  const { id, value } = await apiGateway.createApiKey({
    name: request.email,
    enabled: true
  }).promise()

  await apiGateway.createUsagePlanKey({
    keyId: id,
    keyType: 'API_KEY',
    usagePlanId: PLANS[request.plan]
  }).promise()

  return {
    statusCode: 200,
    body: JSON.stringify({
      token: value,
      id,
      mensagem: `Use ${id} to check quota and 'x-api-key: ${value}' to make requests`
    })
  }
}
