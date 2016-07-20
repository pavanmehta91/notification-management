var constant = require('./constant.js');
var utils = require('axiom-utils');
var debug = require('debug')('notification-management:notification-management');
var queryExecutor = require('node-database-executor');
var assert = require('axiom-assert-helper');
var processNotification = require('./notification-process.js');
var Inapp = require('./inapp.js');

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
    Creates a notification transaction

    Sample transactionData
    [
        {
            'code': 'AOCRTD',
            'data': '{}',
        }
    ]
*/
function insertNotificationTransactions(transactionData, dbConfig, cb) {
    prepareTransactionData(transactionData, dbConfig, function(preparedTransactionsData) {
        if (preparedTransactionsData.status == true) {
            debug('prepareTransactionData response: %s', JSON.stringify(preparedTransactionsData));
            commonInsert(constant.queries.ntInsertQuery, preparedTransactionsData.content, dbConfig, function(data) {
                debug('insertNotificationTransactions response: %s', JSON.stringify(data));
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
        } else {
            cb({
                status: false,
                content: preparedTransactionsData.error
            });
        }
    });
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

module.exports = {
    createSchema: createSchema,
    insertNotificationTransactions: insertNotificationTransactions,
    getInappNotifications: getInappNotifications,
    markInappNotificationRead: markInappNotificationRead,
    markInappNotificationUnread: markInappNotificationUnread,
    getNewInappNotifications: getNewInappNotifications,

    sendNotifications: processNotification.sendNotifications,
    sendMail: processNotification.sendMail,
    mailConfig: processNotification.mailConfig,
    sendSMS: processNotification.sendSMS,
    smsConfig: processNotification.smsConfig
}
