const sendmailFactory = require('sendmail');
const directSendmail = sendmailFactory({ silent: true });

directSendmail({
  from: '"Cloud Session Recorder" <noreply@cybaemtech.com>',
  to: "Nikita.Nagargoje@cybaemtech.com",
  subject: "Test email",
  html: "Test email body",
}, (err, reply) => {
  if (err) console.error("Error:", err);
  else console.log("Reply:", reply);
});
