'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _feedparser = require('feedparser');

var _feedparser2 = _interopRequireDefault(_feedparser);

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class FeedparserService {
    constructor() {
        this.items = [];
    }

    parse(url, successCallback, errorCallback) {
        let self = this;

        console.log(`quering url: ${url}`);

        let req = (0, _request2.default)({
            headers: { "user-agent": "node.js" },
            uri: url
        });

        let feedparser = new _feedparser2.default([]);

        req.on('error', error => {
            errorCallback(error);
        });

        req.on('response', res => {
            let stream = res;

            console.log("res.statusCode: " + res.statusCode);
            console.log("res.statusMessage: " + res.statusMessage);

            if (res.statusCode !== 200) {
                return this.emit('error', new Error(res.statusCode + " " + res.statusMessage));
            }

            stream.pipe(feedparser);
        });

        feedparser.on('error', error => {
            errorCallback(error);
        });

        feedparser.on('readable', () => {
            // This is where the action is!
            let stream = feedparser,
                meta = stream.meta,
                // **NOTE** the "meta" is always available in the context of the feedparser instance
            item;

            while (item = stream.read()) {
                self.items.push(item);
            }
        });

        feedparser.on('end', error => {
            successCallback(self.items);
        });
    }
}
exports.default = FeedparserService;
//# sourceMappingURL=feedparser_service.js.map