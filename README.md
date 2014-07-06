Este es un proxy SOCKS modificado para alterar los contenidos de la pagina, es decir,
hacer un Man in the Middle.

Para interceptar http basta con configurar el browser para que use nuestra app como proxy socks, por default se abre en el puerto 8888


Para interceptar https, se hace lo mismo, pero ademas hay que generar las claves

1) Correr ./utils/build-ca para generar el certificado de la autoridad de certificados, en keys/ca.crt

2) PARA CADA HOSTNAME, correr ./utils/build-req <hostname> <serial>, esto genera el certificado de servidor que se usara para los request a ese hostname que pasen por el proxy, se almacena en key/<hostname>/ssl-server

3) PARA CADA HOSTNAME, correr ./utils/sign-req <hostname>, este firma en certificado generado en el paso 2, con el certificado CA generado en el paso 1


El paso 1 solo tiene que hacerse una vez, el paso 2 y 3 para cada hostname posible al que van ir dirigidas las requests

El CA generado en el paso 1 tiene que instalarse en el browser, en el telefono, o en donde sea que se van a originar los request que se van a interceptar ( es muy parecido a como hace el fiddler para interceptar traffico HTTPS)
