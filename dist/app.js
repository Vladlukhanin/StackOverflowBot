'use strict';

var _feedparser_service = require('./feedparser_service');

var _feedparser_service2 = _interopRequireDefault(_feedparser_service);

var _quickblox_service = require('./quickblox_service');

var _quickblox_service2 = _interopRequireDefault(_quickblox_service);

var _config = require('../config');

var _config2 = _interopRequireDefault(_config);

var _cron = require('cron');

var _cron2 = _interopRequireDefault(_cron);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const stackoverflowFeedUrl = "http://stackoverflow.com/feeds/tag/";
const quickbloxAPI = new _quickblox_service2.default();

class App {
    constructor() {
        let self = this;

        try {
            new _cron2.default.CronJob('*/5 * * * *', () => {
                self.start();
            }, null, true, 'America/Los_Angeles');
        } catch (ex) {
            console.log(`cron pattern not valid: ${ex}`);
        }
    }

    start() {
        let self = this;

        console.log('start by cron');
        console.log(_config2.default.stackoverflow.additionalTags);

        let feedParser = new _feedparser_service2.default();

        feedParser.parse(stackoverflowFeedUrl + _config2.default.stackoverflow.mainTag, function (entries) {
            console.log(`got ${entries.length} entries`);

            entries.forEach(function (entry, i, arr) {
                let isNew = self.isNewEntry(entry);

                if (isNew && self.isEntryHasNeededTags(entry)) {
                    console.log(`New Entry found. Date: ${entry.date}. Title: ${entry.title}`);

                    // notify QuickBlox
                    if (quickbloxAPI) {
                        let message = quickbloxAPI.buildMessage(entry);

                        quickbloxAPI.fire(message, () => {
                            console.log('Message has pushed to QuickBlox successfully.');
                        }, error => {
                            console.error(error);
                        });
                    }
                }
            });
        }, function (error) {
            console.error(error);
        });
    }

    isNewEntry(entry) {
        let entryTimestamp = entry.date.getTime(),
            currentTimestamp = Date.now();

        return currentTimestamp - entryTimestamp <= 300 * 1000;
    }

    isEntryHasNeededTags(entry) {
        for (let i = 0; i < entry.categories.length; i++) {
            let entryTag = entry.categories[i];

            for (let j = 0; j < _config2.default.stackoverflow.additionalTags.length; j++) {
                let tagToCheck = _config2.default.stackoverflow.additionalTags[j];

                if (entryTag == tagToCheck) {
                    return true;
                }
            }
        }

        return false;
    }
}

new App();
//# sourceMappingURL=app.js.map