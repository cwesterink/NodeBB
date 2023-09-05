import db = require('../database');
import notifications = require('../notifications');
import privileges = require('../privileges');
import plugins = require('../plugins');
import utils = require('../utils');


interface NotifData {
  type: string,
  bodyShort: string;
  nid: string;
  mergeId?: string,
}

interface Data extends NotifData {
  subject: string;
  bodyLong: string;
  pid: number;
  path: string;
  tid: number;
  from: number;
  topicTitle: string;
}

interface FollowData {
  following: boolean;
  ignoring: boolean;
}

interface PostData {
  topic: {
    tid: number
  };
  content: string;
  pid: number;
}

interface TopicsI {
  notifyFollowers: (postData: any, exceptUid: any, notifData: NotifData) => Promise<void>;
  toggleFollow: (tid: number, uid: number) => Promise<boolean>;
  exists: (tid: number) => Promise<boolean | boolean[]>;
  unfollow: (tid: number, uid: number) => Promise<void>;
  follow: (tid: number, uid: number) => Promise<void>;
  ignore: (tid: number, uid: number) => Promise<void>;
  isFollowing: (tids: number[], uid: number) => Promise<boolean[]>;
  isIgnoring: (tids: number[], uid: number) => Promise<boolean[]>;
  getFollowData: (tids: number[], uid: number) => Promise<FollowData[]>;
  getFollowers: (tid: number) => Promise<number[]>;
  getIgnorers: (tid: number) => Promise<number[]>;
  filterIgnoringUids: (tid: number, uids: number[]) => Promise<number[]>;
  filterWatchedTids: (tids: number[], uid: number) => Promise<number[]>;
  filterNotIgnoredTids: (tids: number[], uid: number) => Promise<number[]>;
}


async function addToSets(set1, set2, tid, uid) {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await db.setAdd(set1, uid);
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await db.sortedSetAdd(set2, Date.now(), tid);
}

async function removeFromSets(set1, set2, tid, uid) {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await db.setRemove(set1, uid);
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await db.sortedSetRemove(set2, tid);
}

async function follow(tid: number, uid: number) {
    await addToSets(`tid:${tid}:followers`, `uid:${uid}:followed_tids`, tid, uid);
}

async function unfollow(tid: number, uid: number) {
    await removeFromSets(`tid:${tid}:followers`, `uid:${uid}:followed_tids`, tid, uid);
}

async function ignore(tid: number, uid: number) {
    await addToSets(`tid:${tid}:ignorers`, `uid:${uid}:ignored_tids`, tid, uid);
}

async function unignore(tid: number, uid: number) {
    await removeFromSets(`tid:${tid}:ignorers`, `uid:${uid}:ignored_tids`, tid, uid);
}

async function isIgnoringOrFollowing(set: string, tids: number[], uid: number): Promise<boolean[]> {
    if (!Array.isArray(tids)) {
        return;
    }
    if (uid <= 0) {
        return tids.map(() => false);
    }
    const keys = tids.map(tid => `tid:${tid}:${set}`);
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return await db.isMemberOfSets(keys, uid) as boolean[];
}

module.exports = function (Topics: TopicsI) {
    async function setWatching(method1, method2, hook, tid: number, uid: number) {
        if (!(uid > 0)) {
            throw new Error('[[error:not-logged-in]]');
        }

        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const exists = await Topics.exists(tid) as boolean;
        if (!exists) {
            throw new Error('[[error:no-topic]]');
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await method1(tid, uid);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await method2(tid, uid);
        await plugins.hooks.fire(hook, { uid: uid, tid: tid });
    }

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Topics.toggleFollow = async function (tid: number, uid: number) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const exists = await Topics.exists(tid);
        if (!exists) {
            throw new Error('[[error:no-topic]]');
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const isFollowing = await Topics.isFollowing([tid], uid);
        if (isFollowing[0]) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            await Topics.unfollow(tid, uid);
        } else {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            await Topics.follow(tid, uid);
        }
        return !isFollowing[0];
    };
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Topics.follow = async function (tid: number, uid: number) {
        await setWatching(follow, unignore, 'action:topic.follow', tid, uid);
    };
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Topics.unfollow = async function (tid: number, uid: number) {
        await setWatching(unfollow, unignore, 'action:topic.unfollow', tid, uid);
    };
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Topics.ignore = async function (tid: number, uid: number) {
        await setWatching(ignore, unfollow, 'action:topic.ignore', tid, uid);
    };

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Topics.isFollowing = async function (tids: number[], uid: number) {
        return await isIgnoringOrFollowing('followers', tids, uid);
    };
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Topics.isIgnoring = async function (tids: number[], uid: number) {
        return await isIgnoringOrFollowing('ignorers', tids, uid);
    };
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Topics.getFollowData = async function (tids: number[], uid: number) {
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
        const data = await db.isMemberOfSets(keys, uid) as boolean[];

        const followData: FollowData[] = [];
        for (let i = 0; i < data.length; i += 2) {
            followData.push({
                following: data[i],
                ignoring: data[i + 1],
            });
        }
        return followData;
    };

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Topics.getFollowers = async function (tid: number) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return await db.getSetMembers(`tid:${tid}:followers`) as number[];
    };

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Topics.getIgnorers = async function (tid: number) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return await db.getSetMembers(`tid:${tid}:ignorers`) as number[];
    };

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Topics.filterIgnoringUids = async function (tid: number, uids: number[]) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const isIgnoring = await db.isSetMembers(`tid:${tid}:ignorers`, uids) as boolean[];
        const readingUids = uids.filter((uid, index) => uid && !isIgnoring[index]);
        return readingUids;
    };

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Topics.filterWatchedTids = async function (tids: number[], uid: number) {
        if (uid <= 0) {
            return [];
        }

        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const scores: (number | null)[] = await db.sortedSetScores(`uid:${uid}:followed_tids`, tids) as (number | null)[];
        return tids.filter((tid, index) => tid && !!scores[index]);
    };

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Topics.filterNotIgnoredTids = async function (tids: number[], uid: number) {
        if (uid <= 0) {
            return tids;
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const scores: (number | null)[] = await db.sortedSetScores(`uid:${uid}:ignored_tids`, tids) as (number | null)[];
        return tids.filter((tid, index) => tid && !scores[index]);
    };

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Topics.notifyFollowers = async function (postData: PostData, exceptUid: number, notifData: NotifData) {
        notifData = notifData || {} as NotifData;

        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        let followers = await Topics.getFollowers(postData.topic.tid);
        const index = followers.indexOf(exceptUid);
        if (index !== -1) {
            followers.splice(index, 1);
        }

        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        followers = await privileges.topics.filterUids('topics:read', postData.topic.tid, followers) as number[];
        if (!followers.length) {
            return;
        }

        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        let { title } = postData.topic as { title?: string};
        if (title) {
            title = utils.decodeHTMLEntities(title);
        }

        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const notification = await notifications.create({
            subject: title,
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
            tid: postData.topic.tid,
            from: exceptUid,
            topicTitle: title,
            ...notifData,
        } as Data) as Data;

        await notifications.push(notification, followers);
    };
};
