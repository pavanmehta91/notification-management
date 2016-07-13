var debug = require('debug')('Mail:MailNotifications');
var queryExecutor = require('node-database-executor');
var usermodule = require('user-management');
var nodemailer = require('nodemailer');
var sendMail = require('./sendMail.js');
var Template = require('template-management');
var sendSMS = require('./sendSMS.js');
var constant = require('./constant.js');

var dbConfig = GLOBAL._defaultDBConfig;

var sendSuccess = 1;
var sendFailed = 0;
var inProcess = -1;
var processSuccess = 1;
var processFailed = 0;
var userIdmismatch = 2;

// sendNotifications(function(vres) {
//   console.log(vres);
// });

function sendNotifications(cb) {
  getNotifications(function(notiData) {
    if (notiData.status === false) {
      debug(notiData);
      cb(notiData);
      return;
    }

    if (notiData.content.length <= 0) {
      debug('Notification data not available.');
      cb({
        status: true,
        content: {
          notificationID: -1
        }
      });
      return;
    }

    var notificationID = notiData.content[0]["pk_id"]
    var emailTemplate = notiData.content[0]["NM_email_template"];
    var smsTemplate = notiData.content[0]["NM_sms_template"];
    var msgData = JSON.parse(notiData.content[0]["NT_data"]);

    var userArray = notiData.content[0]["NT_fk_User_ids"].split(',');

    //mailhtml = mailhtml.replace(/\'/ig,"\\\'");
    //smsText = smsText.replace(/\'/ig,"\\\'");

    if (userArray.length <= 0 || userArray == '') {
      updateNotificationStatus(userIdmismatch, notificationID, function(misData) {
        cb({
          status: true,
          content: {
            notificationID: notificationID
          }
        });
        return;
      });
      return;
    }

    updateNotificationStatus(inProcess, notificationID, function(vRes) {
      usermodule.getUserDetails(userArray, function(userData) {
        if (userData.content.length <= 0) {
          updateNotificationStatus(sendFailed, notificationID, function() {
            debug('User not available');
            cb({
              status: true,
              content: {
                notificationID: -1
              }
            });
            return;
          });
          return;
        }

        function processEmail(d, callback) {
          // TODO: process email notification only if template is available
          if (emailTemplate === undefined || emailTemplate === null || emailTemplate.trim().length === 0) {
            debug('email notification skipped...');
            callback();
            return;
          }
          var mailhtml = Template.toHtml(emailTemplate, msgData, '{{', '}}');
          sendMail.sendMail(d["email"], notiData.content[0]["NM_subject"], null, mailhtml, function(mailResult) {
            var emailSendStatus = mailResult.status === false ? sendFailed : sendSuccess;

            var maildata = {
              mailfrom: sendMail.mailConfig.FromAddress,
              mailto: d["email"],
              mailsubject: notiData.content[0]["NM_subject"],
              mailhtml: mailhtml,
              mailhtml: emailSendStatus,
              notificationid: notificationID
            }

            // insert email notification
            insertMailNotification(maildata, function(result) {
              callback();
            });
          });
        }

        function processSMS(d, callback) {
          // TODO: process sms notification only if template is available
          if (smsTemplate === undefined || smsTemplate === null || smsTemplate.trim().length === 0) {
            debug('SMS notification skipped...');
            callback();
            return;
          }
          var smsText = Template.toHtml(smsTemplate, msgData, '{{', '}}');
          var smsData = {
            'to': d["mobile"],
            notificationid: notificationID,
            'content': smsText
          };
          sendSMS.sendSMS(smsData, function(smsResult) {
            var smsSendStatus = smsResult.status === false ? sendFailed : sendSuccess;
            // insert sms notification
            insertSMSNotification(smsData, smsSendStatus, function(result) {
              callback();
            });
          });
        }

        function processInapp(d, callback) {
          var inappTemplate = notiData.content[0]["NM_inapp_template"];
          if (inappTemplate === undefined || inappTemplate === null || inappTemplate.trim().length === 0) {
            debug('inapp notification skipped...');
            callback();
            return;
          }

          // insert inapp notification, if template found.
          debug('inapp notification template: ', inappTemplate);
          // template found. process in app notification
          var inappHtml = Template.toHtml(inappTemplate, msgData, '{{', '}}');
          var inappData = {
            userId: d['UM_pk_id'],
            notificationid: notificationID,
            html: inappHtml
          };
          debug('inapp notification data: ', inappData);
          insertInappNotification(inappData, sendSuccess, function(inappResult) {
            debug('inapp insert response: ', inappResult);
            callback();
            return;
          });
        }

        function processPush(d, callback) {
          // TODO: process push notification
          callback();
        }

        function processNotification(d, callback) {
          debug("email", d["email"])
          processEmail(d, function(emailResponse) {
            processSMS(d, function(smsResponse) {
              processInapp(d, function(inappResponse) {
                processPush(d, function(pushResponse) {
                  callback();
                }); // END push notification
              }); // END inapp notification
            }); // END sms notification
          }); // END email notification
        }

        processUser(0);

        function processUser(index) {
          if (index >= userData.content.length) {
            updateNotificationStatus(processSuccess, notificationID, function() {
              cb({
                status: true,
                content: {
                  notificationID: notificationID
                }
              });
              return;
            });
            return;
          }

          processNotification(userData.content[index], function() {
            processUser(index + 1);
          });
        }
      }); // END get user detail
    }); // END update notification status to "inProcess"
  }); // END get notification
}

function insertMailNotification(data, cb) {
  var query = {
    table: "tbl_MailNotification",
    insert: {
      field: ['MN_mailFrom', 'MN_mailTo', 'MN_mailSubject', 'MN_mailHtml', 'MN_status', 'MN_fk_NT_id'],
      fValue: [data.mailfrom, data.mailto, data.mailsubject, data.mailhtml, data.mailstatus, data.notificationid]
    }
  };
  var requestData = {
    query: query,
    dbConfig: dbConfig
  };
  var connection = '';
  queryExecutor.executeQuery(requestData, connection, function(data) {
    // data = correctResponse(data);
    cb(data);
  });
}

function insertSMSNotification(data, smsStatus, cb) {
  var query = {
    table: "tbl_SMSNotification",
    insert: {
      field: ['SN_to', 'SN_text', 'SN_status', 'SN_fk_NT_id'],
      fValue: [data.to, data.content, smsStatus, data.notificationid]
    }
  };
  var requestData = {
    query: query,
    dbConfig: dbConfig
  };
  var connection = '';
  queryExecutor.executeQuery(requestData, connection, function(data) {
    // data = correctResponse(data);
    cb(data);
  });
}

function insertInappNotification(data, inStatus, cb) {
  var query = {
    table: "tbl_InappNotification",
    insert: {
      field: ['IN_userId', 'IN_html', 'IN_status', 'IN_fk_NT_id'],
      fValue: [data.userId, data.html, inStatus, data.notificationid]
    }
  };
  var requestData = {
    query: query,
    dbConfig: dbConfig
  };
  var connection = '';
  queryExecutor.executeQuery(requestData, connection, function(data) {
    // data = correctResponse(data);
    cb(data);
  });
}

function updateNotificationStatus(processStatus, pkId, cb) {
  var udpateStatus = {
    table: "tbl_NotificationTransaction",
    update: [{
      field: 'NT_processed',
      fValue: '' + processStatus + ''
    }],
    filter: {
      AND: [{
        field: 'pk_id',
        operator: 'EQ',
        value: '' + pkId + ''
      }]
    }
  };
  var updateRequestData = {
    query: udpateStatus,
    dbConfig: dbConfig
  };
  var connection = '';
  queryExecutor.executeQuery(updateRequestData, connection, function(data) {
    // data = correctResponse(data);
    cb(data);
  });
}

function getNotifications(cb) {
  var notificationJson = {
    join: {
      table: 'tbl_NotificationMaster',
      alias: 'NTM',
      joinwith: [{
        table: 'tbl_NotificationTransaction',
        alias: 'NTT',
        joincondition: {
          table: 'NTM',
          field: 'pk_id',
          operator: 'eq',
          value: {
            table: 'NTT',
            field: 'NT_fk_NM_id'
          }
        }
      }]
    },
    select: [{
      table: 'NTM',
      field: 'NM_code'
    }, {
      table: 'NTM',
      field: 'NM_name'
    }, {
      table: 'NTM',
      field: 'NM_sms_template'
    }, {
      table: 'NTM',
      field: 'NM_email_template'
    }, {
      table: 'NTM',
      field: 'NM_inapp_template'
    }, {
      table: 'NTM',
      field: 'NM_push_template'
    }, {
      table: 'NTM',
      field: 'NM_subject'
    }, {
      table: 'NTT',
      field: 'pk_id'
    }, {
      table: 'NTT',
      field: 'NT_data'
    }, {
      table: 'NTT',
      field: 'NT_processed'
    }, {
      table: 'NTT',
      field: 'NT_fk_User_ids'
    }],
    limit: 1,
    filter: {
      AND: [{
        table: 'NTT',
        field: 'NT_processed',
        operator: 'EQ',
        value: '0'
      }]
    }
  };

  var requestData = {
    query: notificationJson,
    dbConfig: dbConfig
  };
  var connection = '';
  queryExecutor.executeQuery(requestData, connection, function(data) {
    // data = correctResponse(data);
    cb(data);
  });
}

// function correctResponse(data) {
//   if (data.success === true) {
//     return {
//       status: true,
//       content: data.data
//     };
//   } else {
//     return {
//       status: false,
//       error: data.error
//     };
//   }
// }

module.exports = {
  sendNotifications: sendNotifications,
  sendMail: sendMail.sendMail,
  mailConfig: sendMail.mailConfig,
  sendSMS: sendSMS.sendSMS,
  smsConfig: sendSMS.smsConfig
}
