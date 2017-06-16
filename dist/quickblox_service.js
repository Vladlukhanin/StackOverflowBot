'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _quickblox = require('quickblox');

var _quickblox2 = _interopRequireDefault(_quickblox);

var _config = require('../config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class QuickBloxService {
    constructor() {
        this.params = _config2.default.quickblox;

        _quickblox2.default.init(this.params.appId, this.params.authKey, this.params.authSecret, this.params.config);
    }

    checkSession(callback) {
        if (!_quickblox2.default.service.qbInst.session || new Date().toISOString() > this.params.sessionExpirationTime) {
            _quickblox2.default.createSession({
                login: this.params.botUser.login,
                password: this.params.botUser.password
            }, (error, session) => {
                if (typeof callback === 'function') {
                    callback(error);
                    console.log(session);
                }
            });
        } else {
            if (typeof callback === 'function') {
                callback(null);
            }
        }
    }

    buildMessage(feedEntry) {
        return `New activity: ${feedEntry.title}. ${feedEntry.link}`; // feedEntry.categories.join(", ")
    }

    fire(data, successCallback, errorCallback) {
        let self = this;

        self.checkSession(function (err) {
            _quickblox2.default.chat.message.create({
                chat_dialog_id: self.params.chatDialogId,
                message: data,
                send_to_chat: 1
            }, (err, res) => {
                self.sessionExpirationTime = new Date().toISOString();

                if (err) {
                    console.log(`error sending QuickBlox API request: ${JSON.stringify(err)}`);
                    errorCallback(err);
                } else {
                    successCallback(res);
                }
            });
        });
    }
}
exports.default = QuickBloxService;
//# sourceMappingURL=QBChat.js.map