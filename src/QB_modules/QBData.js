import QB from 'quickblox';

export default class QBData {
    constructor() {
        this.dataClassName = 'StackOverflowBot';
    }

    async subscribe(params) {
        return await this.createRecord(params);
    }

    async unsubscribe(dialogId, tag) {
        return await this.removeRecordByTag(dialogId, {tag: tag});
    }

    async listRecords(params, items = [], skip = 0) {
        const self = this,
              limit = 1000;

        params.limit = limit;
        params.skip = skip;

        return new Promise((resolve, reject) => {
            QB.data.list(this.dataClassName, params, (err, res) => {
                if (res) {
                    let results = items.concat(res.items),
                        total = limit + skip;

                    if (results.length === total) {
                        self.getRecords(params, results, total);
                    } else {
                        resolve(results);
                    }
                } else {
                    reject(err);
                }
            });
        });
    }

    async getRecordsByDialogId(dialogId) {
        return await this.listRecords({dialogId: dialogId});
    }

    async getRecordByTag(dialogId, tag) {
        const records = await this.getRecordsByDialogId(dialogId);

        let item = null;

        records.forEach((record) => {
            let itemTag = record.tag;

            if (itemTag && (tag === itemTag)) {
                item = record;
            }
        });

        return item;
    }

    async getAllRecordsTags() {
        const records = await this.listRecords({sort_asc: 'created_at'});

        let items = new Set();

        records.forEach((record) => {
            let item = record.tag;

            if (item && (typeof item === 'string')) {
                item = item.toLowerCase();
                items.add(item);
            }
        });

        return [...items];
    }

    async createRecord(params) {
        return new Promise((resolve, reject) => {
            QB.data.create(this.dataClassName, params, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });
    }

    async updateRecord(dialogId, params) {
        const record = await this.getRecordsByDialogId(dialogId);

        params._id = record._id;

        if (!record.tags && params.add_to_set) {
            params.tags = params.add_to_set.tags;
            delete params.add_to_set;
        }

        return new Promise((resolve, reject) => {
            QB.data.update(this.dataClassName, params, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    if (params.subscription) {
                        resolve(res.subscription);
                    } else {
                        resolve(res.tags);
                    }
                }
            });
        });
    }

    static async removeRecords(params) {
        return new Promise((resolve, reject) => {
            QB.data.delete(this.dataClassName, params, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });
    }

    async removeRecordsByDialogId(dialogId) {
        return await this.removeRecords({dialogId: dialogId});
    }

    async removeRecordByTag(dialogId, tag) {
        const record = await this.getRecordByTag(dialogId, tag);

        return await this.removeRecords(record._id);
    }
}
