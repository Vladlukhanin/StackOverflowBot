import QB from 'quickblox';
import QBChat from './QBChat';

export default class QBDialog {
    constructor(selfUserId) {
        this.userId = selfUserId;
        this.userDialogsAssotiation = {};

        this.list();
    }

    list(skip) {
        const self = this;

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
                        let id = QB.chat.helpers.getRecipientId(item.occupants_ids, self.userId);

                        self.userDialogsAssotiation[id] = item._id;
                    }
                });

                if (totalEntries > localEntries) {
                    self.list(localEntries);
                }
            }
        });
    }

    get(dialogId) {
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

    remove(dialogId) {
        this.get(dialogId).then(
            result => sayGoodbyeAndRemove.call(this, result)
        );

        function sayGoodbyeAndRemove(dialog) {
            if (+dialog.type === 2) {
                QBChat.sendMessage({
                    to: dialog.xmpp_room_jid,
                    type: 'groupchat',
                    text: 'Notification message',
                    dialogId: dialogId,
                    notification_type: '2',
                    current_occupant_ids: dialog.occupants_ids.join(),
                    deleted_occupant_ids: this.userId,
                    dialog_update_info: 3
                });
            } else if (+dialog.type === 3) {
                QBChat.sendMessage({
                    to: id,
                    type: 'chat',
                    text: 'Contact request',
                    dialogId: dialogId,
                    notification_type: '7'
                });
            }

            return new Promise((resolve, reject) => {
                QB.chat.dialog.delete([dialogId], (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            });
        }
    }

    install(dialogId) {
        this.get(dialogId).then(
            result => sayHello.call(this, result)
        );

        function sayHello(dialog) {
            console.log(dialog);
            if (+dialog.type === 3) {
                let id = QB.chat.helpers.getRecipientId(dialog.occupants_ids, this.userId);

                this.userDialogsAssotiation[id] = dialog._id;

                QBChat.sendMessage({
                    to: id,
                    type: 'chat',
                    text: 'Contact request',
                    dialogId: dialogId,
                    notification_type: '5'
                });

                QBChat.sendMessage({
                    to: id,
                    type: 'chat',
                    text: 'Hello! Use "@so /help" to get all commands list.',
                    dialogId: dialogId
                });
            } else if (+dialog.type === 2) {
                const roomJid = dialog.xmpp_room_jid;

                QB.chat.muc.join(roomJid, () => {
                    QBChat.sendMessage({
                        to: roomJid,
                        type: 'groupchat',
                        text: 'Hello everybody! Use "@so /help" to get all commands list.',
                        dialogId: dialogId
                    });
                });
            }
        }
    }
}