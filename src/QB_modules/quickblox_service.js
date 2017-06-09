import QB from 'quickblox';
import QBDialog from './QBDialog';
import QBData from './QBData';
import CONFIG from '../../config';

let self, qbData, qbDialog;

export default class QuickBloxService {
    constructor() {
        self = this;

        self.user = {
            login: CONFIG.quickblox.bot.login,
            password: CONFIG.quickblox.bot.password,
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
            if (result) {
                qbData = new QBData();
                qbDialog = new QBDialog(self.user.id);

                self.qbListeners();
            } else {
                console.error(error);
            }
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
            } else {
                console.error(error);
            }
        });
    }

    qbListeners() {
        QB.chat.onMessageListener = self.onMessage;
        QB.chat.onSystemMessageListener = self.onSystemMessage;
        QB.chat.onSubscribeListener = self.onSubscribe;
        QB.chat.onRejectSubscribeListener = self.onReject;
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

    async onMessage(id, msg) {
        if (id === self.user.id) {
            return false;
        }

        if (msg.body.includes('@so ')) {
            let roomJid = QB.chat.helpers.getRoomJidFromDialogId(msg.dialog_id),
                items = msg.body.trim().replace(/,/gi, ' ').replace(/ {1,}/g,' ').split(' '),
                records,
                record,
                tags,
                text = '';

            switch (items[1]) {
                case '/help':
                    text = `Possible commands:
                    @so /help - all commands list;
                    @so /kick - kick bot from the current group chat;
                    @so /list - get current tags' list;
                    @so /subscribe <subscription> [filters] - subscribe on main tag.
                    @so /unsubscribe <subscription> - unsubscribe from main tag;
                    @so /last - get last information from StackOverfrow;`;
                    break;

                case '/kick':
                    self.removeDialog(msg.dialog_id);
                    break;

                case '/list':
                    records = await qbData.getRecordsByDialogId(msg.dialog_id);

                    if (records.length) {
                        records.forEach((record) => {
                            if (record.tag) {
                                text += `Subscribed to "${record.tag}", `;
                            }

                            text += `filters: [ ${record.filters} ].\n`;
                        });
                    } else {
                        text += 'Not subscribed. Use "@so /subscribe [subscription]" to add new subscription.\n';
                    }
                    break;

                case '/subscribe':
                    record = await qbData.subscribe({
                        dialogId: msg.dialog_id,
                        tag: items[2],
                        filters: items.splice(3)
                    });
                    text = `Subscribed to "${record.tag}", filters: [ ${record.filters} ]`;
                    break;

                case '/unsubscribe':
                    record = await qbData.unsubscribe(msg.dialog_id, items[2]);
                    if (!record) {
                        text = 'Unsubscribed. Use "@so /subscribe [subscription]" to add new subscription.';
                    }
                    break;

                case '/last':
                    tags = await qbData.getAllRecordsTags();

                    text = `ALL SUBSCRIPTIONS: [ ${tags} ]`;
                    break;

                default:
                    text = 'I don\'t know what you want. Use "@so /help" to get all commands list.';
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

    async onSystemMessage(msg) {
        const type = msg.extension && msg.extension.notification_type,
              dialogId = msg.extension && msg.extension.dialog_id,
              dialog = await qbDialog.get(dialogId),
              roomJid = dialog.xmpp_room_jid;

        if (type === '1') {
            QB.chat.muc.join(roomJid, () => {
                self.sendMessage({
                    to: roomJid,
                    type: 'groupchat',
                    text: 'Hello everybody! Use "@so /help" to get all commands list.',
                    dialogId: dialogId
                });
            });
        }
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
                qbDialog.install(dialogId);
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

    async removeDialog(dialogId) {
        const dialog = await qbDialog.get(dialogId),
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

        qbDialog.remove(dialogId).then(
            success => qbData.removeRecordsByDialogId(dialogId),
            fail => reject(fail)
        );
    }

    static buildMessage(feedEntry) {
        return `New activity: ${feedEntry.title}. ${feedEntry.link}`;
    }

    fire() {

    }
}
