module KA {
    export enum ObjectType {
        domain = 0,
        subject = 1,
        topic = 2,
        tutorial = 3,
        video = 4
    };

    export interface AuthToken {
        key?: string;
        secret?: string;
    }

    export interface ResumeInfo {
        userId: string;
        videoId: string;
        currentTime: number;
    }
}