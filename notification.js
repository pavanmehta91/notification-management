var constant = require('./constant.js');
var utils = require('axiom-utils');
var debug = require('debug')('notification-management:notification-management');
var queryExecutor = require('node-database-executor');
var assert = require('axiom-assert-helper');
var processNotification = require('./notification-process.js');
var Inapp = require('./inapp.js');
var Template = require('template-management');

var sendSuccess = 1;
var sendFailed = 0;
var inProcess = -1;
var processSuccess = 1;
var processFailed = 0;
var userIdmismatch = 2;
var inappUnread = 0;

/*
    Creates required tables for using notification-management
*/
function createSchema(dbConfig, cb) {
    var notificationScript = constant.schema.notificationMasterScript + '\n' + constant.schema.notificationTransactionScript + '\n' + constant.schema.inappNotificationScript + '\n' + constant.schema.mailNotificationScript + '\n' + constant.schema.osPushNotificationScript + '\n' + constant.schema.smsNotificationScript;
    var queryData = {
        query: notificationScript,
        dbConfig: dbConfig
    };
    debug("createSchema", queryData)
    queryExecutor.executeRawQuery(queryData, function(data) {
        debug('createSchema response: %s', JSON.stringify(data));
        if (data.status == true) {
            cb({
                status: true,
                content: data.content
            });
        } else {
            cb({
                status: false,
                content: data.error
            });
        }
    });
}

/*
    Gets notification master id, by table lookup in notification master by notification code
*/
function getNotificationMasterId(code, dbConfig, cb) {
    var query = constant.queries.nmGetIdQuery;
    query.filter.value = code;
    var getIdRequestData = {
        query: query,
        dbConfig: dbConfig
    };
    queryExecutor.executeQuery(getIdRequestData, function(data) {
        debug('getNotificationMasterId response: %s', JSON.stringify(data));
        if (data.status == true) {
            cb({
                status: true,
                content: data.content
            });
        } else {
            cb({
                status: false,
                content: data.error
            });
        }
    });
}

/*
    Cache that maintains the notification master id and code mapping
*/
var cachedPkIds = {};

/*
    Gets notification master id, either from cache or lookup in notification master table
*/
function getPkId(code, dbConfig, cb) {
    if (cachedPkIds.hasOwnProperty(code)) {
        cb({
            status: true,
            content: cachedPkIds[code]
        });
    } else {
        getNotificationMasterId(code, dbConfig, function(masterIdData) {
            debug('master-id-response: ', masterIdData);
            if (masterIdData.status == true) {
                var masterId = masterIdData.content[0].pk_id.toString();
                cachedPkIds[code] = masterId;
                cb({
                    status: true,
                    content: masterId
                });
            } else {
                // TODO: Invalid transaction code
                cb({
                    status: false,
                    error: masterIdData.error
                });
            }
        });
    }
}

/*
    Maps table column alias, values pair to actual table column names, values pair
*/
function mapTransaction(transaction) {
    var value = {};
    for (var key in transaction) {
        value[constant.tables.notificationTransaction.columns[key]] = transaction[key];
    }
    if (value.hasOwnProperty(constant.tables.notificationTransaction.columns['userIds'])) {
        var userIds = value[constant.tables.notificationTransaction.columns['userIds']];
        if (Array.isArray(userIds)) {
            userIds = userIds.join();
        }
        value[constant.tables.notificationTransaction.columns['userIds']] = userIds;
    }
    debug('mapped-transaction: %s', JSON.stringify(value));
    return value;
}

/*
    Prepares notification transaction table data, looks up notification master table & 
*/
function prepareTransactionData(transactionData, dbConfig, cb) {
    var preparedTransactions = [];
    var invalidTransactions = [];
    debug('transaction data to prepare: %s', JSON.stringify(transactionData));

    function prepareNextTransaction(index) {
        if (index >= transactionData.length) {
            cb({
                status: true,
                content: preparedTransactions
            });
        } else {
            var transaction = transactionData[index];
            getPkId(transaction['code'], dbConfig, function(masterIdData) {
                debug('master-id: ', masterIdData);
                if (masterIdData.status == true) {
                    transaction['nmId'] = masterIdData.content;
                    transaction['processed'] = constant.defaultValues['notification_processed'];
                    delete transaction['code'];
                    preparedTransactions.push(mapTransaction(transaction));
                    prepareNextTransaction(index + 1);
                } else {
                    invalidTransactions.push(transaction);
                    prepareNextTransaction(index + 1);
                }
            });
        }
    }
    prepareNextTransaction(0);
}

/*
    Creates a entry in tbl_NotificationTransaction
    // Todo : update this to be configurable
*/
function commonInsert(query, data, dbConfig, cb) {
    var dataValues = utils.JSON2ARRAY(data);
    var fieldValues = dataValues.splice(0, 1)[0];
    query.insert.field = fieldValues;
    query.insert.fValue = dataValues;
    var queryRequestData = {
        query: query,
        dbConfig: dbConfig
    };
    debug('query insert config: ' + JSON.stringify(queryRequestData));
    queryExecutor.executeQuery(queryRequestData, function(data) {
        cb(data);
    });
}

/*
    Gets notification transaction by id
    // Todo : update this to be configurable
*/
function getNotificationTransactionByID(id, dbConfig, cb) {
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
            }, {
                table: 'NTT',
                field: 'pk_id',
                operator: 'EQ',
                value: id
            }]
        }
    };

    var requestData = {
        query: notificationJson,
        dbConfig: dbConfig
    };

    queryExecutor.executeQuery(requestData, function(data) {
        debug('getNotificationTransactionByID executeQuery data: %s', JSON.stringify(data));;
        cb(data);
    });
}

/*
    Creates a notification transaction

    Sample transactionData
    [
        {
            'code': 'TESTNM',
            'data': '{"no":"2","push_target":"https://www.byteprophecy.com"}',
            'userIds': 'contact@byteprophecy.com,work@byteprophecy.com'
        }
    ]
*/
function insertNotificationTransactions(transactionData, userTableConfig, dbConfig, cb) {
    if (transactionData[0].userIds && transactionData[0].userIds != null && transactionData[0].userIds != "") {
        debug('userIds present: %s', JSON.stringify(transactionData));
        prepareTransactionData(transactionData, dbConfig, function(preparedTransactionsData) {
            if (preparedTransactionsData.status == true) {
                debug('prepareTransactionData response: %s', JSON.stringify(preparedTransactionsData));
                commonInsert(constant.queries.ntInsertQuery, preparedTransactionsData.content, dbConfig, function(data) {
                    debug('insertNotificationTransactions response: %s', JSON.stringify(data));
                    if (data.status == true) {
                        getNotificationTransactionByID(data.content.insertId, dbConfig, function(notiData) {
                            debug('getNotificationTransactionByID response: %s', JSON.stringify(notiData));
                            if (notiData.status === false) {
                                cb(notiData);
                                return;
                            } else if (notiData.content.length <= 0) {
                                cb({
                                    status: true,
                                    content: {
                                        notificationID: -1
                                    }
                                });
                                return;
                            } else {
                                var notificationID = notiData.content[0]["pk_id"];
                                var inappTemplate = notiData.content[0]["NM_inapp_template"];
                                var pushTemplate = notiData.content[0]["NM_push_template"];
                                var emailSubject = notiData.content[0]["NM_subject"];
                                var emailTemplate = notiData.content[0]["NM_email_template"];
                                var smsTemplate = notiData.content[0]["NM_sms_template"];

                                debug('msgData.parse');
                                debug('msgData.parse', notiData.content[0]["NT_data"]);
                                debug('msgData.parse');

                                var msgData = JSON.parse(''+notiData.content[0]["NT_data"]);
                                var userArray = notiData.content[0]["NT_fk_User_ids"].split(',');

                                debug('==========userArray==========: %s', JSON.stringify(userArray));

                                if (userArray.length <= 0 || userArray == '') {
                                    debug('userArray.length', userArray.length);
                                    cb({
                                        status: false,
                                        content: preparedTransactionsData.error
                                    });
                                    return;
                                }
                                updateNotificationStatus(inProcess, notificationID, userTableConfig, dbConfig, function(ntStatusUpdate) {
                                    debug('updateNotificationStatus response: %s', JSON.stringify(ntStatusUpdate));
                                    if (ntStatusUpdate.status === false) {
                                        debug(ntStatusUpdate);
                                        cb(ntStatusUpdate);
                                        return;
                                    } else {
                                        getUserDetails(userArray, userTableConfig, dbConfig, function(userData) {
                                            debug('getUserDetails response: %s', JSON.stringify(userData));

                                            if (userData.content.length <= 0) {
                                                updateNotificationStatus(sendFailed, notificationID, userTableConfig, dbConfig, function() {
                                                    debug('User not available');
                                                    cb({
                                                        status: true,
                                                        content: {
                                                            notificationID: -1
                                                        }
                                                    });
                                                    return;
                                                });
                                            }

                                            var processedUserData = [];

                                            userData.content.forEach(function(selectedUserData) {
                                                userArray.forEach(function(selectedUserID) {
                                                    if (selectedUserID == selectedUserData[userTableConfig.emailKeyNameUserTable]) {
                                                        var is_present = 0;
                                                        processedUserData.forEach(function(selectedProcessedUserData) {
                                                            if (selectedUserID == selectedProcessedUserData[userTableConfig.emailKeyNameUserTable]) {
                                                                is_present = 1;

                                                                if (selectedProcessedUserData.playerIDs.indexOf(selectedUserData.playerID) < 0) {
                                                                    selectedProcessedUserData.playerIDs.push(selectedUserData.playerID);
                                                                }               
                                                            }
                                                        });
                                                        if (is_present == 0) {
                                                            var processedUserDataObject = {};
                                                            processedUserDataObject.pk_UserID = selectedUserData.pk_UserID;
                                                            processedUserDataObject.email = selectedUserData.email;
                                                            processedUserDataObject.phone = selectedUserData.phone;
                                                            processedUserDataObject.firstName = selectedUserData.firstName;
                                                            processedUserDataObject.lastName = selectedUserData.lastName;
                                                            processedUserDataObject.playerIDs = [];
                                                            processedUserDataObject.playerIDs.push(selectedUserData.playerID);
                                                            processedUserData.push(processedUserDataObject);
                                                        }
                                                    }
                                                });
                                            });

                                            debug('processedUserData array: %s', JSON.stringify(processedUserData));

                                            function processInapp(d, userTableConfig, dbConfig, callback) {
                                                var inappTemplateToProcess = inappTemplate;

                                                if (inappTemplateToProcess === undefined || inappTemplateToProcess === null || inappTemplateToProcess.trim().length === 0) {
                                                    debug('inapp notification skipped...');
                                                    callback();
                                                    return;
                                                }

                                                debug('inapp notification template: ', inappTemplateToProcess);
                                                var inappHtml = Template.toHtml(inappTemplateToProcess, msgData, '{{', '}}');
                                                var inappData = {
                                                    userId: d[userTableConfig.primaryKeyNameUserTable],
                                                    notificationid: notificationID,
                                                    html: inappHtml
                                                };
                                                debug('inapp notification data: ', inappData);
                                                insertInappNotification(inappData, inappUnread, userTableConfig, dbConfig, function(inappResult) {
                                                    debug('inapp insert response: ', inappResult);
                                                    callback();
                                                    return;
                                                });
                                            }

                                            function processPush(d, userTableConfig, dbConfig, callback) {
                                                var pushTemplateToProcess = pushTemplate;

                                                debug('d: %s', JSON.stringify(d));

                                                if (pushTemplateToProcess === undefined || pushTemplateToProcess === null || pushTemplateToProcess.trim().length === 0) {
                                                    debug('push notification skipped...');
                                                    callback();
                                                    return;
                                                }

                                                debug('push notification template: ', pushTemplateToProcess);
                                                var pushText = Template.toHtml(pushTemplateToProcess, msgData, '{{', '}}');
                                                var pushData = [];
                                                d["playerIDs"].forEach(function(userPlayerID) {
                                                    if (userPlayerID && userPlayerID !== "" && userPlayerID !== undefined && userPlayerID !== 'undefined') {
                                                        var tempArray = [];
                                                        tempArray.push(userPlayerID);
                                                        tempArray.push(d[userTableConfig.primaryKeyNameUserTable]);
                                                        tempArray.push(pushText);
                                                        tempArray.push(inProcess);
                                                        tempArray.push(notificationID);
                                                        if (msgData.push_target && msgData.push_target !== "" && msgData.push_target !== undefined && msgData.push_target !== 'undefined') {
                                                            tempArray.push(msgData.push_target);
                                                        } else {
                                                            tempArray.push("");
                                                        }
                                                        pushData.push(tempArray);
                                                    }
                                                });

                                                debug('push notification data: ', pushData);
                                                if (pushData.length <= 0) {
                                                    callback();
                                                    return;
                                                } else {
                                                    insertPushNotification(pushData, userTableConfig, dbConfig, function(pushResult) {
                                                        debug('push insert response: ', pushResult);
                                                        callback();
                                                        return;
                                                    });
                                                }
                                            }

                                            function processEmail(d, userTableConfig, dbConfig, callback) {
                                                var emailTemplateToProcess = emailTemplate;
                                                var emailSubjectToProcess = emailSubject;

                                                if (emailTemplateToProcess === undefined || emailTemplateToProcess === null || emailTemplateToProcess.trim().length === 0) {
                                                    debug('email notification skipped...');
                                                    callback();
                                                    return;
                                                }

                                                var mailhtml = Template.toHtml(emailTemplateToProcess, msgData, '{{', '}}');
                                                emailSubjectToProcess = Template.toHtml(emailSubjectToProcess, msgData, '{{', '}}');

                                                var maildata = {
                                                    mailfrom: userTableConfig.mailFromAddress,
                                                    mailto: d["email"],
                                                    mailsubject: emailSubjectToProcess,
                                                    mailhtml: mailhtml,
                                                    notificationid: notificationID
                                                }

                                                insertMailNotification(maildata, inProcess, userTableConfig, dbConfig, function(result) {
                                                    callback();
                                                });
                                            }

                                            function processNotification(d, userTableConfig, dbConfig, callback) {
                                                debug("email", d["email"])
                                                processInapp(d, userTableConfig, dbConfig, function(inappResponse) {
                                                    processPush(d, userTableConfig, dbConfig, function(pushResponse) {
                                                        processEmail(d, userTableConfig, dbConfig, function(emailResponse) {
                                                            //processSMS(d, function(smsResponse) {
                                                            callback();
                                                            return;
                                                            //});
                                                        });
                                                    });
                                                });
                                            }

                                            processUser(0, userTableConfig, dbConfig);

                                            function processUser(index, userTableConfig, dbConfig) {
                                                debug('processedUserData.length: ', processedUserData.length);
                                                debug('index: ', index);
                                                if (index >= processedUserData.length) {
                                                    updateNotificationStatus(processSuccess, notificationID, userTableConfig, dbConfig, function() {
                                                        cb({
                                                            status: true,
                                                            content: {
                                                                notificationID: notificationID
                                                            }
                                                        });
                                                        return;
                                                    });
                                                }
                                                processNotification(processedUserData[index], userTableConfig, dbConfig, function() {
                                                    debug('processedUserData.length 0: ', processedUserData.length);
                                                    debug('index 0: ', index);
                                                    processUser(index + 1, userTableConfig, dbConfig);
                                                });
                                            }

                                        });
                                    }
                                });

                            }
                        });

                        // cb({
                        //     status: true,
                        //     content: data.content
                        // });
                    } else {
                        cb({
                            status: false,
                            content: data.error
                        });
                    }
                });
            } else {
                cb({
                    status: false,
                    content: preparedTransactionsData.error
                });
            }
        });
    } else {
        debug('no userIds present: %s', JSON.stringify(transactionData));
        cb({
            status: false,
            error: constant.status['NM_ERR_INVALID_USERIDS']
        });
    }
}

/*
    Sample requestData 1
    {
        userId: <user_id>, (REQUIRED)
        status: READ | UNREAD | ALL, (Default: ALL),
        limit: <limit>, (Default: -1),
        offset: <offset>, (Default: -1),
        serverdatetime: <serverdatetime> (Default: '')
    }

    Sample Response 1
    {
        status: true,
        content: [<n1>, ..., n],
        serverdatetime: <server_timestamp>,
        nextpage: <next_page_number>
    }

    Sample requestData 2
    {
        userId: <user_id>,
        status: READ,
        limit: 3,
        offset: 10
    }

    Sample Success Response 2
    there are no more notifications available then 'serverdatetime' and 'nextpage' will not be passed to response
    {
        status: true,
        content: [n1, n2]
    }

    Sample Failure Response
    {
        status: false,
        error: {
            code: <code>,
            message: <error_message>
        }
    }
*/
function getInappNotifications(requestData, dbConfig, cb) {
    var userId = requestData.userId;
    var status = 'ALL';
    var limit = -1;
    var offset = -1;
    var serverdatetime = '';
    var fromdate = '';
    var todate = '';
    var validStatus = ['ALL', 'READ', 'UNREAD'];

    if (requestData.hasOwnProperty('status')) {
        status = requestData.status.toUpperCase().trim();
        if (validStatus.indexOf(status) == -1) {
            cb({
                status: false,
                error: constant.status['NM_ERR_INVALID_STATUS_IN_GET_INAPP_NOTIFICATIONS_REQUEST']
            });
            return;
        }
    }

    if (requestData.hasOwnProperty('limit')) {
        limit = +requestData.limit;
        if (limit < 0) {
            cb({
                status: false,
                error: constant.status['NM_ERR_INVALID_LIMIT_IN_GET_INAPP_NOTIFICATIONS_REQUEST']
            });
            return;
        }
    }

    if (requestData.hasOwnProperty('offset')) {
        offset = +requestData.offset;
        if (offset < 0) {
            cb({
                status: false,
                error: constant.status['NM_ERR_INVALID_OFFSET_IN_GET_INAPP_NOTIFICATIONS_REQUEST']
            });
            return;
        }
    }

    if (requestData.hasOwnProperty('serverdatetime')) {
        serverdatetime = requestData.serverdatetime;
    }

    if (requestData.hasOwnProperty('fromdate')) {
        fromdate = requestData.fromdate;
    }

    if (requestData.hasOwnProperty('todate')) {
        todate = requestData.todate;
    }

    Inapp.getNotifications(userId, status, offset, limit, serverdatetime, fromdate, todate, dbConfig, function(inappResponse) {
        cb(inappResponse);
    });
}

/*
    Sample requestData
    {
        notificationId: [<notification-id>]
    }
*/
function markInappNotificationRead(requestData, dbConfig, cb) {
    if (assert.checkType(requestData, 'object') === false) {
        cb({
            status: false,
            error: constant.status['NM_ERR_INVALID_MARK_INAPP_NOTIFICATION_READ_REQUEST']
        });
        return;
    }

    if (!requestData.hasOwnProperty('notificationId')) {
        cb({
            status: false,
            error: constant.status['NM_ERR_NOTIFICATION_ID_MISSING_IN_MARK_INAPP_NOTIFICATION_READ_REQUEST']
        });
        return;
    }

    var notificationId = requestData.notificationId;
    if (notificationId === undefined || notificationId === null || notificationId.toString().trim().length === 0) {
        cb({
            status: false,
            error: constant.status['NM_ERR_NOTIFICATION_ID_MISSING_IN_MARK_INAPP_NOTIFICATION_READ_REQUEST']
        });
        return;
    }

    var userId = requestData.userId;
    Inapp.markRead(notificationId, userId, dbConfig, function(response) {
        cb(response);
    });
}

/*
    Sample requestData
    {
        notificationId: [<notification-id>]
    }
*/
function markInappNotificationUnread(requestData, dbConfig, cb) {
    if (assert.checkType(requestData, 'object') === false) {
        cb({
            status: false,
            error: constant.status['NM_ERR_INVALID_MARK_INAPP_NOTIFICATION_UNREAD_REQUEST']
        });
        return;
    }

    if (!requestData.hasOwnProperty('notificationId')) {
        cb({
            status: false,
            error: constant.status['NM_ERR_NOTIFICATION_ID_MISSING_IN_MARK_INAPP_NOTIFICATION_UNREAD_REQUEST']
        });
        return;
    }

    var notificationId = requestData.notificationId;
    if (notificationId === undefined || notificationId === null || notificationId.toString().trim().length === 0) {
        cb({
            status: false,
            error: constant.status['NM_ERR_NOTIFICATION_ID_MISSING_IN_MARK_INAPP_NOTIFICATION_UNREAD_REQUEST']
        });
        return;
    }

    var userId = requestData.userId;
    Inapp.markUnread(notificationId, userId, dbConfig, function(response) {
        cb(response);
    });
}

/*
    Sample requestData
    {
        userId: <user_id>, (REQUIRED)
        datetime: <datetime> (REQUIRED)
    }

    Sample Response
    {
        status: true,
        content: [<n1>, ..., n]
    }

    Sample Failure Response
    {
        status: false,
        error: {
            code: <code>,
            message: <error_message>
        }
    }
*/
function getNewInappNotifications(requestData, dbConfig, cb) {
    var userId = requestData.userId;
    var datetime = '';

    if (requestData.hasOwnProperty('datetime') === false || requestData.datetime === null || requestData.datetime === undefined || requestData.datetime.toString().trim().length === 0) {
        cb({
            status: false,
            error: constant.status['NM_ERR_INVALID_DATETIME_IN_GET_NEW_INAPP_NOTIFICATIONS']
        });
        return;
    }

    datetime = requestData.datetime;

    Inapp.getNewNotifications(userId, datetime, dbConfig, function(inappResponse) {
        cb(inappResponse);
    });
}

/*
    Gets user details for specified userArray
*/
function getUserDetails(userArray, userTableConfig, dbConfig, cb) {
    var jsonQuery = {
        join: {
            table: userTableConfig.userTableName,
            alias: userTableConfig.userTableAlias,
            joinwith: [{
                table: userTableConfig.userMappingTableName,
                alias: userTableConfig.userMappingTableAlias,
                joincondition: {
                    table: userTableConfig.userTableAlias,
                    field: userTableConfig.primaryKeyNameUserTable,
                    operator: 'eq',
                    value: {
                        table: userTableConfig.userMappingTableAlias,
                        field: userTableConfig.userIDKeyNameUserMapping
                    }
                }
            }]
        },
        select: [{
            table: userTableConfig.userTableAlias,
            field: userTableConfig.primaryKeyNameUserTable
        }, {
            table: userTableConfig.userTableAlias,
            field: userTableConfig.emailKeyNameUserTable
        }, {
            table: userTableConfig.userTableAlias,
            field: userTableConfig.mobileKeyNameUserTable
        }, {
            table: userTableConfig.userTableAlias,
            field: userTableConfig.firstNameUserTable
        }, {
            table: userTableConfig.userTableAlias,
            field: userTableConfig.lastNameUserTable
        }, {
            table: userTableConfig.userMappingTableAlias,
            field: userTableConfig.playerIDKeyNameUserMapping,
        }],
        filter: {
            AND: [{
                table: userTableConfig.userTableAlias,
                field: userTableConfig.emailKeyNameUserTable,
                operator: 'EQ',
                value: userArray
            }]
        }
    };

    var requestData = {
        query: jsonQuery,
        dbConfig: dbConfig
    };

    debug('getUserDetails notificationJson: %s', JSON.stringify(jsonQuery));
    debug('getUserDetails dbConfig: %s', JSON.stringify(dbConfig));
    debug('getUserDetails requestData: %s', JSON.stringify(requestData));

    queryExecutor.executeQuery(requestData, function(data) {
        debug('getUserDetails executeQuery: %s', JSON.stringify(data));
        cb(data);
    });
}

/*
    Inserts an inapp notification
*/
function insertInappNotification(data, inStatus, userTableConfig, dbConfig, cb) {
    var query = {
        table: userTableConfig.inAppNotificationTableName,
        insert: {
            field: userTableConfig.inAppNotificationTableFieldArray,
            fValue: [data.userId, data.html, inStatus, data.notificationid]
        }
    };
    var requestData = {
        query: query,
        dbConfig: dbConfig
    };
    queryExecutor.executeQuery(requestData, function(data) {
        // data = correctResponse(data);
        cb(data);
    });
}

/*
    Inserts a push notification
*/
function insertPushNotification(data, userTableConfig, dbConfig, cb) {
    var query = {
        table: userTableConfig.pushNotificationTableName,
        insert: {
            field: userTableConfig.pushNotificationTableFieldArray,
            fValue: data
        }
    };
    var requestData = {
        query: query,
        dbConfig: dbConfig
    };
    queryExecutor.executeQuery(requestData, function(data) {
        // data = correctResponse(data);
        cb(data);
    });
}

/*
    Inserts an email notification
*/
function insertMailNotification(data, mnStatus, userTableConfig, dbConfig, cb) {
    var query = {
        table: userTableConfig.mailNotificationTableName,
        insert: {
            field: userTableConfig.mailNotificationTableFieldArray,
            fValue: [data.mailfrom, data.mailto, data.mailsubject, data.mailhtml, mnStatus, data.notificationid]
        }
    };
    var requestData = {
        query: query,
        dbConfig: dbConfig
    };
    queryExecutor.executeQuery(requestData, function(data) {
        // data = correctResponse(data);
        cb(data);
    });
}

/*
    Updates notification transaction status
*/
function updateNotificationStatus(processStatus, pkId, userTableConfig, dbConfig, cb) {
    var udpateStatus = {
        table: userTableConfig.notificationTransactionTableName,
        update: [{
            field: userTableConfig.processedKeynotificationTransaction,
            fValue: '' + processStatus + ''
        }],
        filter: {
            AND: [{
                field: userTableConfig.primaryKeyNotificationTransaction,
                operator: 'EQ',
                value: '' + pkId + ''
            }]
        }
    };
    var updateRequestData = {
        query: udpateStatus,
        dbConfig: dbConfig
    };
    queryExecutor.executeQuery(updateRequestData, function(data) {
        // data = correctResponse(data);
        cb(data);
    });
}

module.exports = {
    // createSchema: createSchema,
    insertNotificationTransactions: insertNotificationTransactions,
    getInappNotifications: getInappNotifications,
    markInappNotificationRead: markInappNotificationRead,
    markInappNotificationUnread: markInappNotificationUnread,
    getNewInappNotifications: getNewInappNotifications,
    updateNotificationStatus: updateNotificationStatus,
    sendPushNotifications: processNotification.sendPushNotifications,
    sendMailNotifications: processNotification.sendMailNotifications,
    resetPushNotificationStatus: processNotification.resetPushNotificationStatus,
    resetMailNotificationStatus: processNotification.resetMailNotificationStatus,
    
    // insertInappNotification: insertInappNotification,
    // sendNotifications: processNotification.sendNotifications,
    // sendMail: processNotification.sendMail,
    // mailConfig: processNotification.mailConfig,
    // sendSMS: processNotification.sendSMS,
    // smsConfig: processNotification.smsConfig
}
