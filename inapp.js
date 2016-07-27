var debug = require('debug')('notification-management:inapp');
var queryExecutor = require('node-database-executor');
var constant = require('./constant.js');
var d3 = require('d3');

// Object which contains flag mapping for read and unread
var notificationStatusMapping = {
    'READ': 0,
    'UNREAD': 1
}

/**
 * Get Inapp notifications for the user
 * @param  {Number}   userId User id
 * @param  {String}   status ALL | READ | UNREAD
 * @param  {Number}   offset Page
 * @param  {Number}   limit  Page size
 * @param  {String}   serverdatetime  Server date time
 * @param  {Function} cb     Callback function
 * @return {Object} e.g., {status: true, content: [data], serverdatetime: <serverdatetime>, nextpage: <nextpage>}
 *                        'serverdatetime' and 'nextpage' are passed based on conditions
 */
function getNotifications(userId, status, offset, limit, serverdatetime, fromdate, todate, dbConfig, cb) {
    var query = {
        table: 'tbl_InappNotification',
        select: [{
            field: 'pk_id',
            alias: 'notificationId'
        }, {
            field: 'IN_html',
            alias: 'notification'
        }, {
            field: 'IN_status',
            alias: 'status',
            expression: {
                cases: [{
                    operator: 'eq',
                    value: '1',
                    out: {
                        value: '\'UNREAD\''
                    }
                }],
                "default": {
                    value: '\'READ\''
                }
            }
        }, {
            field: 'createdDateTime',
            alias: 'notificationDate'
        }],
        filter: {
            and: [{
                field: 'IN_userId',
                operator: 'eq',
                value: userId
            }]
        },
        sortby: [{
            field: 'pk_id',
            order: 'DESC'
        }]
    };

    // status filter
    if (status.toUpperCase().trim() != 'ALL') {
        var statusFilter = {
            field: 'IN_status',
            operator: 'eq',
            value: notificationStatusMapping[status.toUpperCase().trim()]
        }
        query.filter.and.push(statusFilter);
    }

    // fromdate filter
    if (fromdate.trim().length > 0) {
        var fromdatefilter = {
            field: 'createdDateTime',
            operator: 'gteq',
            value: fromdate
        };
        query.filter.and.push(fromdatefilter);
    }

    // todate filter
    if (todate.trim().length > 0) {
        var todatefilter = {
            field: 'createdDateTime',
            operator: 'lteq',
            value: todate
        };
        query.filter.and.push(todatefilter);
    }

    // server datetime filter
    if (serverdatetime.trim().length > 0) {
        var datetimeFilter = {
            field: 'createdDateTime',
            operator: 'lteq',
            value: serverdatetime
        };
        query.filter.and.push(datetimeFilter);
    }

    // server datetime filter
    if (serverdatetime.trim().length > 0) {
        var datetimeFilter = {
            field: 'createdDateTime',
            operator: 'lteq',
            value: serverdatetime
        };
        query.filter.and.push(datetimeFilter);
    }

    // limit & offset
    var limitStatus = null;
    if (offset != null && offset > 0) {
        if (limit != null && limit > 0) {
            var from = limit * (offset - 1);
            var to = limit;
            query.limit = from + "," + to;
            limitStatus = 'OL'; // offset and limit
        }
    } else if (limit != null && limit > 0) {
        query.limit = limit;
        limitStatus = 'L'; // limit only
    }

    debug('inapp query json: ', query);
    var queryRequestData = {
        query: query,
        dbConfig: dbConfig
    };

    queryExecutor.executeQuery(queryRequestData, {}, function(queryResponse) {
        var queryResponse = IncorrectResponse(queryResponse);
        if (queryResponse.success === false) {
            cb({
                status: false,
                error: queryResponse.error
            });
            return;
        }

        var data = queryResponse.data;
        if (data.length === 0) {
            cb({
                status: true,
                content: []
            });
            return;
        }

        var response = {
            status: true
        };

        if (serverdatetime === null || serverdatetime === undefined || serverdatetime.trim().length === 0) {
            var maxCreatedDate = getMaxDate(data, 'notificationDate');
            debug('server datetime: ', maxCreatedDate);
            serverdatetime = d3.time.format('%Y-%m-%d %H:%M:%S')(maxCreatedDate);
        }

        response.content = data;
        // add serverdatetime & nextpage to response
        if (limitStatus != null) {
            response.serverdatetime = serverdatetime;
            // only add nextpage if data length is same as limit
            if (data.length === limit) {
                response.offset = (offset == -1) ? 2 : (offset + 1);
            }
        }
        cb(response);
    });
}

/**
 * Mark notification as read
 * @param  {Number}   userId User id
 * @param  {Number}   notificationId notification id
 * @param  {Function} cb     Callback function
 */
function markRead(notificationId, userId, dbConfig, cb) {
    updateNotificationStatus(notificationId, userId, notificationStatusMapping['READ'], dbConfig, function(response) {
        cb(response);
    });
}

/**
 * Mark notification as unread
 * @param  {Number}   userId User id
 * @param  {Number}   notificationId notification id
 * @param  {Function} cb     Callback function
 */
function markUnread(notificationId, userId, dbConfig, cb) {
    updateNotificationStatus(notificationId, userId, notificationStatusMapping['UNREAD'], dbConfig, function(response) {
        cb(response);
    });
}

function updateNotificationStatus(notificationId, userId, status, dbConfig, cb) {
    var query = {
        table: 'tbl_InappNotification',
        update: [{
            field: 'IN_status',
            fValue: status
        }],
        filter: {
            and: [{
                field: 'pk_id',
                operator: 'eq',
                value: notificationId
            }, {
                field: 'IN_userId',
                operator: 'eq',
                value: userId
            }]
        }
    };

    var queryRequestData = {
        query: query,
        dbConfig: dbConfig
    };

    queryExecutor.executeQuery(queryRequestData, {}, function(queryResponse) {
        var queryResponse = IncorrectResponse(queryResponse);
        if (queryResponse.success === false) {
            cb({
                status: false,
                error: queryResponse.error
            });
            return;
        }

        cb({
            status: true,
            content: queryResponse.data
        });
    });
}

/**
 * Get New Inapp notifications for the user
 * @param  {Number}   userId User id
 * @param  {String}   datetime datetime from where to check for new notifications
 * @param  {Function} cb     Callback function
 * @return {Object} e.g., {status: true, content: [data]}
 */
function getNewNotifications(userId, datetime, dbConfig, cb) {
    var query = {
        table: 'tbl_InappNotification',
        select: [{
            field: 'pk_id',
            alias: 'notificationId'
        }, {
            field: 'IN_html',
            alias: 'notification'
        }, {
            field: 'IN_status',
            alias: 'status',
            expression: {
                cases: [{
                    operator: 'eq',
                    value: '1',
                    out: {
                        value: '\'UNREAD\''
                    }
                }],
                "default": {
                    value: '\'READ\''
                }
            }
        }, {
            field: 'createdDateTime',
            alias: 'notificationDate'
        }],
        filter: {
            and: [{
                field: 'IN_userId',
                operator: 'eq',
                value: userId
            }, {
                field: 'IN_status',
                operator: 'eq',
                value: notificationStatusMapping['UNREAD']
            }, {
                field: 'createdDateTime',
                operator: 'gt',
                value: datetime
            }]
        },
        sortby: [{
            field: 'pk_id',
            order: 'DESC'
        }]
    };

    debug('inapp query json: ', query);
    var queryRequestData = {
        query: query,
        dbConfig: dbConfig
    };
    
    queryExecutor.executeQuery(queryRequestData, {}, function(queryResponse) {
        var queryResponse = IncorrectResponse(queryResponse);
        if (queryResponse.success === false) {
            cb({
                status: false,
                error: queryResponse.error
            });
            return;
        }

        var notifications = queryResponse.data;
        var maxDate = datetime;
        if (notifications.length > 0) {
            var dt = getMaxDate(notifications, 'notificationDate');
            maxDate = d3.time.format('%Y-%m-%d %H:%M:%S')(dt);
        }
        cb({
            status: true,
            content: queryResponse.data,
            datetime: maxDate
        });
    });
}

function getMaxDate(data, dateKey) {
    var dates = data.map(function(d) {
        return new Date(d[dateKey]);
    });
    var maxDate = new Date(Math.max.apply(null, dates));
    return maxDate;
}

function IncorrectResponse(data) {
    if (data.status === true) {
        return {
            success: true,
            data: data.content
        };
    } else {
        return {
            success: false,
            error: data.error
        };
    }
}

module.exports = {
    getNotifications: getNotifications,
    markRead: markRead,
    markUnread: markUnread,
    getNewNotifications: getNewNotifications
}
