const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const webpush = require('web-push')
const path = require('path')
const { RSA_NO_PADDING } = require('constants')

const AppDAO = require('./src/data/dao')
const SubscriptionRepository = require('./src/data/subscription_repository')

require('dotenv').config()

// Set VAPID keys from the environment variables
webpush.setVapidDetails(
  process.env.VAPID_ID,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

const dao = new AppDAO(process.env.DATABASE)
const subscriptionRepo = new SubscriptionRepository(dao)

subscriptionRepo
  .createTable()
  .then(() => subscriptionRepo.getActive())
  .then((data) => {
    const numSubscribers = data.length
    console.log(`${numSubscribers} active subcriber${(numSubscribers == 1 ? '' : 's')} found.`)
  })

const saveToDatabase = async subscription => {
  subscriptionRepo.replace(
    subscription.endpoint,
    subscription.expirationTime, 
    subscription.keys.p256dh, 
    subscription.keys.auth
  )
}


const app = express()
app.use(cors())
app.use(bodyParser.json())

app.use(express.static(path.join(__dirname, 'public')))
//app.get('/', (req, res) => res.send('Server is running'))

// The new /save-subscription endpoint
app.post('/api/save-subscription', async (req, res) => {
  const subscription = req.body
  console.log("Received client subscription request.")
  await saveToDatabase(subscription) //Method to save the subscription to Database
  res.json({ message: 'success' })
})

//route to test send notification
/*app.post('/send-notification', (req, res) => {
  msg = {
    title: 'Survey response received',
    options: {
      body: 'A customer has completed a survey. Check the BT program for results.'
    }
  }
  broadcastNotification(msg)
  res.json({ message: 'Message broadcast successfully'})
})
*/

const port = process.env.PORT
app.listen(port, () => console.log(`Example app listening on port ${port}!`))

const broadcastNotification = async (msg) => {
  const subscriptions = await subscriptionRepo.getActive()

  if (!subscriptions) {
    console.log('Cannot broadcast message. No active subscribers.')
    return;
  }

  const numSubscribers = subscriptions.length
  console.log(`Broadcasting message to ${numSubscribers} subscriber${(numSubscribers == 1 ? '' : 's')}`)

  const message = JSON.stringify(msg)
  for (let subscription of subscriptions) {
    try {
      await sendNotification(subscription, message)  
    } catch (e) {
      if (e instanceof webpush.WebPushError && e.statusCode == 410) { // Unsubscribed or blocked, remove subscription
        console.log('Removing unregistered subscription')
        await subscriptionRepo.delete(subscription.id)
      } else {
        console.log('An error occurred while sending notification: ' + e.message)
      }
    }
  }
}

//function to send the notification to the subscribed device
const sendNotification = async (subscription, dataToSend='') => {
  await webpush.sendNotification(subscription, dataToSend)
}