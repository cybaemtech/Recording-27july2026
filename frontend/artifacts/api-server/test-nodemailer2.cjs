const nodemailer = require('nodemailer');

async function test() {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: "Ganesh.Kale@cybaemtech.com",
        pass: "twqdvjfldwkvlcnz",
      }
    });

    const info = await transporter.sendMail({
      from: '"Cloud Session Recorder" <Ganesh.Kale@cybaemtech.com>',
      to: "Ganesh.Kale@cybaemtech.com",
      subject: "Test email from Node without ciphers",
      text: "Testing node mailer",
    });

    console.log("Message sent: %s", info.messageId);
  } catch (err) {
    console.error(err);
  }
}
test();
