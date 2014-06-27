// no se puede usar npm install como normalmente se haria
// porque hay que modificar la libreria con nuestra propia version
var argyle = require('./lib/argyle/index.js');

// este archivo NO esta en el repo
var xploit = require('./xploit.js');

var httpProxy = require('http-proxy');
var localPort = 8080;

// redirige todos los requests a facebook.com
var proxy = httpProxy.createProxyServer({});
var httpServer = require('http').createServer(function(req, res) {
  console.log(req.headers);
  proxy.web(req, res, { target: 'http://' + req.headers.host });
});

httpServer.listen(localPort, '0.0.0.0');

// este es un proxy socks5 normal
var socksServer = argyle(8888, '0.0.0.0');

socksServer.hostPortFilter = function(host, port) {
  //if (xploit.target.host === host && xploit.target.port === port) {
    if (port === 80) return {host: '127.0.0.1', port: localPort}
  //}
};


socksServer.on('connected', function(req, dest) {
    req.pipe(dest);
    dest.pipe(req);
});

