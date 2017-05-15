import QB from 'quickblox';
import CONFIG from '../config';

let self;

export default class QuickBloxService {
    constructor() {
        self = this;
        self.dialogs = {};
        self.userDialogsAssotiation = {};
        self.taggetDialogs = {};

        self.user = {
            id: null,
            login: CONFIG.quickblox.botUser.login,
            password: CONFIG.quickblox.botUser.password,
            token: null
        };

        QB.init(
            CONFIG.quickblox.appId,
            CONFIG.quickblox.authKey,
            CONFIG.quickblox.authSecret,
            CONFIG.quickblox.config
        );

        self.connect(() => {
            QBData.init();
            self.listDialogs();
            self.qbListeners();
        });
    }

    connect(callback) {
        QB.createSession({
            login: self.user.login,
            password: self.user.password
        }, (error, session) => {
            if (!error) {
                self.user.id = session.user_id;
                self.user.token = session.token;

                QB.chat.connect({
                    userId: self.user.id,
                    password: self.user.token
                }, (err, result) => {
                    callback(err, result);
                });
            }
        });
    }

    listDialogs(skip) {
        QB.chat.dialog.list({
            'sort_desc': 'last_message_date_sent',
            'skip': skip || 0
        }, (error, result) => {
            if (error) {
                return false;
            } else {
                let totalEntries = result.total_entries,
                    localEntries = result.limit + result.skip;

                result.items.forEach((item) => {
                    if (+item.type === 2) {
                        QB.chat.muc.join(item.xmpp_room_jid);
                    } else if (+item.type === 3) {
                        self.userDialogsAssotiation[item.user_id] = item._id;
                    }

                    self.dialogs[item._id] = item;
                });

                if (totalEntries > localEntries) {
                    self.listDialogs(localEntries);
                }
            }
        });
    }

    qbListeners() {
        QB.chat.onMessageListener         = self.onMessage;
        QB.chat.onSystemMessageListener   = self.onSystemMessage;
        QB.chat.onSubscribeListener       = self.onSubscribe;
        QB.chat.onRejectSubscribeListener = self.onReject;
    }

    onSubscribe(id) {
        QB.chat.roster.confirm(id, () => self.answerContact(id, '5'));
    }

    onReject(id) {
        QB.chat.roster.reject(id, () => self.answerContact(id, '7'));
    }

    static answerContact(id, type) {
        QB.chat.send(id, {
            'type': 'chat',
            'body': 'Contact request',
            'extension': {
                'date_sent': Math.floor(Date.now() / 1000),
                'dialog_id': self.userDialogsAssotiation[id],
                'save_to_history': 1,
                'notification_type': type
            }
        });
    }

    onMessage(id, msg) {
        if (id === self.user.id) {
            return false;
        }

        if (msg.body.includes('@so ')) {
            let items = msg.body.split(' '),
                text;

            switch (items[1]) {
                case '/help':
                    text = `Possible commands:
                    @so /help - all commands list;
                    @so /list - get current tags' list;
                    @so /last - get last information from StackOverfrow;
                    @so /add [tag] - add new tag;
                    @so /remove [tag] - remove tag.`;
                    break;

                case '/list':
                    text = '_';
                    break;

                case '/last':
                    text = '_';
                    break;

                case '/add':
                    text = items.splice(2);
                    break;

                case '/remove':
                    text = items.splice(2);
                    break;

                default:
                    text = `Possible commands:
                    @so /help - all commands list;
                    @so /list - get current tags' list;
                    @so /last - get last information from StackOverfrow;
                    @so /add [tag] - add new tag;
                    @so /remove [tag] - remove tag.`;
                    break;
            }

            self.sendMessage({
                to: msg.type === 'chat' ? id : QB.chat.helpers.getRoomJidFromDialogId(msg.dialog_id),
                type: msg.type,
                text: text,
                dialogId: msg.dialog_id
            });
        }
    }

    onSystemMessage(id, msg) {

    }

    sendMessage(msg) {
        QB.chat.send(msg.to, {
            'type': msg.type,
            'body': msg.text,
            'markable': 1,
            'extension': {
                'date_sent': Math.floor(Date.now() / 1000),
                'dialog_id': msg.dialogId,
                'save_to_history': 1,
            }
        });
    }

    buildMessage(feedEntry) {
        return `New activity: ${feedEntry.title}. ${feedEntry.link}`; // feedEntry.categories.join(", ")
    }

    fire(data, successCallback, errorCallback) {
        QB.chat.message.create({
            chat_dialog_id: '590c9189a0eb47cf24000004',
            message: data,
            send_to_chat: 1
        }, (err, res) => {
            self.sessionExpirationTime = (new Date()).toISOString();

            if (err) {
                console.log(`error sending QuickBlox API request: ${JSON.stringify(err)}`);
                errorCallback(err);
            } else {
                successCallback(res);
            }
        });
    }
}

class QBData {
    constructor(storage = {}) {
        this.storage = storage;
        this.dataClassName = 'StackOverflowBot';

        this.list();
    }

    static init() {
        new QBData();
    }

    _getRecords() {
        return this.storage;
    }

    _getRecord(dialogId) {
        return this.storage[dialogId];
    }

    _setRecords(records) {
        this.storage = records;
    }

    _addRecord(dialogId, obj) {
        this.storage[dialogId] = obj;
    }

    _getUpdatedRecord(dialogId, tag) {
        let self = this,
            updatedTags;

        if (Array.isArray(tag)) {
            updatedTags = self.storage[dialogId].tags.concat(tag);
        } else {
            updatedTags = self.storage[dialogId].tags.push(tag);
        }

        return {
            '_id': self.storage[dialogId]._id,
            'tags': updatedTags
        };
    }

    _deleteRecord(dialogId) {
        delete this.storage[dialogId];
    }

    list(skip = 0, records = {}) {
        let self = this,
            obj = records;

        QB.data.list(self.dataClassName, {
            'sort_asc': "create_at",
            'limit': 100,
            'skip': skip || 0
        }, (error, result) => {
            if (!error && result) {
                result.items.forEach((item) => {
                    obj[item.dialogId] = {
                        'tags': item.tags,
                        '_id': item._id
                    };
                });

                if (result.limit === result.items.length) {
                    self.list(100, obj);
                } else {
                    self._setRecords(obj);
                }
            }
        });
    }

    create(dialogId, tags) {
        let self = this;

        QB.data.create(self.dataClassName, {
            'dialogId': dialogId,
            'tags': tags
        }, function(error, result) {
            if (!error && result) {
                self._addRecord(result.dialogId, {
                    'tags': result.tags,
                    '_id': result._id
                });
            }
        });
    }

    update(dialogId, tag) {
        let self = this;

        QB.data.update(self.dataClassName, self._getUpdatedRecord(dialogId, tag), function(error, result) {
            if (!error && result) {
                self._addRecord(result.dialogId, {
                    'tags': result.tags,
                    '_id': result._id
                });
            }
        });
    }

    remove(dialogId) {
        let self = this;

        QB.data.delete(self.dataClassName, {
            '_id': this.storage[dialogId]._id
        }, function(error, result) {
            if (!error && result) {
                self._deleteRecord(dialogId);
            }
        });
    }
}
