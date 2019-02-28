const _ = require('lodash/fp')
const express = require('express')
const md5 = require('js-md5')
const { google } = require('googleapis')
const { Storage } = require('@google-cloud/storage')

const app = express()

app.get('/hashEmails', async (req, res) => {
  try {
    if (!(req.get('x-appengine-cron') === 'true')) {
      res.status(403).end(JSON.stringify({ error: { message: 'unauthorized' } }))
      return
    }
    const storage = new Storage()
    const privatekeyUrl = 'https://www.googleapis.com/storage/v1/b/terra-tide-data-utils/o/privatekey.json?alt=media'
    const client = await google.auth.getClient({
      scopes: 'https://www.googleapis.com/auth/devstorage.read_only'
    })
    const privatekey = await client.request({ url: privatekeyUrl })
    const jwtClient = new google.auth.JWT(
      privatekey.data.client_email,
      null,
      privatekey.data.private_key,
      ['https://www.googleapis.com/auth/spreadsheets.readonly'])
    jwtClient.authorize(err =>  {
      if (err) { console.log(err) }
    })

    const sheets = google.sheets('v4')
    const result = await new Promise((resolve, reject) => {
      sheets.spreadsheets.values.get({
        auth: jwtClient,
        spreadsheetId: '1zYYMqJv90DJJ1_JDye7lJoE45x9z9oxuRPq5A-XLJ6M',
        range: 'B2:B'
      }, (err, result) => {
        if (err) { reject(err) } else { resolve(result) }
      })
    })

    const emails = _.flattenDeep(_.map(v => _.split(',', v), _.flattenDeep(result.data.values)))
    const trimmedEmails = _.map(v => _.trim(v), emails)
    const hashedEmails = JSON.stringify(_.map(v => md5(v), trimmedEmails))
    await storage.bucket('terra-tide-prod-data').file('whitelistEmails').save(hashedEmails)
    res.sendStatus(200)
  } catch (error) {
    res.status(500).send(error.toString())
    console.log(error)
  }
})

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080
app.listen(PORT, () => { console.log(`Server listening on port ${PORT}...`) })
