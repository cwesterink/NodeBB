"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const database_1 = __importDefault(require("../database"));
const notifications_1 = __importDefault(require("../notifications"));
const privileges_1 = __importDefault(require("../privileges"));
const plugins_1 = __importDefault(require("../plugins"));
const utils_1 = __importDefault(require("../utils"));
function addToSets(set1, set2, tid, uid) {
    return __awaiter(this, void 0, void 0, function* () {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        yield database_1.default.setAdd(set1, uid);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        yield database_1.default.sortedSetAdd(set2, Date.now(), tid);
    });
}
function removeFromSets(set1, set2, tid, uid) {
    return __awaiter(this, void 0, void 0, function* () {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        yield database_1.default.setRemove(set1, uid);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        yield database_1.default.sortedSetRemove(set2, tid);
    });
}
function follow(tid, uid) {
    return __awaiter(this, void 0, void 0, function* () {
        yield addToSets(`tid:${tid}:followers`, `uid:${uid}:followed_tids`, tid, uid);
    });
}
function unfollow(tid, uid) {
    return __awaiter(this, void 0, void 0, function* () {
        yield removeFromSets(`tid:${tid}:followers`, `uid:${uid}:followed_tids`, tid, uid);
    });
}
function ignore(tid, uid) {
    return __awaiter(this, void 0, void 0, function* () {
        yield addToSets(`tid:${tid}:ignorers`, `uid:${uid}:ignored_tids`, tid, uid);
    });
}
function unignore(tid, uid) {
    return __awaiter(this, void 0, void 0, function* () {
        yield removeFromSets(`tid:${tid}:ignorers`, `uid:${uid}:ignored_tids`, tid, uid);
    });
}
function isIgnoringOrFollowing(set, tids, uid) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!Array.isArray(tids)) {
            return;
        }
        if (parseInt(uid, 10) <= 0) {
            return tids.map(() => false);
        }
        const keys = tids.map(tid => `tid:${tid}:${set}`);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return yield database_1.default.isMemberOfSets(keys, uid);
    });
}
function FollowTopics(Topics) {
    function setWatching(method1, method2, hook, tid, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(parseInt(uid, 10) > 0)) {
                throw new Error('[[error:not-logged-in]]');
            }
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const exists = yield Topics.exists(tid);
            if (!exists) {
                throw new Error('[[error:no-topic]]');
            }
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            yield method1(tid, uid);
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            yield method2(tid, uid);
            yield plugins_1.default.hooks.fire(hook, { uid: uid, tid: tid });
        });
    }
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Topics.toggleFollow = function (tid, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const exists = yield Topics.exists(tid);
            if (!exists) {
                throw new Error('[[error:no-topic]]');
            }
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const isFollowing = yield Topics.isFollowing([tid], uid);
            if (isFollowing[0]) {
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                yield Topics.unfollow(tid, uid);
            }
            else {
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                yield Topics.follow(tid, uid);
            }
            return !isFollowing[0];
        });
    };
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Topics.follow = function (tid, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            yield setWatching(follow, unignore, 'action:topic.follow', tid, uid);
        });
    };
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Topics.unfollow = function (tid, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            yield setWatching(unfollow, unignore, 'action:topic.unfollow', tid, uid);
        });
    };
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Topics.ignore = function (tid, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            yield setWatching(ignore, unfollow, 'action:topic.ignore', tid, uid);
        });
    };
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Topics.isFollowing = function (tids, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield isIgnoringOrFollowing('followers', tids, uid);
        });
    };
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Topics.isIgnoring = function (tids, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield isIgnoringOrFollowing('ignorers', tids, uid);
        });
    };
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Topics.getFollowData = function (tids, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!Array.isArray(tids)) {
                return;
            }
            if (parseInt(uid, 10) <= 0) {
                return tids.map(() => ({ following: false, ignoring: false }));
            }
            const keys = [];
            tids.forEach(tid => keys.push(`tid:${tid}:followers`, `tid:${tid}:ignorers`));
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const data = yield database_1.default.isMemberOfSets(keys, uid);
            const followData = [];
            for (let i = 0; i < data.length; i += 2) {
                followData.push({
                    following: data[i],
                    ignoring: data[i + 1],
                });
            }
            return followData;
        });
    };
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Topics.getFollowers = function (tid) {
        return __awaiter(this, void 0, void 0, function* () {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            return yield database_1.default.getSetMembers(`tid:${tid}:followers`);
        });
    };
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Topics.getIgnorers = function (tid) {
        return __awaiter(this, void 0, void 0, function* () {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            return yield database_1.default.getSetMembers(`tid:${tid}:ignorers`);
        });
    };
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Topics.filterIgnoringUids = function (tid, uids) {
        return __awaiter(this, void 0, void 0, function* () {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const isIgnoring = yield database_1.default.isSetMembers(`tid:${tid}:ignorers`, uids);
            const readingUids = uids.filter((uid, index) => uid && !isIgnoring[index]);
            return readingUids;
        });
    };
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Topics.filterWatchedTids = function (tids, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            if (parseInt(uid, 10) <= 0) {
                return [];
            }
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const scores = yield database_1.default.sortedSetScores(`uid:${uid}:followed_tids`, tids);
            return tids.filter((tid, index) => tid && !!scores[index]);
        });
    };
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Topics.filterNotIgnoredTids = function (tids, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            if (parseInt(uid, 10) <= 0) {
                return tids;
            }
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const scores = yield database_1.default.sortedSetScores(`uid:${uid}:ignored_tids`, tids);
            return tids.filter((tid, index) => tid && !scores[index]);
        });
    };
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Topics.notifyFollowers = function (postData, exceptUid, notifData) {
        return __awaiter(this, void 0, void 0, function* () {
            notifData = notifData || {};
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            let followers = yield Topics.getFollowers(postData.topic.tid);
            const index = followers.indexOf(String(exceptUid));
            if (index !== -1) {
                followers.splice(index, 1);
            }
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            followers = (yield privileges_1.default.topics.filterUids('topics:read', postData.topic.tid, followers));
            if (!followers.length) {
                return;
            }
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            let { title } = postData.topic;
            if (title) {
                title = utils_1.default.decodeHTMLEntities(title);
            }
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const notification = yield notifications_1.default.create(Object.assign({ subject: title, 
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                bodyLong: postData.content, 
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                pid: postData.pid, 
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                path: `/post/${postData.pid}`, 
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                tid: postData.topic.tid, from: exceptUid, topicTitle: title }, notifData));
            yield notifications_1.default.push(notification, followers);
        });
    };
}
module.exports = FollowTopics;
