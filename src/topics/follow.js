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
Object.defineProperty(exports, "__esModule", { value: true });
const db = require("../database");
const notifications = require("../notifications");
const privileges = require("../privileges");
const plugins = require("../plugins");
const utils = require("../utils");
module.exports = function (Topics) {
    function addToSets(set1, set2, tid, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            yield db.setAdd(set1, uid);
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            yield db.sortedSetAdd(set2, Date.now(), tid);
        });
    }
    function removeFromSets(set1, set2, tid, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            yield db.setRemove(set1, uid);
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            yield db.sortedSetRemove(set2, tid);
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
            if (uid <= 0) {
                return tids.map(() => false);
            }
            const keys = tids.map(tid => `tid:${tid}:${set}`);
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            return yield db.isMemberOfSets(keys, uid);
        });
    }
    function setWatching(method1, method2, hook, tid, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(uid > 0)) {
                throw new Error('[[error:not-logged-in]]');
            }
            const exists = yield Topics.exists(tid);
            if (!exists) {
                throw new Error('[[error:no-topic]]');
            }
            yield method1(tid, uid);
            yield method2(tid, uid);
            yield plugins.hooks.fire(hook, { uid: uid, tid: tid });
        });
    }
    Topics.toggleFollow = function (tid, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            const exists = yield Topics.exists(tid);
            if (!exists) {
                throw new Error('[[error:no-topic]]');
            }
            const isFollowing = yield Topics.isFollowing([tid], uid);
            if (isFollowing[0]) {
                yield Topics.unfollow(tid, uid);
            }
            else {
                yield Topics.follow(tid, uid);
            }
            return !isFollowing[0];
        });
    };
    Topics.follow = function (tid, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            yield setWatching(follow, unignore, 'action:topic.follow', tid, uid);
        });
    };
    Topics.unfollow = function (tid, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            yield setWatching(unfollow, unignore, 'action:topic.unfollow', tid, uid);
        });
    };
    Topics.ignore = function (tid, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            yield setWatching(ignore, unfollow, 'action:topic.ignore', tid, uid);
        });
    };
    Topics.isFollowing = function (tids, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield isIgnoringOrFollowing('followers', tids, uid);
        });
    };
    Topics.isIgnoring = function (tids, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield isIgnoringOrFollowing('ignorers', tids, uid);
        });
    };
    Topics.getFollowData = function (tids, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!Array.isArray(tids)) {
                return;
            }
            if (uid <= 0) {
                return tids.map(() => ({ following: false, ignoring: false }));
            }
            const keys = [];
            tids.forEach(tid => keys.push(`tid:${tid}:followers`, `tid:${tid}:ignorers`));
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const data = yield db.isMemberOfSets(keys, uid);
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
    Topics.getFollowers = function (tid) {
        return __awaiter(this, void 0, void 0, function* () {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            return yield db.getSetMembers(`tid:${tid}:followers`);
        });
    };
    Topics.getIgnorers = function (tid) {
        return __awaiter(this, void 0, void 0, function* () {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            return yield db.getSetMembers(`tid:${tid}:ignorers`);
        });
    };
    Topics.filterIgnoringUids = function (tid, uids) {
        return __awaiter(this, void 0, void 0, function* () {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const isIgnoring = yield db.isSetMembers(`tid:${tid}:ignorers`, uids);
            const readingUids = uids.filter((uid, index) => uid && !isIgnoring[index]);
            return readingUids;
        });
    };
    Topics.filterWatchedTids = function (tids, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            if (uid <= 0) {
                return [];
            }
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const scores = yield db.sortedSetScores(`uid:${uid}:followed_tids`, tids);
            return tids.filter((tid, index) => tid && !!scores[index]);
        });
    };
    Topics.filterNotIgnoredTids = function (tids, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            if (uid <= 0) {
                return tids;
            }
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const scores = yield db.sortedSetScores(`uid:${uid}:ignored_tids`, tids);
            return tids.filter((tid, index) => tid && !scores[index]);
        });
    };
    Topics.notifyFollowers = function (postData, exceptUid, notifData) {
        return __awaiter(this, void 0, void 0, function* () {
            let followers = yield Topics.getFollowers(postData.topic.tid);
            const index = followers.indexOf(exceptUid);
            if (index !== -1) {
                followers.splice(index, 1);
            }
            followers = (yield privileges.topics.filterUids('topics:read', postData.topic.tid, followers));
            if (!followers.length) {
                return;
            }
            let { title } = postData.topic;
            if (title) {
                title = utils.decodeHTMLEntities(title);
            }
            const notification = yield notifications.create(Object.assign({ subject: title, bodyLong: postData.content, pid: postData.pid, path: `/post/${postData.pid}`, tid: postData.topic.tid, from: exceptUid, topicTitle: title }, notifData));
            yield notifications.push(notification, followers);
        });
    };
};
