function shutdown() {
    console.info('shutdown');
    process.exit(0);
  }
  
function initGracefulShutdown() {
    // based on shutdown example
    console.info('add SIGTERM listener');
    process.on('SIGTERM', function onSigterm () {
        console.info('Received SIGTERM. Graceful shutdown start', new Date().toISOString());
        shutdown();
    });

}


module.exports = {

    init: initGracefulShutdown
  
};