const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const webpush = require('web-push')
const { RSA_NO_PADDING } = require('constants')
const amqp = require('amqplib/callback_api');

require('dotenv').config()

const app = express()
app.use(cors())
app.use(bodyParser.json())

//setting our previously generated VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_ID,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
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
  res.json({ message: 'Message sent successfully.' })
})

const port = process.env.PORT
app.listen(port, () => console.log(`Example app listening on port ${port}!`))


amqp.connect('amqp://localhost', function(error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(function(error1, channel) {
    if (error1) {
      throw error1;
    }
    var queue = 'hello';

    channel.assertQueue(queue, {
      durable: false
    });
  });
});


//function to send the notification to the subscribed device
const sendNotification = (subscription, dataToSend='') => {
  webpush.sendNotification(subscription, dataToSend)
}