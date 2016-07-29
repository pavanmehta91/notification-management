var debug = require('debug')('SendMail:SendMail');
var nodemailer = require('nodemailer');

function sendMail(ToAddress, Subject, replyTo, htmlData, mailConfig, callback) {
    debug("sendMail", ToAddress);
    // if (ToAddress == undefined || ToAddress.length < 10) {
    //   ToAddress = 'darshit@byteprophecy.com';
    // }
    var transport = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: mailConfig.Mailusername,
            pass: mailConfig.Mailpassword
        }
    });
    var mailOptions = {
        from: mailConfig.FromAddress,
        to: ToAddress,
        subject: Subject,
        replyTo: (replyTo == null || replyTo == undefined ? mailConfig.Mailusername : replyTo.toString() + " <" + mailConfig.Mailusername.toString() + ">"),
        //inReplyTo: (replyTo == null || replyTo == undefined ? mailConfig.Mailusername : ''),
        //text: "Hello world", // plaintext body
        html: htmlData // html body
    }

    try {
        transport.sendMail(mailOptions, function(err, responseStatus) {
            if (err) {
                callback({
                    status: false,
                    error: err
                });
            } else {
                callback({
                    status: true,
                    data: responseStatus
                });
            }
        });
    } catch (ex) {
        callback({
            status: false,
            error: ex
        });
    }


}

module.exports = {
    sendMail: sendMail
}
