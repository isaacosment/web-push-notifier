self.addEventListener('push', function(event) {
  try {
    if (!(self.Notification && self.Notification.permission === 'granted')) {
      console.log("Notifications not supported or permission not granted. Ignoring push message.");
      return;
    }

    console.log("Received push event");
    //alert('Received push notification');
    if (event.data) {
      console.log('This push event has data: ', event.data.text());
    } else {
      console.log('This push event has no data.');
    }

    var data = event.data || [];
    var title = data.title || "Something Has Happened";
    var message = data.message || "Here's something you might want to check out.";
    //var icon = "images/new-notification.png";

    var notification = {
      body: message
    }

    self.registration.showNotification(title, notification);
    
    console.log("Notification shown.");
  } catch (err) {
    console.error("Error in service worker push event")
    console.error(err)
  }
});