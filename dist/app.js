'use strict';

var _QBChat = require('./QB_modules/QBChat');

var _QBChat2 = _interopRequireDefault(_QBChat);

var _nodeCron = require('node-cron');

var _nodeCron2 = _interopRequireDefault(_nodeCron);

var _stackexchange = require('stackexchange');

var _stackexchange2 = _interopRequireDefault(_stackexchange);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// const stackoverflowFeedUrl = "http://stackoverflow.com/feeds/tag/";

// import CONFIG from '../config';
const qbChat = new _QBChat2.default(); // import FeedparserService from './feedparser_service';

const stackoverflowAPI = new _stackexchange2.default({ version: 2.2 });

class App {
    constructor() {
        try {
            console.log(qbChat);
            this.task.start();
        } catch (error) {
            console.log(`cron pattern not valid: ${error}`);
        }
    }

    task() {
        _nodeCron2.default.schedule('*/1 * * * *', () => {
            this.start();
        }, true);
    }

    start() {
        const filter = {
            key: 'heKdt7ZTr9pm1kqirZ6OPg((',
            pagesize: 1,
            tagged: 'quickblox',
            sort: 'activity',
            order: 'asc'
        };

        stackoverflowAPI.questions.questions(filter, function (err, results) {
            if (err) throw err;

            console.log(results.items);
            console.log(results.has_more);
        });
    }

    // start(tag, params) {
    //     let self = this;
    //     console.log('start by cron');
    //     console.log(CONFIG.stackoverflow.additionalTags);
    //
    //     let feedParser = new FeedparserService();
    //
    //     feedParser.parse(stackoverflowFeedUrl + (tag || CONFIG.stackoverflow.mainTag), (items) => {
    //             console.log(`got ${items.length} entries`);
    //
    //             items.forEach((item, i, arr) => {
    //                 if (self.isNewEntry(item) && self.isNeededTags(item)) {
    //                     console.log(`New Entry found. Date: ${item.date}. Title: ${item.title}`);
    //
    //                     // notify QuickBlox
    //                     if (qbChat) {
    //                         let message = qbChat.buildMessage(item);
    //
    //                         if (params) {
    //                             QBChat.sendMessage({
    //                                 to: params.to,
    //                                 type: params.type,
    //                                 text: message,
    //                                 dialogId: params.dialogId
    //                             });
    //                         } else {
    //                             qbChat.fire(message,
    //                                 () => {
    //                                     console.log('Message has pushed to QuickBlox successfully.');
    //                                 }, (error) => {
    //                                     console.error(error);
    //                                 }
    //                             );
    //                         }
    //                     }
    //
    //                 }
    //             });
    //
    //         }, function(error) {
    //             console.error(error);
    //         }
    //     );
    // }
    //
    // isNewEntry(entry) {
    //     let entryTimestamp = entry.date.getTime(),
    //         currentTimestamp = Date.now();
    //
    //     return (currentTimestamp - entryTimestamp) <= (60 * 24 * 360 * 1000);
    // }
    //
    // isNeededTags(entry) {
    //     for (let i = 0; i < entry.categories.length; i++){
    //         let entryTag = entry.categories[i];
    //
    //         for(let j = 0; j < CONFIG.stackoverflow.additionalTags.length; j++){
    //             let tagToCheck = CONFIG.stackoverflow.additionalTags[j];
    //
    //             if (entryTag === tagToCheck) {
    //                 return true;
    //             }
    //         }
    //
    //     }
    //
    //     return false;
    // }
}

new App();
//# sourceMappingURL=app.js.map