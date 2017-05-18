import _ from 'underscore';
import QB from 'quickblox';
import CONFIG from '../config';

let self, qbData;

export default class QuickBloxService {
    constructor() {
        self = this;
        
        self.dialogs = {};
        self.userDialogsAssotiation = {};
        self.taggetDialogs = {};

        self.user = {
            login: CONFIG.quickblox.botUser.login,
            password: CONFIG.quickblox.botUser.password,
            id: null,
            token: null
        };

        QB.init(
            CONFIG.quickblox.appId,
            CONFIG.quickblox.authKey,
            CONFIG.quickblox.authSecret,
            CONFIG.quickblox.config
        );

        self.connect((error, result) => {
            qbData = new QBData();
            self.listDialogs();
            self.qbListeners();
        });
    }


    connect(callback) {
        QB.createSession({
            'login': self.user.login,
            'password': self.user.password
        }, (error, session) => {
            if (session) {
                self.user.id = session.user_id;
                self.user.token = session.token;

                QB.chat.connect({
                    'userId': self.user.id,
                    'password': self.user.token
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
                        QB.chat.muc.join(item.xmpp_room_jid, null);
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

    answerContact(id, type) {
        const dialogId = this.userDialogsAssotiation[id];

        switch (type) {
            case '5':
                this.installDialog(dialogId);
                break;

            case '7':
                this.removeDialog(dialogId);
                break;

            default:
                return false;
        }

        QB.chat.send(id, {
            'type': 'chat',
            'body': 'Contact request',
            'extension': {
                'date_sent': Math.floor(Date.now() / 1000),
                'dialog_id': dialogId,
                'save_to_history': 1,
                'notification_type': type
            }
        });
    }

    async onMessage(id, msg) {
        if (id === self.user.id) {
            return false;
        }

        if (msg.body.includes('@so ')) {
            let roomJid = QB.chat.helpers.getRoomJidFromDialogId(msg.dialog_id),
                items = msg.body.trim().replace(',', '').split(' '),
                tags,
                text;

            switch (items[1]) {
                case '/help':
                    text = `Possible commands:
                    @so /help - all commands list;
                    @so /list - get current tags' list;
                    @so /kick - kick bot from the current group chat;
                    @so /last - get last information from StackOverfrow;
                    @so /add [tag] - add new tag;
                    @so /remove [tag] - remove tag.`;
                    break;

                case '/list':
                    tags = await qbData.getTags(msg.dialog_id);
                    text = `Current tags: ${tags.join(', ')}`;
                    break;

                case '/last':
                    text = '_';
                    break;

                case '/add':
                    tags = await qbData.add(msg.dialog_id, items.splice(2));
                    text = `Added tags: ${tags.join(', ')}`;
                    break;

                case '/remove':
                    tags = await qbData.remove(msg.dialog_id, items.splice(2));
                    text = `Removed tags: ${tags.join(', ')}`;
                    break;

                case '/kick':
                    self.removeDialog(msg.dialog_id);
                    break;

                default:
                    text = `I don't know what you want. Use "@so /help" to get all commands list.`;
                    break;
            }

            self.sendMessage({
                to: msg.type === 'chat' ? id : roomJid,
                type: msg.type,
                text: text,
                dialogId: msg.dialog_id
            });
        }
    }

    onSystemMessage(msg) {
        const type = msg.extension && msg.extension.notification_type,
              dialogId =  msg.extension && msg.extension.dialog_id;
        
        if (type === '1') {
            self.installDialog(dialogId).then(dialog => {
                const roomJid = dialog.xmpp_room_jid;

                QB.chat.muc.join(roomJid, () => {
                    self.sendMessage({
                        to: roomJid,
                        type: 'groupchat',
                        text: 'Hello everybody! Use "@so /help" to get all commands list.',
                        dialogId: dialogId
                    });
                });
            });
        }
    }

    sendMessage(params) {
        QB.chat.send(params.to, {
            'type': params.type,
            'body': params.text,
            'markable': 1,
            'extension': {
                'date_sent': Math.floor(Date.now() / 1000),
                'dialog_id': params.dialogId,
                'save_to_history': 1
            }
        });
    }

    buildMessage(feedEntry) {
        return `New activity: ${feedEntry.title}. ${feedEntry.link}`; // feedEntry.categories.join(", ")
    }

    async removeDialog(dialogId) {
        const dialog = await self.getDialogById(dialogId),
              time = Math.floor(Date.now() / 1000),
              roomJid = QB.chat.helpers.getRoomJidFromDialogId(dialogId);

        this.sendMessage({
            to: roomJid,
            type: 'groupchat',
            text: 'Good bay! Have a good day!',
            dialogId: dialogId
        });

        QB.chat.send(roomJid, {
            type: 'groupchat',
            body: 'Notification message',
            extension: {
                date_sent: time,
                save_to_history: 1,
                notification_type: '2',
                current_occupant_ids: dialog.occupants_ids.join(),
                deleted_occupant_ids: self.user.id,
                dialog_id: dialogId,
                room_updated_date: time,
                dialog_update_info: 3
            }
        });

        return new Promise((resolve, reject) => {
            QB.chat.dialog.delete([dialogId], (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    qbData.removeRecord(dialogId).then(
                        success => resolve(res),
                        fail => reject(fail)
                    );
                }
            });
        });
    }

    async installDialog(dialogId) {
        const dialog = await self.getDialogById(dialogId);

        return new Promise((resolve, reject) => {
            qbData.createRecord(dialogId).then(
                success => resolve(dialog),
                fail => reject(fail)
            );
        });
    }

    async getDialogById(dialogId) {
        return new Promise((resolve, reject) => {
            QB.chat.dialog.list({
                '_id': dialogId
            }, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res.items[0]);
                }
            });
        });
    }

    fire() {

    }
}

class QBData {
    constructor() {
        this.dataClassName = 'StackOverflowBot';
    }

    async add(dialogId, newTags) {
        let param = { add_to_set: { tags: newTags } };

        return await this.updateRecord(dialogId, param);
    }

    async remove(dialogId, removedTags) {
        let param = { pull_all: { tags: removedTags } };

        return await this.updateRecord(dialogId, param);
    }

    async getTags(dialogId) {
        const record = await this.getRecord(dialogId);

        return record.tags;
    }

    async getRecord(dialogId) {
        return new Promise((resolve, reject) => {
            QB.data.list(this.dataClassName, {
                'dialogId': dialogId
            }, (err, res) => {
                let results = res.items;

                if (res && results.length) {
                    resolve(results[0]);
                } else {
                    reject(err);
                }
            });
        });
    }

    async createRecord(dialogId) {
        return new Promise((resolve, reject) => {
            QB.data.create(this.dataClassName, {
                'dialogId': dialogId,
                'tags': ''
            }, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });
    }

    async updateRecord(dialogId, params) {
        const record = await this.getRecord(dialogId);

        params._id = record._id;

        return new Promise((resolve, reject) => {
            QB.data.update(this.dataClassName, params, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(res.tags);
                    resolve(res.tags);
                }
            });
        });
    }

    async removeRecord(dialogId) {
        const record = await this.getRecord(dialogId);

        return new Promise((resolve, reject) => {
            QB.data.delete(this.dataClassName, record._id, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });
    }
}
