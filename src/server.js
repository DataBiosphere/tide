const _ = require('lodash/fp')
const express = require('express')
const md5 = require('js-md5')
const {google} = require('googleapis')
const {Storage} = require('@google-cloud/storage')

//TO DO:
//cron stuff (haven't tested)
//added changes on saturn end (haven't tested)
//deploy new app
//create repo for all this


const app = express()

app.get('/hashEmails', async (req, res) => {
  try {
    const auth = await google.auth.getClient({ scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] })
    const sheets = google.sheets({version: 'v4', auth})
    const storage = new Storage()

    const result = await new Promise((resolve, reject) => {
      sheets.spreadsheets.values.get({
        spreadsheetId: '1zYYMqJv90DJJ1_JDye7lJoE45x9z9oxuRPq5A-XLJ6M',
        range: 'B2:B' }, (err, result) => {
        if (err) {reject(err)}
        else {resolve(result)}
      })
    })

    const emails = _.flattenDeep(_.map(v => _.split(',', v), _.flattenDeep(result.data.values)))
    const trimmedEmails = _.map(v=>_.trim(v), emails)
    const hashedEmails = JSON.stringify(_.map(v=>md5(v), trimmedEmails))
    await storage.bucket('terra-tide-prod-data').file('whitelistEmails').save(hashedEmails)
    res.sendStatus(200)
  } catch (error) {
    res.sendStatus(500)
    console.log(error)
  }
})

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => { console.log(`Server listening on port ${PORT}...`)})