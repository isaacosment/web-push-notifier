function register() {
  if (!isBrowserSupported()) {
    alert('Sorry! This browser does not support Push notifications.');
    return;
  }

  try {
    askPermission()
    .then(subscribeUserToPush())
    .catch((err) => {
      alert('Failed to subscribe to push notifications!' + err);
    });
  } catch (err) {
    alert('Failed to subscribe to push notifications!' + err);
  }
}

function isBrowserSupported() {
    if (!('serviceWorker' in navigator)) {
        alert('Service worker not supported')
        // Service Worker isn't supported on this browser, disable or hide UI.
        return false;
    }
    
    if (!('PushManager' in window)) {
    // Push isn't supported on this browser, disable or hide UI.
      alert('PushManager not supported')
        return false;
    }

    return true;
}

function registerServiceWorker() {
    return navigator.serviceWorker.register('/assets/js/service-worker.js')
    .then(function(registration) {
        console.log('Service worker successfully registered.');
        return registration;
    })
    .catch(function(err) {
        console.error('Unable to register service worker.', err);
    });
}

function askPermission() {
    return new Promise(function(resolve, reject) {
      const permissionResult = Notification.requestPermission(function(result) {
        resolve(result);
      });
  
      if (permissionResult) {
        permissionResult.then(resolve, reject);
      }
    })
    .then(function(permissionResult) {
      if (permissionResult !== 'granted') {
        throw new Error('We weren\'t granted permission.');
      }
    });
}  

async function subscribeUserToPush() {
  const registration = await registerServiceWorker();
  const subscribeOptions = {
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      'BKDQ4kG-pg2dBoYYqz6QfogZJBGpBk9-ACqU570unC37R8ecVgQUCaHVc0yoNgPljBBhh0EjWrolPDdDzfs7NJo'
    )
  };
  
  const pushSubscription = await registration.pushManager.subscribe(subscribeOptions);
  console.log('Received PushSubscription: ', JSON.stringify(pushSubscription));
  sendSubscriptionToBackEnd(pushSubscription);
  
  console.log('Successfully subscribed to push notifications.');
  return pushSubscription;
}

async function sendSubscriptionToBackEnd(subscription) {
  console.log('Sending Push subscription to back end.');
    const response = await fetch('/api/save-subscription/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(subscription)
  });
  if (!response.ok) {
    throw new Error('Bad status code from server.');
  }
  const responseData = await response.json();
  if (!(responseData && responseData.success)) {
    console.error(responseData);
    throw new Error('Bad response from server.');
  } else {
    console.log("Subscription saved successfully.");
  }
  }

async function sendTestNotification() {
  try {
    var response = await fetch(
      '/api/send-notification', {
      method: 'POST'
    });
    if (response.status == 200) {
      console.log("Notification request submitted successfully.");
    } else {
      throw new Error(`Failed to submit notification. Status returned was ${response.status}`);
    }
  } catch (err) {
    console.error("Failed to sent notification");
  }
}
  
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}