const dns = require('dns');
dns.resolveMx('cybaemtech.com', (err, addresses) => {
  if (err) console.error(err);
  else console.log(addresses);
});
