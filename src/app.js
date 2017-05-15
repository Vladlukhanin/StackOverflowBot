import FeedparserService from './feedparser_service';
import QuickBloxService from './quickblox_service';
import CONFIG from '../config';
import cron from 'node-cron';

const stackoverflowFeedUrl = "http://stackoverflow.com/feeds/tag/";
const quickbloxAPI = new QuickBloxService();

class App {
    constructor() {
        let self = this;

        self.task = cron.schedule('*/2 * * * *', () => {
            self.start();
        },  true);

        try {
            self.task.start();
        } catch(error) {
            console.log(`cron pattern not valid: ${error}`);
        }
    }

    start() {
        let self = this;
        console.log('start by cron');
        console.log(CONFIG.stackoverflow.additionalTags);

        let feedParser = new FeedparserService();

        feedParser.parse(stackoverflowFeedUrl + CONFIG.stackoverflow.mainTag, (items) => {
                console.log(`got ${items.length} entries`);

                items.forEach((item, i, arr) => {
                    if (self.isNewEntry(item) && self.isNeededTags(item)) {
                        console.log(`New Entry found. Date: ${item.date}. Title: ${item.title}`);

                        // notify QuickBlox
                        if (quickbloxAPI) {
                            let message = quickbloxAPI.buildMessage(item);

                            quickbloxAPI.fire(message,
                                () => {
                                    console.log('Message has pushed to QuickBlox successfully.');
                                }, (error) => {
                                    console.error(error);
                                }
                            );
                        }

                    }
                });

            }, function(error) {
                console.error(error);
            }
        );
    }

    isNewEntry(entry) {
        let entryTimestamp = entry.date.getTime(),
            currentTimestamp = Date.now();

        return (currentTimestamp - entryTimestamp) <= (60 * 24 * 360 * 1000);
    }

    isNeededTags(entry) {
        for (let i = 0; i < entry.categories.length; i++){
            let entryTag = entry.categories[i];

            for(let j = 0; j < CONFIG.stackoverflow.additionalTags.length; j++){
                let tagToCheck = CONFIG.stackoverflow.additionalTags[j];

                if (entryTag === tagToCheck) {
                    return true;
                }
            }

        }

        return false;
    }
}

new App();
