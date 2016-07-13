var debug = require('debug')('SMS:SendMail');

var smsConfig = {
  'host': 'info.bulksms-service.com',
  'path': 'http://info.bulksms-service.com/WebServiceSMS.aspx',
  'userName': 'T2015122802',
  'password': 'HZTc85Cj5p',
  'senderID': 'JSWCMT',
  'test': true
};

// var smsConfig = {
//   'host': 'hp.bulksms1.com',
//   'path': '/sms/user/urlsms.php',
//   'userName': 'HP1186',
//   'password': 'Mc*vc52',
//   'senderID': '060000',
//   'test': true
// };

// var smsConfig = {
//   'host': 'hp.bulksms1.com',
//   'path': '/sms/user/urlsms.php',
//   'userName': 'HP1186',
//   'password': 'Mc*vc52',
//   'senderID': '060000',
//   'test': true
// };

// var data = {
//   'to': '9427593195',
//   'content': 'CLM C30011601080008 of 30 tons with truck no GJ-09-2515 for A30011601080019 has been Rejected'
// };

// sendSMS(data, function(vres) {
//   console.log("sendSMS", vres);
// });

function sendSMS(data, cb) {
  var http = require('http');
  //var path = smsConfig.path + "?username=" + smsConfig.userName + "&pass=" + smsConfig.password + "&senderid=" + smsConfig.senderID + "&message=" + data.content + "&dest_mobileno=" + data.to + "&response=Y";
  var path = smsConfig.path + "?User=" + smsConfig.userName + "&passwd=" + smsConfig.password + "&mobilenumber=" + data.to + "&message=" + data.content + "&sid=" + smsConfig.senderID + "&mtype=N";
  console.log(path);

  var options = {
    host: smsConfig.host,
    path: encodeURI(path)
  };

  if (smsConfig.test === false) {
    http.get(options, function(res) {
      if (res.statusCode == 200) {
        if (cb != undefined) {
          cb({
            status: true
          });
        } else {
          console.log(responseStatus.message);
        }
      } else {
        if (cb != undefined) {
          console.log(res.statusCode);
          cb({
            status: false
          });
        } else {
          console.log(err);
        }
      }
      //console.log("Got response: " + res.statusCode);
    }).on('error', function(e) {
      //console.log("Got error: " + e.message);
      if (cb != undefined) {
        console.log(e);
        cb({
          status: false
        });
      } else {
        console.log(err);
      }
    });
  } else {
    cb({
      status: true
    });
  }
}

module.exports = {
  sendSMS: sendSMS,
  smsConfig: smsConfig
};

// {
//   'host': 'hp.bulksms1.com',
//   'path': '/sms/user/urlsms.php',
//   'userName': 'HP1186',
//   'password': 'Mc*vc52',
//   'senderID': '060000',
//   'test': true
// }
