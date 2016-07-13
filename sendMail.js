/*
 * GET home page.
 */
var debug = require('debug')('SendMail:SendMail');
var nodemailer = require('nodemailer');
// var mailConfig = {
//   "Mailusername": "notifications@axiomnext.com", //'AKIAIW5BZJ2UA2G6CVWQ';
//   "Mailpassword": "Axiom123", //'AuSamdkH07arnehlPSQ1Ek41RzNMfGN0hjwCXlrVtENR';
//   "MailHost": "smtp.gmail.com", //"email-smtp.us-east-1.amazonaws.com";
//   "MailDomain": "smtp.gmail.com",
//   "MailPort": "465",
//   "FromAddress": "notifications@axiomnext.com",
//   "ErrorMailusername": "error@axiomnext.com", //'AKIAIW5BZJ2UA2G6CVWQ';
//   "ErrorMailpassword": "Axiom123", //'AuSamdkH07arnehlPSQ1Ek41RzNMfGN0hjwCXlrVtENR';
//   "ErrorFromAddress": "error@axiomnext.com", //"email-smtp.us-east-1.amazonaws.com";
//   "SecureConnection": true
// };

var mailConfig = {
  "Mailusername": "itrac.nandyal@jsw.in", //'AKIAIW5BZJ2UA2G6CVWQ';
  "Mailpassword": "JSWapr19", //'AuSamdkH07arnehlPSQ1Ek41RzNMfGN0hjwCXlrVtENR';
  "MailHost": "smtp.gmail.com", //"email-smtp.us-east-1.amazonaws.com";
  "MailDomain": "smtp.gmail.com",
  "MailPort": "465",
  "FromAddress": "itrac.nandyal@jsw.in",
  "ErrorMailusername": "itrac.nandyal@jsw.in", //'AKIAIW5BZJ2UA2G6CVWQ';
  "ErrorMailpassword": "JSWapr19", //'AuSamdkH07arnehlPSQ1Ek41RzNMfGN0hjwCXlrVtENR';
  "ErrorFromAddress": "itrac.nandyal@jsw.in", //"email-smtp.us-east-1.amazonaws.com";
  "SecureConnection": true
};

var transport = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: mailConfig.Mailusername,
    pass: mailConfig.Mailpassword
  }
});

function sendMail(ToAddress, Subject, replyTo, htmlData, callback) {
  debug("sendMail", ToAddress);
  if (ToAddress == undefined || ToAddress.length < 10) {
    ToAddress = 'itrac.nandyal@jsw.in';
  }
  var mailOptions = {
    from: mailConfig.FromAddress,
    to: ToAddress,
    subject: Subject,
    replyTo: (replyTo == null || replyTo == undefined ? mailConfig.Mailusername : replyTo.toString() + " <" + mailConfig.Mailusername.toString() + ">"),
    //inReplyTo: (replyTo == null || replyTo == undefined ? commonSettings.mailConfig.Mailusername : 'ACC_Tdddf'),
    //text: "Hello world", // plaintext body
    html: htmlData // html body
  }
  transport.sendMail(mailOptions, function(err, responseStatus) {
    if (err) {
      callback({
        statu: false,
        error: err
      });
    } else {
      callback({
        status: true,
        data: responseStatus
      });
    }
  });
}


module.exports = {
  sendMail: sendMail,
  mailConfig: mailConfig
}

// {
//     "Mailusername": "notifications@axiomnext.com",//'AKIAIW5BZJ2UA2G6CVWQ';
//     "Mailpassword": "Axiom123",//'AuSamdkH07arnehlPSQ1Ek41RzNMfGN0hjwCXlrVtENR';
//     "MailHost": "smtp.gmail.com",//"email-smtp.us-east-1.amazonaws.com";
//     "MailDomain": "smtp.gmail.com",
//     "MailPort": "465",
//     "FromAddress": "notifications@axiomnext.com",
//     "ErrorMailusername": "error@axiomnext.com",//'AKIAIW5BZJ2UA2G6CVWQ';
//     "ErrorMailpassword": "Axiom123",//'AuSamdkH07arnehlPSQ1Ek41RzNMfGN0hjwCXlrVtENR';
//     "ErrorFromAddress": "error@axiomnext.com",//"email-smtp.us-east-1.amazonaws.com";
//     "SecureConnection": true
// }
