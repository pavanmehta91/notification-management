// Object that contains notification-management module table schema definitions
// onesignal.com service is used for push messages
var schema = {
    notificationMasterScript: 'CREATE TABLE `tbl_NotificationMaster` (  `pk_id` int(11) NOT NULL AUTO_INCREMENT,  `NM_code` varchar(6) DEFAULT NULL,  `NM_name` varchar(100) DEFAULT NULL,  `NM_sms_template` varchar(500) DEFAULT NULL,  `NM_email_template` varchar(4000) DEFAULT NULL,  `NM_inapp_template` varchar(4000) DEFAULT NULL,  `NM_push_template` varchar(500) DEFAULT NULL,  `createdDateTime` datetime DEFAULT NULL,  `createdBy` int(11) DEFAULT NULL,  `createdIp` varchar(20) DEFAULT NULL,  `modifiedDateTime` datetime DEFAULT NULL,  `modifiedBy` int(11) DEFAULT NULL,  `modifiedIp` varchar(20) DEFAULT NULL,  `recordStatus` tinyint(4) DEFAULT NULL,  PRIMARY KEY (`pk_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8;',
    notificationTransactionScript: 'CREATE TABLE `tbl_NotificationTransaction` (  `pk_id` int(11) NOT NULL AUTO_INCREMENT,  `NT_fk_NM_id` int(11) DEFAULT NULL,  `NT_data` varchar(4000) DEFAULT NULL,  `NT_processed` tinyint(2) DEFAULT NULL,  `NT_fk_User_ids` varchar(255) DEFAULT NULL,  `createdDateTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,  `createdBy` int(11) DEFAULT NULL,  `createdIp` varchar(20) DEFAULT NULL,  `modifiedDateTime` datetime DEFAULT NULL,  `modifiedBy` int(11) DEFAULT NULL,  `modifiedIp` varchar(20) DEFAULT NULL,  `recordStatus` tinyint(4) DEFAULT 1,  PRIMARY KEY (`pk_id`),  KEY `tbl_NotificationTransaction_ibfk_1` (`NT_fk_NM_id`),  CONSTRAINT `tbl_NotificationTransaction_ibfk_1` FOREIGN KEY (`NT_fk_NM_id`) REFERENCES tbl_NotificationMaster` (`pk_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8;',
    inappNotificationScript: 'CREATE TABLE `tbl_InappNotification` (  `pk_id` int(11) NOT NULL AUTO_INCREMENT,  `IN_userId` int(11) DEFAULT NULL,  `IN_html` text,  `IN_status` tinyint(4) DEFAULT NULL,  `IN_fk_NT_id` int(11) DEFAULT NULL,  `createdDateTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,  `createdBy` int(11) DEFAULT NULL,  `createdIp` varchar(20) DEFAULT NULL,  `modifiedDateTime` datetime DEFAULT NULL,  `modifiedBy` int(11) DEFAULT NULL,  `modifiedIp` varchar(20) DEFAULT NULL,  `recordStatus` tinyint(4) DEFAULT 1,  PRIMARY KEY (`pk_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8;',
    mailNotificationScript: 'CREATE TABLE `tbl_MailNotification` (  `pk_id` int(11) NOT NULL AUTO_INCREMENT,  `MN_mailFrom` varchar(255) DEFAULT NULL,  `MN_mailTo` text,  `MN_mailSubject` varchar(255) DEFAULT NULL,  `MN_mailHtml` varchar(255) DEFAULT NULL,  `MN_mailCount` int(11) DEFAULT NULL,  `MN_status` tinyint(4) DEFAULT NULL,  `MN_fk_NT_id` int(11) DEFAULT NULL,  `createdDateTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,  `createdBy` int(11) DEFAULT NULL,  `createdIp` varchar(20) DEFAULT NULL,  `modifiedDateTime` datetime DEFAULT NULL,  `modifiedBy` int(11) DEFAULT NULL,  `modifiedIp` varchar(20) DEFAULT NULL,  `recordStatus` tinyint(4) DEFAULT 1,  PRIMARY KEY (`pk_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8;',
    osPushNotificationScript: 'CREATE TABLE `tbl_OSPushNotification` (  `pk_id` int(11) NOT NULL AUTO_INCREMENT,  `PN_toPlayerID` varchar(50) DEFAULT NULL,  `PN_text` text,  `PN_status` tinyint(4) DEFAULT NULL,  `PN_fk_NT_id` int(11) DEFAULT NULL,  `createdDateTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,  `createdBy` int(11) DEFAULT NULL,  `createdIp` varchar(20) DEFAULT NULL,  `modifiedDateTime` datetime DEFAULT NULL,  `modifiedBy` int(11) DEFAULT NULL,  `modifiedIp` varchar(20) DEFAULT NULL,  `recordStatus` tinyint(4) DEFAULT 1,  PRIMARY KEY (`pk_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8;',
    smsNotificationScript: 'CREATE TABLE `tbl_SMSNotification` (  `pk_id` int(11) NOT NULL AUTO_INCREMENT,  `SN_to` varchar(50) DEFAULT NULL,  `SN_text` text,  `SN_status` tinyint(4) DEFAULT NULL,  `SN_fk_NT_id` int(11) DEFAULT NULL,  `createdDateTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,  `createdBy` int(11) DEFAULT NULL,  `createdIp` varchar(20) DEFAULT NULL,  `modifiedDateTime` datetime DEFAULT NULL,  `modifiedBy` int(11) DEFAULT NULL,  `modifiedIp` varchar(20) DEFAULT NULL,  `recordStatus` tinyint(4) DEFAULT 1,  PRIMARY KEY (`pk_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8;'
};

// Array which contains queries to be executed
var queries = {
    ntInsertQuery: {
        table: 'tbl_NotificationTransaction',
        insert: {
            field: ['NT_fk_NM_id', 'NT_data', 'NT_processed'],
            fValue: []
        }
    },
    nmGetIdQuery: {
        table: 'tbl_NotificationMaster',
        select: [{
            field: 'pk_id'
        }],
        filter: {
            field: 'NM_code',
            operator: 'eq',
            value: ''
        }
    }
}

// Object which contains details for table names and their columns
var tables = {
    notificationMaster: {
        columns: {
            'code': 'NM_code'
        }
    },
    notificationTransaction: {
        columns: {
            'nmId': 'NT_fk_NM_id',
            'data': 'NT_data',
            'processed': 'NT_processed',
            'userIds': 'NT_fk_User_ids'
        }
    }
};

// Object which contains default values to be used for columns as required
var defaultValues = {
    'notification_processed': '0'
}

// Object which contains status message as key and code, message in value as an object
var status = {
    'NM_ERR_INVALID_STATUS_IN_GET_INAPP_NOTIFICATIONS_REQUEST': {
        code: 20001,
        message: 'Invalid "status". It should be ALL | UNREAD | READ'
    },
    'NM_ERR_INVALID_LIMIT_IN_GET_INAPP_NOTIFICATIONS_REQUEST': {
        code: 20002,
        message: 'Invalid "limit". It should be greater than 0'
    },
    'NM_ERR_INVALID_OFFSET_IN_GET_INAPP_NOTIFICATIONS_REQUEST': {
        code: 20003,
        message: 'Invalid "offset". It should be greater than 0'
    },
    'NM_ERR_INVALID_MARK_INAPP_NOTIFICATION_READ_REQUEST': {
        code: 20011,
        message: 'Invalid "markInappNotificationRead" request'
    },
    'NM_ERR_NOTIFICATION_ID_MISSING_IN_MARK_INAPP_NOTIFICATION_READ_REQUEST': {
        code: 20011,
        message: '"notificationId" is required field'
    },
    'NM_ERR_INVALID_MARK_INAPP_NOTIFICATION_UNREAD_REQUEST': {
        code: 20021,
        message: 'Invalid "markInappNotificationUnread" request'
    },
    'NM_ERR_NOTIFICATION_ID_MISSING_IN_MARK_INAPP_NOTIFICATION_UNREAD_REQUEST': {
        code: 20022,
        message: '"notificationId" is required field'
    },
    'NM_ERR_INVALID_DATETIME_IN_GET_NEW_INAPP_NOTIFICATIONS': {
        code: 20031,
        message: '"datetime" is required field'
    },
}

// module.exports = {
//   // error codes and message
//   error: {
//     status: {
//       'NOTIFICATOIN_SENDING_FAILED': {
//         code: "17001",
//         message: "Notification sending failed"
//       }
//     }
//   }
// }

module.exports = {
    queries: queries,
    schema: schema,
    tables: tables,
    defaultValues: defaultValues,
    status: status
}
