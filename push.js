var debug = require('debug')('Push:SendPush');
var request = require('request');

/*
    Actually sends onesignal push notification
*/
function sendPush(pushObject, cb) {
    try {
        request.post(pushObject, function(err, httpResponse, body) {

            cb({
                error: err,
                httpResponse: httpResponse,
                body: body
            });
        });
    } catch (ex) {
        cb({
            status: false,
            error: ex
        });
    }
}

module.exports = {
    sendPush: sendPush,
};
