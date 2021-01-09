function isBrowserSupported() {
    if (!('serviceWorker' in navigator)) {
        // Service Worker isn't supported on this browser, disable or hide UI.
        return false;
    }
    
    if (!('PushManager' in window)) {
    // Push isn't supported on this browser, disable or hide UI.
        return false;
    }

    return true;
}

function registerServiceWorker() {
    return navigator.serviceWorker.register('/service-worker.js')
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

function subscribeUserToPush() {
    return registerServiceWorker()
    .then(function(registration) {
      const subscribeOptions = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          'BKDQ4kG-pg2dBoYYqz6QfogZJBGpBk9-ACqU570unC37R8ecVgQUCaHVc0yoNgPljBBhh0EjWrolPDdDzfs7NJo'
        )
      };
  
      return registration.pushManager.subscribe(subscribeOptions);
    })
    .then(function(pushSubscription) {
      console.log('Received PushSubscription: ', JSON.stringify(pushSubscription));
      return pushSubscription;
    });
}

function sendSubscriptionToBackEnd(subscription) {
    return fetch('/api/save-subscription/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscription)
    })
    .then(function(response) {
      if (!response.ok) {
        throw new Error('Bad status code from server.');
      }
  
      return response.json();
    })
    .then(function(responseData) {
      if (!(responseData.data && responseData.data.success)) {
        throw new Error('Bad response from server.');
      }
    });
  }
  
  