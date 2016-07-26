var debug = require('debug')('Push:SendPush');
var request = require('request');

/*
    Actually sends onesignal push notification
*/
function sendPush(pushObject, cb) {
    request.post(pushObject, function(err, httpResponse, body) {

        cb({
        	error: err,
        	httpResponse: httpResponse,
        	body: body
        });
    });
}

module.exports = {
    sendPush: sendPush,
};
