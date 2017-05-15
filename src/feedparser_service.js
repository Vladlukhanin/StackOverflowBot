import FeedParser from 'feedparser';
import request from 'request';

export default class FeedparserService {
    constructor() {
        this.items = [];
    }

    parse(url, successCallback, errorCallback) {
        let self = this;

        console.log(`quering url: ${url}`);

        let req = request({
                headers: { "user-agent": "node.js" },
                uri: url
            });

        let feedparser = new FeedParser([]);

        req.on('error', (error) => {
            errorCallback(error);
        });

        req.on('response', (res) => {
            let stream = res;

            console.log("res.statusCode: " + res.statusCode);
            console.log("res.statusMessage: " + res.statusMessage);

            if (res.statusCode !== 200) {
                return this.emit('error', new Error(res.statusCode + " " + res.statusMessage));
            }

            stream.pipe(feedparser);
        });

        feedparser.on('error', (error) => {
            errorCallback(error);
        });

        feedparser.on('readable', () => {
            // This is where the action is!
            let stream = feedparser,
                meta = stream.meta, // **NOTE** the "meta" is always available in the context of the feedparser instance
                item;

            while (item = stream.read()) {
                self.items.push(item);
            }
        });

        feedparser.on('end', (error) => {
            successCallback(self.items);
        });
    }
}
