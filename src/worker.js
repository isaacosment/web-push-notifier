const { workerData, parentPort } = require('worker_threads')

for (let userId of workerData) {
    console.log(`Worker processing user id ${userId}`);
}

// You can do any heavy stuff here, in a synchronous way
// without blocking the "main thread"
parentPort.postMessage({ hello: workerData })