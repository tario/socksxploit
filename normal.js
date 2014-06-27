// no se puede usar npm install como normalmente se haria
// porque hay que modificar la libreria con nuestra propia version
var argyle = require('./lib/argyle/index.js');

// este es un proxy socks5 normal
var server = argyle(8080, '0.0.0.0');
server.on('connected', function(req, dest) {
    req.pipe(dest);
    dest.pipe(req);
});

