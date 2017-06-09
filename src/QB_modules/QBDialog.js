import QB from 'quickblox';

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

    async get(dialogId) {
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

    async remove(dialogId) {
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

    async install(dialogId) {
        const dialog = await self.get(dialogId);

        if (+dialog.type === 3) {
            let id = QB.chat.helpers.getRecipientId(dialog.occupants_ids, self.user.id);
            this.userDialogsAssotiation[id] = dialog._id;
        }

        return dialog;
    }
}