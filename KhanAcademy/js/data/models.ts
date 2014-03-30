module KA {
    export enum ObjectType {
        domain = 0,
        subject = 1,
        topic = 2,
        tutorial = 3,
        video = 4
    };

    export class AuthToken {
        constructor(public key: string, public secret: string) { }
    }

    export interface ResumeInfo {
        userId: string;
        videoId: string;
        currentTime: number;
    }

    // It would be better to separate out the per user info so we don't need to store the user ID.
    // But for consistency with ResumeInfo I'm storing the userId inside for now.
    export interface WatchedInfo {
        userId: string;
        videoId: string;
    }

    export interface UserInfo {
        id: string;
        nickName: string;
        points: string;
        avatarUrl: string;
        profileRoot: string;
        joined: Date;
    }

    export interface Item {
        id: string;
        title: string;
        type: ObjectType;
    }

    export interface Domain extends Item {
        children: Item[];
    }

    export interface Subject extends Domain {
        description: string;
        kaUrl: string;
        domainId?: string;
    }

    export interface Topic extends Subject {
    }

    export interface Tutorial extends Topic {
        domainId: string;
    }

    export interface VideoInfo extends Item {
        imgUrl: string;
    }

    export interface Video {
        id: string;
        description: string;
        title: string;
        kaUrl: string;
        dateAdded: Date;
        youTubeId: string;
        imgUrl: string;
        vidUrl?: string;
        imgHiUrl?: string;
        parents?: string[];
    }

    export interface VideoDownload {
        videoId: string;
        dateDownloaded: Date;
    }

    export interface TrackedDownload {
        videoId: string;
        guid: string;
    }
}