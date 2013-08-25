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