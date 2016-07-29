var debug = require('debug')('Mail:MailNotifications');
var queryExecutor = require('node-database-executor');
var Template = require('template-management');
var osPush = require('./push.js');
var mailService = require('./sendMail.js');
var utils = require('axiom-utils');
// var sendSMS = require('./sendSMS.js');
// var nodemailer = require('nodemailer');
// var constant = require('./constant.js');

var pushNotProcessed = -1;
var pushInProcess = 0;
var pushSendFailed = 1;
var pushSendSucceeded = 2; // (here to be deleted instead of success status)

var mailNotProcessed = -1;
var mailInProcess = 0;
var mailSendFailed = 1;
var mailSendSucceeded = 2; // (here to be deleted instead of success status)

// var sendSuccess = 1;
// var sendFailed = 0;
// var inProcess = -1;
// var processSuccess = 1;
// var processFailed = 0;
// var userIdmismatch = 2;

// function sendNotifications(cb) {
//   getNotifications(function(notiData) {
//     if (notiData.status === false) {
//       debug(notiData);
//       cb(notiData);
//       return;
//     }

//     if (notiData.content.length <= 0) {
//       debug('Notification data not available.');
//       cb({
//         status: true,
//         content: {
//           notificationID: -1
//         }
//       });
//       return;
//     }

//     var notificationID = notiData.content[0]["pk_id"]
//     var emailTemplate = notiData.content[0]["NM_email_template"];
//     var smsTemplate = notiData.content[0]["NM_sms_template"];
//     var msgData = JSON.parse(notiData.content[0]["NT_data"]);

//     var userArray = notiData.content[0]["NT_fk_User_ids"].split(',');

//     //mailhtml = mailhtml.replace(/\'/ig,"\\\'");
//     //smsText = smsText.replace(/\'/ig,"\\\'");

//     if (userArray.length <= 0 || userArray == '') {
//       updateNotificationStatus(userIdmismatch, notificationID, function(misData) {
//         cb({
//           status: true,
//           content: {
//             notificationID: notificationID
//           }
//         });
//         return;
//       });
//       return;
//     }

//     updateNotificationStatus(inProcess, notificationID, function(vRes) {
//       usermodule.getUserDetails(userArray, function(userData) {
//         if (userData.content.length <= 0) {
//           updateNotificationStatus(sendFailed, notificationID, function() {
//             debug('User not available');
//             cb({
//               status: true,
//               content: {
//                 notificationID: -1
//               }
//             });
//             return;
//           });
//           return;
//         }

//         function processEmail(d, callback) {
//           // TODO: process email notification only if template is available
//           if (emailTemplate === undefined || emailTemplate === null || emailTemplate.trim().length === 0) {
//             debug('email notification skipped...');
//             callback();
//             return;
//           }
//           var mailhtml = Template.toHtml(emailTemplate, msgData, '{{', '}}');
//           sendMail.sendMail(d["email"], notiData.content[0]["NM_subject"], null, mailhtml, function(mailResult) {
//             var emailSendStatus = mailResult.status === false ? sendFailed : sendSuccess;

//             var maildata = {
//               mailfrom: sendMail.mailConfig.FromAddress,
//               mailto: d["email"],
//               mailsubject: notiData.content[0]["NM_subject"],
//               mailhtml: mailhtml,
//               mailhtml: emailSendStatus,
//               notificationid: notificationID
//             }

//             // insert email notification
//             insertMailNotification(maildata, function(result) {
//               callback();
//             });
//           });
//         }

//         function processSMS(d, callback) {
//           // TODO: process sms notification only if template is available
//           if (smsTemplate === undefined || smsTemplate === null || smsTemplate.trim().length === 0) {
//             debug('SMS notification skipped...');
//             callback();
//             return;
//           }
//           var smsText = Template.toHtml(smsTemplate, msgData, '{{', '}}');
//           var smsData = {
//             'to': d["mobile"],
//             notificationid: notificationID,
//             'content': smsText
//           };
//           sendSMS.sendSMS(smsData, function(smsResult) {
//             var smsSendStatus = smsResult.status === false ? sendFailed : sendSuccess;
//             // insert sms notification
//             insertSMSNotification(smsData, smsSendStatus, function(result) {
//               callback();
//             });
//           });
//         }

//         function processInapp(d, callback) {
//           var inappTemplate = notiData.content[0]["NM_inapp_template"];
//           if (inappTemplate === undefined || inappTemplate === null || inappTemplate.trim().length === 0) {
//             debug('inapp notification skipped...');
//             callback();
//             return;
//           }

//           // insert inapp notification, if template found.
//           debug('inapp notification template: ', inappTemplate);
//           // template found. process in app notification
//           var inappHtml = Template.toHtml(inappTemplate, msgData, '{{', '}}');
//           var inappData = {
//             userId: d['UM_pk_id'],
//             notificationid: notificationID,
//             html: inappHtml
//           };
//           debug('inapp notification data: ', inappData);
//           insertInappNotification(inappData, sendSuccess, function(inappResult) {
//             debug('inapp insert response: ', inappResult);
//             callback();
//             return;
//           });
//         }

//         function processPush(d, callback) {
//           // TODO: process push notification
//           callback();
//         }

//         function processNotification(d, callback) {
//           debug("email", d["email"])
//           processEmail(d, function(emailResponse) {
//             processSMS(d, function(smsResponse) {
//               processInapp(d, function(inappResponse) {
//                 processPush(d, function(pushResponse) {
//                   callback();
//                 }); // END push notification
//               }); // END inapp notification
//             }); // END sms notification
//           }); // END email notification
//         }

//         processUser(0);

//         function processUser(index) {
//           if (index >= userData.content.length) {
//             updateNotificationStatus(processSuccess, notificationID, function() {
//               cb({
//                 status: true,
//                 content: {
//                   notificationID: notificationID
//                 }
//               });
//               return;
//             });
//             return;
//           }

//           processNotification(userData.content[index], function() {
//             processUser(index + 1);
//           });
//         }
//       }); // END get user detail
//     }); // END update notification status to "inProcess"
//   }); // END get notification
// }

// function insertMailNotification(data, cb) {
//   var query = {
//     table: "tbl_MailNotification",
//     insert: {
//       field: ['MN_mailFrom', 'MN_mailTo', 'MN_mailSubject', 'MN_mailHtml', 'MN_status', 'MN_fk_NT_id'],
//       fValue: [data.mailfrom, data.mailto, data.mailsubject, data.mailhtml, data.mailstatus, data.notificationid]
//     }
//   };
//   var requestData = {
//     query: query,
//     dbConfig: dbConfig
//   };
//   var connection = '';
//   queryExecutor.executeQuery(requestData, connection, function(data) {
//     // data = correctResponse(data);
//     cb(data);
//   });
// }

// function insertSMSNotification(data, smsStatus, cb) {
//   var query = {
//     table: "tbl_SMSNotification",
//     insert: {
//       field: ['SN_to', 'SN_text', 'SN_status', 'SN_fk_NT_id'],
//       fValue: [data.to, data.content, smsStatus, data.notificationid]
//     }
//   };
//   var requestData = {
//     query: query,
//     dbConfig: dbConfig
//   };
//   var connection = '';
//   queryExecutor.executeQuery(requestData, connection, function(data) {
//     // data = correctResponse(data);
//     cb(data);
//   });
// }

// function insertInappNotification(data, inStatus, userTableConfig, dbConfig, cb) {
//   var query = {
//     table: userTableConfig.inAppNotificationTableName,
//     insert: {
//       field: userTableConfig.inAppNotificationTableFieldArray,
//       fValue: [data.userId, data.html, inStatus, data.notificationid]
//     }
//   };
//   var requestData = {
//     query: query,
//     dbConfig: dbConfig
//   };
//   queryExecutor.executeQuery(requestData, function(data) {
//     // data = correctResponse(data);
//     cb(data);
//   });
// }

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

// function getNotifications(cb) {
//     var notificationJson = {
//         join: {
//             table: 'tbl_NotificationMaster',
//             alias: 'NTM',
//             joinwith: [{
//                 table: 'tbl_NotificationTransaction',
//                 alias: 'NTT',
//                 joincondition: {
//                     table: 'NTM',
//                     field: 'pk_id',
//                     operator: 'eq',
//                     value: {
//                         table: 'NTT',
//                         field: 'NT_fk_NM_id'
//                     }
//                 }
//             }]
//         },
//         select: [{
//             table: 'NTM',
//             field: 'NM_code'
//         }, {
//             table: 'NTM',
//             field: 'NM_name'
//         }, {
//             table: 'NTM',
//             field: 'NM_sms_template'
//         }, {
//             table: 'NTM',
//             field: 'NM_email_template'
//         }, {
//             table: 'NTM',
//             field: 'NM_inapp_template'
//         }, {
//             table: 'NTM',
//             field: 'NM_push_template'
//         }, {
//             table: 'NTM',
//             field: 'NM_subject'
//         }, {
//             table: 'NTT',
//             field: 'pk_id'
//         }, {
//             table: 'NTT',
//             field: 'NT_data'
//         }, {
//             table: 'NTT',
//             field: 'NT_processed'
//         }, {
//             table: 'NTT',
//             field: 'NT_fk_User_ids'
//         }],
//         limit: 1,
//         filter: {
//             AND: [{
//                 table: 'NTT',
//                 field: 'NT_processed',
//                 operator: 'EQ',
//                 value: '0'
//             }]
//         }
//     };

//     var requestData = {
//         query: notificationJson,
//         dbConfig: dbConfig
//     };
//     var connection = '';
//     queryExecutor.executeQuery(requestData, connection, function(data) {
//         // data = correctResponse(data);
//         cb(data);
//     });
// }

// function updateNotificationStatus(processStatus, pkId, dbConfig, cb) {
//     var udpateStatus = {
//         table: "tbl_NotificationTransaction",
//         update: [{
//             field: 'NT_processed',
//             fValue: '' + processStatus + ''
//         }],
//         filter: {
//             AND: [{
//                 field: 'pk_id',
//                 operator: 'EQ',
//                 value: '' + pkId + ''
//             }]
//         }
//     };
//     var updateRequestData = {
//         query: udpateStatus,
//         dbConfig: dbConfig
//     };
//     queryExecutor.executeQuery(updateRequestData, function(data) {
//         // data = correctResponse(data);
//         cb(data);
//     });
// }

/*
    Resets status for push notifications, sets to not processed for the ones in process (to 0 from -1)
*/
function resetPushNotificationStatus(userTableConfig, dbConfig, cb) {
  var udpateStatus = {
    table: userTableConfig.pushNotificationTableName,
    update: [{
      field: userTableConfig.statusKeyPushNotification,
      fValue: '' + pushNotProcessed + ''
    }],
    filter: {
      AND: [{
        field: userTableConfig.statusKeyPushNotification,
        operator: 'EQ',
        value: '' + pushInProcess + ''
      }]
    }
  };
  var updateRequestData = {
    query: udpateStatus,
    dbConfig: dbConfig
  };
  queryExecutor.executeQuery(updateRequestData, function(data) {
    cb(data);
  });
}

/*
    Process for sending push notifications one by one using onesignal service
*/
function sendPushNotifications(userTableConfig, dbConfig, pushConfig, cb) {
  getPushNotifications(userTableConfig, dbConfig, function(notiData) {
    if (notiData.status === false) {
      debug(notiData);
      cb(notiData);
      return;
    }
    if (notiData.content.length <= 0) {
      debug('Push notification data not available.');
      cb({
        status: true,
        content: {
          notificationID: -1
        }
      });
      return;
    }
    var notificationID = notiData.content[0][userTableConfig.primaryKeypushNotificationTable];
    var osPlayerID = notiData.content[0][userTableConfig.playerIDKeyPushNotification];
    var userID = notiData.content[0][userTableConfig.foreignKeyUserIDPushNotification];
    var pushText = notiData.content[0][userTableConfig.playerIDKeyPushNotification];

    if (!osPlayerID || osPlayerID == "" || osPlayerID == undefined || osPlayerID == 'undefined' || !notificationID || notificationID == "" || notificationID == undefined || notificationID == 'undefined' || !pushText || pushText == "" || pushText == undefined || pushText == 'undefined') {
      var pushPKIDs = [];
      pushPKIDs.push(notificationID);
      updatePushNotificationStatus(pushSendFailed, pushPKIDs, userTableConfig, dbConfig, function() {
        debug('Insufficient details for push');
        cb({
          status: true,
          content: {
            notificationID: -1
          }
        });
        return;
      });
    } else {
      getPushNotificationsByUserID(osPlayerID, userID, userTableConfig, dbConfig, function(playerNotifications) {
        debug('osPush.getPushNotificationsByUserID d: %s', JSON.stringify(playerNotifications));

        if (playerNotifications.status === false) {
          debug(playerNotifications);
          cb(playerNotifications);
          return;
        } else {
          var pkOfPlayerIDsArray = playerNotifications.content.map(function(playerNotification) {
            return playerNotification[userTableConfig.primaryKeypushNotificationTable];
          });
          debug('osPush.pkOfPlayerIDsArray d: %s', JSON.stringify(pkOfPlayerIDsArray));
          var playerIDsArray = playerNotifications.content.map(function(playerNotification) {
            return playerNotification[userTableConfig.playerIDKeyPushNotification];
          });
          debug('osPush.playerIDsArray d: %s', JSON.stringify(playerIDsArray));

          updatePushNotificationStatus(pushInProcess, pkOfPlayerIDsArray, userTableConfig, dbConfig, function(ntStatusUpdate) {
            if (ntStatusUpdate.status === false) {
              debug(ntStatusUpdate);
              cb(ntStatusUpdate);
              return;
            } else {

              function processPush(d, userTableConfig, dbConfig, pushConfig, callback) {

                debug('osPush.sendPush d: %s', JSON.stringify(d));
                debug('osPush.sendPush userTableConfig: %s', JSON.stringify(userTableConfig));
                debug('osPush.sendPush dbConfig: %s', JSON.stringify(dbConfig));
                debug('osPush.sendPush pushConfig: %s', JSON.stringify(pushConfig));

                var pushObject = utils.extend(true, {}, pushConfig);
                debug('osPush.sendPush pushObject: %s', JSON.stringify(pushObject));

                if (pkOfPlayerIDsArray.length > 1) {
                  pushObject.body.url += "?screen=notification";
                  pushObject.body.headings.en = "MonitorFirst";
                  pushObject.body.contents.en = "You have " + pkOfPlayerIDsArray.length + " new notifications";
                  pushObject.body.include_player_ids = playerIDsArray;
                } else if (pkOfPlayerIDsArray.length == 1) {
                  if (d[userTableConfig.targetKeyPushNotification] && d[userTableConfig.targetKeyPushNotification] !== "" && d[userTableConfig.targetKeyPushNotification] !== undefined && d[userTableConfig.targetKeyPushNotification] !== 'undefined' && d[userTableConfig.targetKeyPushNotification] !== null) {
                    pushObject.body.url = d[userTableConfig.targetKeyPushNotification];
                  }
                  pushObject.body.headings.en = "MonitorFirst";
                  pushObject.body.contents.en = d[userTableConfig.pushTextKeyPushNotification];
                  pushObject.body.include_player_ids.push(d[userTableConfig.playerIDKeyPushNotification]);
                }

                debug('osPush.sendPush pushObject: %s', JSON.stringify(pushObject));

                osPush.sendPush(pushObject, function(response) {
                  debug('osPush.sendPush response: %s', JSON.stringify(response));
                  debug('response.body.id response: %s', JSON.stringify(response.body.id));
                  debug('d[userTableConfig.playerIDKeyPushNotification] response: %s', JSON.stringify(d[userTableConfig.playerIDKeyPushNotification]));
                  debug('response.body.recipients response: %s', JSON.stringify(response.body.recipients));

                  if (response.body.id != "" && response.body.recipients > 0) {
                    deletePushNotification(pkOfPlayerIDsArray, userTableConfig, dbConfig, function() {
                      cb({
                        status: true,
                        content: {
                          notificationID: response.body.id
                        }
                      });
                      return;
                    });
                  } else {
                    updatePushNotificationStatus(pushSendFailed, pkOfPlayerIDsArray, userTableConfig, dbConfig, function() {
                      cb({
                        status: true,
                        content: {
                          notificationID: notificationID
                        }
                      });
                      return;
                    });
                  }
                });
              }

              function processNotification(d, userTableConfig, dbConfig, pushConfig, callback) {
                debug("d", d);
                processPush(d, userTableConfig, dbConfig, pushConfig, function(pushResponse) {
                  callback();
                });
              }

              processNotificationArray(0, userTableConfig, dbConfig, pushConfig);

              function processNotificationArray(index, userTableConfig, dbConfig, pushConfig) {
                if (index >= notiData.content.length) {
                  cb({
                    status: true,
                    content: {
                      notificationID: notificationID
                    }
                  });
                  return;
                }
                processNotification(notiData.content[index], userTableConfig, dbConfig, pushConfig, function() {
                  processNotificationArray(index + 1, userTableConfig, dbConfig, pushConfig);
                });
              }

            }

          });

        }

      });

    }

  });
}

/*
    Gets push notification one by one which are not processed
*/
function getPushNotifications(userTableConfig, dbConfig, cb) {
  var notificationJson = {
    table: userTableConfig.pushNotificationTableName,
    alias: userTableConfig.pushNotificationTableAlias,
    select: [],
    limit: 1,
    filter: {
      AND: [{
        field: userTableConfig.statusKeyPushNotification,
        operator: 'EQ',
        value: '-1'
      }]
    }
  };
  var requestData = {
    query: notificationJson,
    dbConfig: dbConfig
  };
  queryExecutor.executeQuery(requestData, function(data) {
    cb(data);
  });
}

/*
    Gets push notifications by playerID
*/
function getPushNotificationsByUserID(osPlayerID, userID, userTableConfig, dbConfig, cb) {
  var notificationJson = {
    table: userTableConfig.pushNotificationTableName,
    alias: userTableConfig.pushNotificationTableAlias,
    select: [],
    filter: {
      AND: [{
        field: userTableConfig.statusKeyPushNotification,
        operator: 'EQ',
        value: '-1'
      }, {
        field: userTableConfig.foreignKeyUserIDPushNotification,
        operator: 'EQ',
        value: '' + userID + ''
      }, {
        field: userTableConfig.playerIDKeyPushNotification,
        operator: 'EQ',
        value: '' + osPlayerID + ''
      }]
    }
  };
  var requestData = {
    query: notificationJson,
    dbConfig: dbConfig
  };
  queryExecutor.executeQuery(requestData, function(data) {
    cb(data);
  });
}

/*
    Updates push notification status
*/
function updatePushNotificationStatus(processStatus, pkIds, userTableConfig, dbConfig, cb) {
  var udpateStatus = {
    table: userTableConfig.pushNotificationTableName,
    update: [{
      field: userTableConfig.statusKeyPushNotification,
      fValue: '' + processStatus + ''
    }],
    filter: {
      AND: [{
        field: userTableConfig.primaryKeypushNotificationTable,
        operator: 'EQ',
        value: pkIds
      }]
    }
  };
  var updateRequestData = {
    query: udpateStatus,
    dbConfig: dbConfig
  };
  queryExecutor.executeQuery(updateRequestData, function(data) {
    cb(data);
  });
}

/*
    Deletes push notification
*/
function deletePushNotification(pkIds, userTableConfig, dbConfig, cb) {
  var notificationJson = {
    table: userTableConfig.pushNotificationTableName,
    delete: [],
    filter: {
      AND: [{
        field: userTableConfig.primaryKeypushNotificationTable,
        operator: 'EQ',
        value: pkIds
      }]
    }
  };
  var updateRequestData = {
    query: notificationJson,
    dbConfig: dbConfig
  };
  queryExecutor.executeQuery(updateRequestData, function(data) {
    cb(data);
  });
}

/*
    Resets status for mail notifications, sets to not processed for the ones in process (to 0 from -1)
*/
function resetMailNotificationStatus(userTableConfig, dbConfig, cb) {
  var udpateStatus = {
    table: userTableConfig.mailNotificationTableName,
    update: [{
      field: userTableConfig.statusKeyMailNotification,
      fValue: '' + mailNotProcessed + ''
    }],
    filter: {
      AND: [{
        field: userTableConfig.statusKeyMailNotification,
        operator: 'EQ',
        value: '' + mailInProcess + ''
      }]
    }
  };
  var updateRequestData = {
    query: udpateStatus,
    dbConfig: dbConfig
  };
  queryExecutor.executeQuery(updateRequestData, function(data) {
    cb(data);
  });
}

/*
    Process for sending mail notifications one by one using gmail service
*/
function sendMailNotifications(userTableConfig, dbConfig, mailConfig, cb) {
  getMailNotifications(userTableConfig, dbConfig, function(notiData) {
    if (notiData.status === false) {
      debug(notiData);
      cb(notiData);
      return;
    }
    if (notiData.content.length <= 0) {
      debug('Mail notification data not available.');
      cb({
        status: true,
        content: {
          notificationID: -1
        }
      });
      return;
    }
    var notificationID = notiData.content[0][userTableConfig.primaryKeyMailNotificationTable];
    var mailFrom = notiData.content[0][userTableConfig.mailFromKeyMailNotification];
    var mailTo = notiData.content[0][userTableConfig.mailToKeyMailNotification];
    var mailSubject = notiData.content[0][userTableConfig.mailSubjectKeyMailNotification];
    var mailHtml = notiData.content[0][userTableConfig.mailHTMLKeyMailNotification];

    if (!mailTo || mailTo == "" || mailTo == undefined || mailTo == 'undefined' || !notificationID || notificationID == "" || notificationID == undefined || notificationID == 'undefined' || !mailHtml || mailHtml == "" || mailHtml == undefined || mailHtml == 'undefined' || !mailFrom || mailFrom == "" || mailFrom == undefined || mailFrom == 'undefined' || !mailSubject || mailSubject == "" || mailSubject == undefined || mailSubject == 'undefined') {
      updateMailNotificationStatus(pushSendFailed, notificationID, userTableConfig, dbConfig, function() {
        debug('Insufficient details for mail');
        cb({
          status: true,
          content: {
            notificationID: -1
          }
        });
        return;
      });
    } else {
      getMailNotificationsByEmailID(mailTo, userTableConfig, dbConfig, function(emailNotifications) {
        debug('mailService.getMailNotificationsByEmailID d: %s', JSON.stringify(emailNotifications));

        if (emailNotifications.status === false) {
          debug(emailNotifications);
          cb(emailNotifications);
          return;
        } else {
          var pkOfEmailIDsArray = emailNotifications.content.map(function(emailNotification) {
            return emailNotification[userTableConfig.primaryKeyMailNotificationTable];
          });
          var emailIDsArray = emailNotifications.content.map(function(emailNotification) {
            return emailNotification[userTableConfig.mailToKeyMailNotification];
          });

          updateMailNotificationStatus(mailInProcess, pkOfEmailIDsArray, userTableConfig, dbConfig, function(ntStatusUpdate) {
            if (ntStatusUpdate.status === false) {
              debug(ntStatusUpdate);
              cb(ntStatusUpdate);
              return;
            } else {

              function processMail(d, userTableConfig, dbConfig, mailConfig, callback) {

                debug('mailService.sendMail d: %s', JSON.stringify(d));
                debug('mailService.sendMail userTableConfig: %s', JSON.stringify(userTableConfig));
                debug('mailService.sendMail dbConfig: %s', JSON.stringify(dbConfig));
                debug('mailService.sendMail mailConfig: %s', JSON.stringify(mailConfig));

                var mailObject = utils.extend(true, {}, mailConfig);
                debug('mailService.sendMail mailObject: %s', JSON.stringify(mailObject));
                var mailParams = {};1
                if (pkOfEmailIDsArray.length > 1) {
                  mailParams.toAddress = d[userTableConfig.mailToKeyMailNotification];
                  mailParams.subject = "New notifications generated at MonitorFirst";
                  mailParams.htmlData = 'You have ' + pkOfEmailIDsArray.length + ' new notifications.<br /><br />';
                  emailNotifications.content.forEach(function(emailNotificationRow) {
                    mailParams.htmlData += emailNotificationRow[userTableConfig.mailSubjectKeyMailNotification]+'<br />';
                  });
                  mailParams.htmlData += '<br />To view all notifications, please click on the link below : <a href="'+userTableConfig.serverBaseURL+'?screen=notification">View on MonitorFirst</a><br /><br />';
                  mailParams.htmlData += 'Sincerely,<br />';
                  mailParams.htmlData += 'The Monitor System Admin<br /><br />';
                  mailParams.htmlData += 'Powered by<br />';
                  mailParams.htmlData += '<a href="https://apps.byteprophecy.com/apps/MonitorFirst" style="text-decoration:none;"><img src="https://apps.byteprophecy.com/apps/MonitorFirst/img/monitor_logo.png"><font style="color:#d77c67;">first</font></a>';
                } else if (pkOfEmailIDsArray.length == 1) {
                  mailParams.toAddress = d[userTableConfig.mailToKeyMailNotification];
                  mailParams.subject = d[userTableConfig.mailSubjectKeyMailNotification];
                  mailParams.htmlData = d[userTableConfig.mailHTMLKeyMailNotification];
                }
                debug('mailService.sendMail mailObject: %s', JSON.stringify(mailObject));
                mailService.sendMail(mailParams.toAddress, mailParams.subject, null, mailParams.htmlData, mailObject, function(response) {
                  debug('=====mailService.sendMail response: %s', JSON.stringify(response));
                  if (response.status == true) {
                    deleteMailNotification(pkOfEmailIDsArray, userTableConfig, dbConfig, function() {
                      cb({
                        status: true,
                        content: {
                          notificationID: response.data.messageId
                        }
                      });
                      return;
                    });
                  } else {
                    updateMailNotificationStatus(pushSendFailed, pkOfEmailIDsArray, userTableConfig, dbConfig, function() {
                      cb({
                        status: true,
                        content: {
                          notificationID: pkOfEmailIDsArray
                        }
                      });
                      return;
                    });
                  }
                });
              }

              function processNotification(d, userTableConfig, dbConfig, mailConfig, callback) {
                debug("d", d);
                processMail(d, userTableConfig, dbConfig, mailConfig, function(pushResponse) {
                  callback();
                });
              }

              processNotificationArray(0, userTableConfig, dbConfig, mailConfig);

              function processNotificationArray(index, userTableConfig, dbConfig, mailConfig) {
                if (index >= notiData.content.length) {
                  cb({
                    status: true,
                    content: {
                      notificationID: notificationID
                    }
                  });
                  return;
                }
                processNotification(notiData.content[index], userTableConfig, dbConfig, mailConfig, function() {
                  processNotificationArray(index + 1, userTableConfig, dbConfig, mailConfig);
                });
              }

            }

          });

        }

      });
    }

  });
}

/*
    Gets mail notification one by one which are not processed
*/
function getMailNotifications(userTableConfig, dbConfig, cb) {
  var notificationJson = {
    table: userTableConfig.mailNotificationTableName,
    alias: userTableConfig.mailNotificationTableAlias,
    select: [],
    limit: 1,
    filter: {
      AND: [{
        field: userTableConfig.statusKeyMailNotification,
        operator: 'EQ',
        value: '-1'
      }]
    }
  };
  var requestData = {
    query: notificationJson,
    dbConfig: dbConfig
  };
  queryExecutor.executeQuery(requestData, function(data) {
    cb(data);
  });
}

/*
    Gets push notifications by emailID
*/
function getMailNotificationsByEmailID(emailID, userTableConfig, dbConfig, cb) {
  var notificationJson = {
    table: userTableConfig.mailNotificationTableName,
    alias: userTableConfig.mailNotificationTableAlias,
    select: [],
    filter: {
      AND: [{
        field: userTableConfig.statusKeyMailNotification,
        operator: 'EQ',
        value: '-1'
      }, {
        field: userTableConfig.mailToKeyMailNotification,
        operator: 'EQ',
        value: '' + emailID + ''
      }]
    }
  };
  var requestData = {
    query: notificationJson,
    dbConfig: dbConfig
  };
  queryExecutor.executeQuery(requestData, function(data) {
    cb(data);
  });
}

/*
    Updates mail notification status
*/
function updateMailNotificationStatus(processStatus, pkIds, userTableConfig, dbConfig, cb) {
  var udpateStatus = {
    table: userTableConfig.mailNotificationTableName,
    update: [{
      field: userTableConfig.statusKeyMailNotification,
      fValue: '' + processStatus + ''
    }],
    filter: {
      AND: [{
        field: userTableConfig.primaryKeyMailNotificationTable,
        operator: 'EQ',
        value: pkIds
      }]
    }
  };
  var updateRequestData = {
    query: udpateStatus,
    dbConfig: dbConfig
  };
  queryExecutor.executeQuery(updateRequestData, function(data) {
    cb(data);
  });
}

/*
    Deletes mail notification
*/
function deleteMailNotification(pkIds, userTableConfig, dbConfig, cb) {
  var notificationJson = {
    table: userTableConfig.mailNotificationTableName,
    delete: [],
    filter: {
      AND: [{
        field: userTableConfig.primaryKeyMailNotificationTable,
        operator: 'EQ',
        value: pkIds
      }]
    }
  };
  var updateRequestData = {
    query: notificationJson,
    dbConfig: dbConfig
  };
  queryExecutor.executeQuery(updateRequestData, function(data) {
    cb(data);
  });
}

module.exports = {
  sendPushNotifications: sendPushNotifications,
  sendMailNotifications: sendMailNotifications,
  resetPushNotificationStatus: resetPushNotificationStatus,
  resetMailNotificationStatus: resetMailNotificationStatus,

  // updateNotificationStatus: updateNotificationStatus,
  // insertInappNotification: insertInappNotification,
  // sendMail: sendMail.sendMail,
  // mailConfig: sendMail.mailConfig,
  // sendSMS: sendSMS.sendSMS,
  // smsConfig: sendSMS.smsConfig
}
