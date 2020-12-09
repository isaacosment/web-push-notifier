const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const webpush = require('web-push')
const { RSA_NO_PADDING } = require('constants')

const app = express()
app.use(cors())
app.use(bodyParser.json())

const port = 4000
const vapidKeys = {
  publicKey:  'BA3NFy79FsAzz-HoUCkg-qhyRPTu83sxyELhU1SG630VHNOMTEpngImR7JjNHbzohj9fHP2DnbqUDAECSX2wPTI',
  privateKey: 'Fse4DX-8ADB5DJ6hahqCsFRzNHnbdg3j5EKJSwyJt3k',
}
//setting our previously generated VAPID keys
webpush.setVapidDetails(
  'mailto:it@bigtyre.com.au',
  vapidKeys.publicKey,
  vapidKeys.privateKey
)


const dummyDb = { subscription: null } //dummy in memory store
const saveToDatabase = async subscription => {
  // Since this is a demo app, I am going to save this in a dummy in memory store. Do not do this in your apps.
  // Here you should be writing your db logic to save it.
  dummyDb.subscription = subscription
}

app.get('/', (req, res) => res.send('Hello World!'))

// The new /save-subscription endpoint
app.post('/save-subscription', async (req, res) => {
  const subscription = req.body
  await saveToDatabase(subscription) //Method to save the subscription to Database
  res.json({ message: 'success' })
})

//route to test send notification
app.post('/send-notification', (req, res) => {
  const subscription = dummyDb.subscription //get subscription from your databse here.
  if (subscription == null) {
    res.json({message: 'Unable to send message. No subscribers'})
    return
  }
  const message = 'Hello World'
  sendNotification(subscription, message)
  res.json({ message: 'message sent' })
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))


//function to send the notification to the subscribed device
const sendNotification = (subscription, dataToSend='') => {
  webpush.sendNotification(subscription, dataToSend)
}