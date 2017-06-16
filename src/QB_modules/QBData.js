import QB from 'quickblox';

export default class QBData {
    constructor(dataClassName) {
        this.dataClassName = dataClassName;
    }

    subscribe(params) {
        const self = this;

        return new Promise((resolve, reject) => {
            QB.data.create(self.dataClassName, params, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });
    }

    async unsubscribe(dialogId, tag) {
        let result;

        if (tag) {
            result = await this.removeRecordByTag(dialogId, tag);
        } else {
            result = await this.removeRecordsByDialogId(dialogId);
        }

        return result;
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
                        self.listRecords(params, results, total);
                    } else {
                        resolve(results);
                    }
                } else {
                    reject(err);
                }
            });
        });
    }

    getRecordsByDialogId(dialogId) {
        const self = this;

        return new Promise((resolve, reject) => {
            self.listRecords({dialogId: dialogId}).then(
                results => resolve(results),
                error => reject(error)
            )
        });
    }

// async getRecordByTag(dialogId, tag) {
//     const records = await this.getRecordsByDialogId(dialogId);
//
//     let result = null;
//
//     records.forEach((record) => {
//         if (tag === record.tag) {
//             result = record;
//         }
//     });
//
//     return result;
// }

    getAllRecordsTags() {
        const self = this;

        return new Promise((resolve, reject) => {
            self.listRecords({sort_asc: 'created_at'}).then(
                result => resolve(getUniqueTags(result)),
                error => reject(error)
            )
        });

        function getUniqueTags(records) {
            let items = new Set();

            records.forEach((record) => {
                let item = record.tag;

                if (item && (typeof item === 'string')) {
                    items.add(item);
                }
            });

            return [...items];
        }
    }

    async removeRecords(params) {
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
        const records = await this.getRecordsByDialogId(dialogId);

        let _ids = [];

        records.forEach((record) => {
            _ids.push(record._id);
        });

        return await this.removeRecords(_ids);
    }

    async removeRecordByTag(dialogId, tag) {
        const record = await this.getRecordByTag(dialogId, tag);

        return await this.removeRecords(record._id);
    }
}
