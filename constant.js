var dbConfig = GLOBAL._defaultDBConfig;

var schema = {
  notificationMasterScript: 'DROP TABLE IF EXISTS `iTrack`.`tbl_NotificationMaster`;\
  CREATE TABLE `tbl_NotificationMaster` (\
    `pk_id` int(11) NOT NULL AUTO_INCREMENT,\
    `NM_code` VARCHAR(6) DEFAULT NULL,\
    `NM_name` VARCHAR(100) DEFAULT NULL,\
    `NM_sms_template` VARCHAR(500) DEFAULT NULL,\
    `NM_email_template` VARCHAR(4000) DEFAULT NULL,\
    `NM_inapp_template` VARCHAR(4000) DEFAULT NULL,\
    `NM_push_template` VARCHAR(500) DEFAULT NULL,\
    `createdDateTime` datetime DEFAULT NULL,\
    `createdBy` int(11) DEFAULT NULL,\
    `createdIp` varchar(20) DEFAULT NULL,\
    `modifiedDateTime` datetime DEFAULT NULL,\
    `modifiedBy` int(11) DEFAULT NULL,\
    `modifiedIp` varchar(20) DEFAULT NULL,\
    `recordStatus` tinyint(4) DEFAULT NULL,\
    PRIMARY KEY (`pk_id`)\
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8;',

  notificationTransactionScript: 'DROP TABLE IF EXISTS `iTrack`.`tbl_NotificationTransaction`;\
    CREATE TABLE `tbl_NotificationTransaction` (\
      `pk_id` int(11) NOT NULL AUTO_INCREMENT,\
      `NT_fk_NM_id` int(11) DEFAULT NULL,\
      `NT_data` VARCHAR(4000) DEFAULT NULL,\
      `NT_processed` bit(1) DEFAULT NULL,\
      `createdDateTime` datetime DEFAULT NULL,\
      `createdBy` int(11) DEFAULT NULL,\
      `createdIp` varchar(20) DEFAULT NULL,\
      `modifiedDateTime` datetime DEFAULT NULL,\
      `modifiedBy` int(11) DEFAULT NULL,\
      `modifiedIp` varchar(20) DEFAULT NULL,\
      `recordStatus` tinyint(4) DEFAULT NULL,\
      PRIMARY KEY (`pk_id`),\
      FOREIGN KEY (`NT_fk_NM_id`) \
            REFERENCES `tbl_NotificationMaster`(`pk_id`)\
            ON UPDATE RESTRICT ON DELETE RESTRICT\
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;'
};

// notification transaction
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

var defaultValues = {
  'notification_processed': '0'
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


module.exports = {
  queries: queries,
  schema: schema,
  dbConfig: dbConfig,
  tables: tables,
  defaultValues: defaultValues,
  status: status
}
