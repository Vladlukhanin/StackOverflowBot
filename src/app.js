import stackexchange from 'stackexchange';
import QBChat from './QB_modules/QBChat';
import cron from 'node-cron';
import CONFIG from '../config';

const qbChat = new QBChat();
const stackoverflow = new stackexchange({version: 2.2});

class App {
    constructor() {
        this.startTask();

        cron.schedule(`*/${CONFIG.taskRepeatTime} * * * *`, () => {
            this.startTask();
        },  true);
    }

    startTask() {
        this.listPosts()
            .then(posts => {
                posts.forEach(post => {
                    // console.log('tags: ', post.tags);
                })
            })
            .catch(error => {
                console.log('error: ', error);
            });
    }

    listPosts(params = {}) {
        const time = Math.floor(Date.now() / 1000) - (CONFIG.taskRepeatTime * 60),
              results = params.posts || [];

        return new Promise((resolve, reject) => {
            let filters = {
                key: CONFIG.stackoverflow.key,
                page: params.page || 1,
                pagesize: CONFIG.stackoverflow.pagesize,
                fromdate: params.time || time,
                tagged: params.tag || 'javascript',
                sort: 'activity',
                order: 'desc'
            };

            stackoverflow.questions.questions(filters, (err, res) => {
                if (res) {
                    let posts = results.concat(res.items);

                    if (res.has_more) {
                        this.listPosts({
                            fromdate: filters.fromdate,
                            page: ++filters.page,
                            posts: posts
                        })
                            .then(result => resolve(result))
                            .catch(error => reject(error));
                    } else {
                        resolve(posts);
                    }
                } else {
                    reject(err);
                }
            });
        });
    }

}

new App();
