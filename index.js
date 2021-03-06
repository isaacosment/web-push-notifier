const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const webpush = require('web-push')
const path = require('path')
const { RSA_NO_PADDING } = require('constants')
const ejs = require('ejs');

const AppDAO = require('./src/data/dao')
const SubscriptionRepository = require('./src/data/subscription_repository')

require('dotenv').config({ path: `${__dirname}/.env` })

// Set VAPID keys from the environment variables
webpush.setVapidDetails(
  process.env.VAPID_ID,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

const dao = new AppDAO(`${__dirname}/` + process.env.DATABASE)
const subscriptionRepo = new SubscriptionRepository(dao)

subscriptionRepo
  .createTable()
  .then(() => subscriptionRepo.getActive())
  .then((data) => {
    const numSubscribers = data.length
    console.log(`${numSubscribers} active subcriber${(numSubscribers == 1 ? '' : 's')} found.`)
  })

async function saveToDatabase(subscription) {
  console.log(subscription);
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
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public'),{index:false,extensions:['html']}));
app.use(express.static(path.join(__dirname, 'public/pages'),{index:false,extensions:['html']}));

app.get('/', (req, res) => res.send('Server is running'))

app.post('/api/save-subscription', async (req, res) => {
  const subscription = req.body
  console.log("Received request to save client subscription.")
  await saveToDatabase(subscription) //Method to save the subscription to Database
  console.log("Client subscription saved successfully.")
  res.json({ message: 'Subscription saved.', success: true })
})

app.post('/api/send-notification', (req, res) => {
  msg = {
    title: 'Test notification',
    options: {
      body: 'Test notification body text.'
    }
  }
  broadcastNotification(msg)
  res.json({ message: 'Message broadcast successfully'})
})

// Dropbox webhook validation
app.get('/dropbox/webhook', (req, res) => {
  var challenge = req.query.challenge;
  res.header('Content-Type', 'text/plain');
  res.header('X-Content-Type-Options', 'nosniff');
  res.send(challenge);
});

// Dropbox webhook callback
app.post('/dropbox/webhook', (req, res) => {
  console.log("Received notification request from Dropbox Webhook");
  console.log(req.body);
  let userIds = req.body.list_folder.accounts;
  for (let userId of userIds) {
    console.log(`User ${userId} files have changed.`);
  }
  runService(userIds);
  res.send('Done');
});

const { Worker } = require('worker_threads')

function runService(workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./src/worker.js', { workerData });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0)
        reject(new Error(`Worker stopped with exit code ${code}`));
    })
  })
}

const port = process.env.PORT
app.listen(port, () => console.log(`Push notification server listening on port ${port}!`))

async function broadcastNotification(msg) {
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
async function sendNotification(subscription, dataToSend='') {
  var result = await webpush.sendNotification(subscription, dataToSend)
  if (result.statusCode == 201) {
    console.log("Notification sent successfully.")
  } else {
    console.log("Failed to send notification.")  
  }
  //console.log(result)
}