/// <reference path="../utilities.ts" />
/// <reference path="../extensions.ts" />
/// <reference path="models.ts" />
/// <reference path="../../scripts/typings/winjs.d.ts" />
/// <reference path="../../scripts/typings/winrt.d.ts" />
/// <reference path="../settings.ts" />

module KA {
    'use strict';
    var app: any = WinJS.Application;
    var networkInfo: any = Windows.Networking.Connectivity.NetworkInformation;

    var service: Data;
    var topicUrl = 'http://www.khanacademy.org/api/v1/topictree';
    var savedDateFileName = 'data.json';
    var isConnected = null;

    export class Data {
        static newAndNoteworthyId = 'x29232c6b';

        // When processing topic tree, we selectively include domains to show in the app. This is to avoid issues caused by new domains being added on ka.org.
        private allowedDomains = [
            Data.newAndNoteworthyId,
            'x7a488390', // Math
            'xb92336a2', // Science & Economics
            'x905db83d', // Humanities
            'x7626d097', // Test Prep
            'xd1039e22', // Talks and Interviews
            'xae887ec6', // Projects & Discovery Lab
        ];
        
        private domains: Domain[] = null;
        private videos: Video[] = null;
        lastSyncETag = null;
        lastSyncDate = null;

        getIsConnected() {
            if (isConnected == null) {
                isConnected = service.updateIsConnected();
            }
            return isConnected;
            //return false;
        }

        getSubject(subjectId) {
            var result: Subject;

            for (var i = 0; i < this.domains.length; i++) {
                //does the domain have children that are subjects
                if (this.domains[i].children && this.domains[i].children.length > 0 && this.domains[i].children[0].type == KA.ObjectType.subject) {
                    for (var j = 0; j < this.domains[i].children.length; j++) {
                        if (this.domains[i].children[j].id == subjectId) {
                            result = <Subject>this.domains[i].children[j];
                            result.domainId = this.domains[i].id;
                            break;
                        }
                    }
                    if (result != null) {
                        break;
                    }
                }
            }

            return result;
        }

        getSubjectByTitle(subjectTitle) {
            var result:Subject;

            for (var i = 0; i < this.domains.length; i++) {
                //does the domain have children that are subjects
                if (this.domains[i].children && this.domains[i].children.length > 0 && this.domains[i].children[0].type == KA.ObjectType.subject) {
                    for (var j = 0; j < this.domains[i].children.length; j++) {
                        if (this.domains[i].children[j].title == subjectTitle) {
                            result = <Subject>this.domains[i].children[j];
                            result.domainId = this.domains[i].id;
                            break;
                        }
                    }
                    if (result != null) {
                        break;
                    }
                }
            }

            return result;
        }

        getTopic(subjectId, topicId) {
            var sub = this.getSubject(subjectId);
            var top: Topic = null;

            if (sub != null) {
                for (var i = 0; i < sub.children.length; i++) {
                    if (sub.children[i].id == topicId) {
                        top = <Topic>sub.children[i];
                        break;
                    }
                }
                if (top == null) {
                    console.log('getTopic: topic not found');
                } else {
                    top.domainId = sub.domainId;
                }
            } else {
                console.log('getTopic: subject not found');
            }

            return top;
        }

        getTutorial(subjectId, topicId, tutorialId) {
            var top = this.getTopic(subjectId, topicId);
            var tut: Tutorial = null;

            if (top != null) {
                for (var i = 0; i < top.children.length; i++) {
                    if (top.children[i].id == tutorialId) {
                        tut = <Tutorial>top.children[i];
                        break;
                    }
                }
                if (tut == null) {
                    console.log('getTutorial: tutorial not found');
                }
            } else {
                console.log('getTutorial: topic not found');
            }

            return tut;
        }

        getVideo(videoId) {
            var vid: Video = null;

            for (var i = 0; i < service.videos.length; i++) {
                if (this.videos[i].id == videoId) {
                    vid = this.videos[i];
                    break;
                }
            }

            return vid;
        }

        getVideoInSubject(subjectId, videoId) {
            var vid = this.getVideo(videoId);

            if (vid) {
                //check to make sure requested parented video is returned
                if (vid.parents && vid.parents.length > 1 && vid.parents[1] == subjectId) {
                    return vid;
                } else {
                    //sort through all matching videos with the same id
                    var videos = this.getVideoList(videoId);
                    for (var i = 0; i < videos.length; i++) {
                        if (videos[i].parents && videos[i].parents.length > 1 && videos[i].parents[1] == subjectId) {
                            return videos[i];
                        }
                    }
                }
            } else {
                return null;
            }
        }

        getVideoInTopic(topicId, videoId) {
            var vid = Data.getVideo(videoId);

            if (vid) {
                //check to make sure requested parented video is returned
                if (vid.parents && vid.parents.length > 2 && vid.parents[2] == topicId) {
                    return vid;
                } else {
                    //sort through all matching videos with the same id
                    var videos = this.getVideoList(videoId);
                    for (var i = 0; i < videos.length; i++) {
                        if (videos[i].parents && videos[i].parents.length > 2 && videos[i].parents[2] == topicId) {
                            return videos[i];
                        }
                    }
                }
            } else {
                return null;
            }
        }

        getVideoInTutorial(tutorialId, videoId) {
            var vid = Data.getVideo(videoId);

            if (vid) {
                //check to make sure requested parented video is returned
                if (vid.parents && vid.parents.length > 3 && vid.parents[3] == tutorialId) {
                    return vid;
                } else {
                    //sort through all matching videos with the same id
                    var videos = this.getVideoList(videoId);
                    for (var i = 0; i < videos.length; i++) {
                        if (videos[i].parents && videos[i].parents.length > 3 && videos[i].parents[3] == tutorialId) {
                            return videos[i];
                        }
                    }
                }
            } else {
                return null;
            }
        }

        getVideoList(videoId) {
            var videos:Video[] = [];

            for (var i = 0; i < this.videos.length; i++) {
                if (this.videos[i].id == videoId) {
                    videos.push(service.videos[i]);
                }
            }

            return videos;
        }

        handleNetworkStatusChange() {
            //reset isConnected variable and check for change
            var statusChange;
            var lastIsConnected = isConnected;
            isConnected = null;
            statusChange = lastIsConnected != service.getIsConnected();

            app.queueEvent({ type: "networkStatusChanged", statusChange: statusChange });
        }

        static init(isFirstRun : boolean) {
            service = new KA.Data();

            //register for network change
            networkInfo.addEventListener("networkstatuschanged", service.handleNetworkStatusChange);

            return new WinJS.Promise(function (c, e) {
                //check if data exists
                app.local.exists(savedDateFileName).done(function (fileExists) {
                    // we want to start fresh if this is first run, even if the data file exists
                    if (fileExists && !isFirstRun) {
                        app.local.readText(savedDateFileName).done(function (text) {
                            //rehydrate data
                            var savedData = JSON.parse(text);
                            service.lastSyncETag = savedData.lastSyncETag;
                            var savedDate = new Date();
                            service.lastSyncDate = savedDate.setISO8601(savedData.lastSyncDate);
                            service.domains = savedData.domains;
                            service.videos = savedData.videos;

                            //check for new data if longer than newDataCheckDelay
                            var checkDate = new Date();
                            checkDate.setDate(checkDate.getDate() - KA.Settings.newDataCheckDelay);
                            if (service.lastSyncDate < checkDate) {
                                service.loadDataFromUrl(isFirstRun);
                            } else {
                                console.log('date check, skipped since not enough time has passed');
                            }

                            //return control back to page rendering
                            c()
                        });
                    } else {
                        //no file so use packaged data
                        var url = new Windows.Foundation.Uri("ms-appx:///data.json");
                        Windows.Storage.StorageFile.getFileFromApplicationUriAsync(url).then(function (file) {
                            Windows.Storage.FileIO.readTextAsync(file).then(function (text) {
                                //hydrate data
                                var savedData = JSON.parse(text);
                                service.lastSyncETag = savedData.lastSyncETag;
                                var savedDate = new Date();
                                service.lastSyncDate = savedDate.setISO8601(savedData.lastSyncDate);
                                service.domains = savedData.domains;
                                service.videos = savedData.videos;

                                c();

                            }, function (err) {
                                KA.logError(err);
                                if (e) {
                                    e();
                                }
                            });
                        });

                        //queue up data refresh
                        service.loadDataFromUrl(isFirstRun).done();
                    }
                });
            });
        }

        static getIsConnected() {
            return service.getIsConnected();
        }

        static getVideo(videoId) {
            return service.getVideo(videoId);
        }

        static save() {
            return service.save();
        }

        static searchVideos(query) {
            return service.searchVideos(query);
        }

        static getSubject(subjectId) {
            return service.getSubject(subjectId);
        }

        static getSubjectByTitle(subjectTitle) {
            return service.getSubjectByTitle(subjectTitle);
        }

        static getTopic(subjectId, topicId) {
            return service.getTopic(subjectId, topicId);
        }

        static getVideoInTutorial(tutorialId, videoId) {
            return service.getVideoInTutorial(tutorialId, videoId);
        }

        static getVideoInTopic(topicId, videoId) {
            return service.getVideoInTopic(topicId, videoId);
        }

        static getVideoInSubject(subjectId, videoId) {
            return service.getVideoInSubject(subjectId, videoId);
        }

        static getTutorial(subjectId, topicId, tutorialId) {
            return service.getTutorial(subjectId, topicId, tutorialId);
        }

        static get domains() {
            return service.domains;
        }

        loadDataFromUrl(isFirstRun: boolean) {
            return new WinJS.Promise((c, e) => {
                if (!KA.Settings.isInDesigner) {
                    WinJS.Application.queueEvent({ type: "newDataCheckRequested" });

                    WinJS.xhr({ url: topicUrl }).done(result => {
                        if (result.status === 200) {
                            var eTag = result.getResponseHeader('ETag');

                            //have we synced before and is the eTag different?
                            if (isFirstRun || !service.lastSyncETag || (eTag != service.lastSyncETag)) {
                                service.lastSyncETag = eTag;
                                service.lastSyncDate = new Date();
                                var newData = JSON.parse(result.responseText);
                                service.domains = [];
                                service.videos = [];
                                service.parseTopicTree(newData).done(function () {
                                    //raise event when completed
                                    WinJS.Application.queueEvent({ type: "newDataCheckCompleted", newDataAvailable: true });
                                });
                            } else {
                                //no new data
                                WinJS.Application.queueEvent({ type: "newDataCheckCompleted", newDataAvailable: false });
                            }
                        } else {
                            //download did not complete
                            WinJS.Application.queueEvent({ type: "newDataCheckCompleted", newDataAvailable: false });
                        }
                    }, function (err) {
                        KA.logError(err);
                        if (e) {
                            e();
                        }
                    });

                    //run complete function so UI can continue while waiting
                    if (c) {
                        c();
                    }
                }
            });
        }

        parseTopicTree(parsedObject) {
            return new WinJS.Promise((c, e) => {
                var obj, obj2, obj3, obj4;
                var domain: Domain, subject: Subject, topic: Topic, tutorial: Tutorial;

                //domains
                for (var i = 0; i < parsedObject.children.length; i++) {
                    obj = parsedObject.children[i];

                    //skip domains which are not in the list of domains shown in the app
                    if (this.allowedDomains.indexOf(obj.id) > -1) {
                        domain = {
                            type: KA.ObjectType.domain,
                            id: obj.id,
                            title: obj.title,
                            children: []
                        };

                        //check for subjects or just videos, example News and Noteworthy
                        if (obj.children && obj.children.length > 0 && obj.children[0].kind == 'Video') {
                            //videos only
                            for (var j = 0; j < obj.children.length; j++) {
                                if (obj.children[j].kind == 'Video') {
                                    domain.children.push(service.parseVideo(obj.children[j], domain.id != Data.newAndNoteworthyId, domain.id));
                                }
                            }
                        } else {
                            //subjects
                            for (var j = 0; j < obj.children.length; j++) {
                                obj2 = obj.children[j];
                                subject = {
                                    type: KA.ObjectType.subject,
                                    id: obj2.id,
                                    description: obj2.description,
                                    title: obj2.title,
                                    kaUrl: obj2.ka_url,
                                    children: [],
                                };

                                if (!obj2.title) {
                                    subject.title = obj2.standalone_title;
                                }

                                //check for topics or just videos, example Science & Economics > Computer Science
                                if (obj2.children && obj2.children.length > 0 && obj2.children[0].kind == 'Video') {
                                    //videos only
                                    for (var k = 0; k < obj2.children.length; k++) {
                                        if (obj2.children[k].kind == 'Video') {
                                            subject.children.push(service.parseVideo(obj2.children[k], true, domain.id, subject.id));
                                        }
                                    }
                                } else {
                                    //topics
                                    for (var k = 0; k < obj2.children.length; k++) {
                                        obj3 = obj2.children[k];

                                        if (obj3.render_type != 'ExerciseOnlyTutorial' && obj3.kind != 'Exercise') {
                                            topic = {
                                                type: KA.ObjectType.topic,
                                                id: obj3.id,
                                                description: obj3.description,
                                                title: obj3.title,
                                                kaUrl: obj3.ka_url,
                                                children: [],
                                            };

                                            if (!obj3.title) {
                                                topic.title = obj3.standalone_title;
                                            }

                                            //check for tutorials or just videos, example Math > Geometry > Quadrilaterals
                                            if (obj3.children && obj3.children.length > 0 && obj3.children[0].kind == 'Video') {
                                                //videos only
                                                for (var m = 0; m < obj3.children.length; m++) {
                                                    if (obj3.children[m].kind == 'Video') {
                                                        topic.children.push(service.parseVideo(obj3.children[m], true, domain.id, subject.id, topic.id));
                                                    }
                                                }
                                            } else {
                                                //tutorials
                                                for (var m = 0; m < obj3.children.length; m++) {
                                                    obj4 = obj3.children[m];
                                                    if (obj4.render_type == 'Tutorial') {
                                                        tutorial = {
                                                            type: KA.ObjectType.tutorial,
                                                            id: obj4.id,
                                                            domainId: domain.id,
                                                            description: obj4.description,
                                                            title: obj4.standalone_title,
                                                            kaUrl: obj4.ka_url,
                                                            children: [],
                                                        };

                                                        //videos
                                                        for (var n = 0; n < obj4.children.length; n++) {
                                                            if (obj4.children[n].kind == 'Video') {
                                                                tutorial.children.push(service.parseVideo(obj4.children[n], true, domain.id, subject.id, topic.id, tutorial.id));
                                                            }
                                                        }
                                                        topic.children.push(tutorial);
                                                    }
                                                }
                                            }
                                        }
                                        subject.children.push(topic);
                                    }
                                }
                                domain.children.push(subject);
                            }
                        }
                        service.domains.push(domain);
                    }
                }

                c();
            });
        }

        parseVideo(sourceObj, saveToVideoList: boolean, domainId: string, subjectId?: string, topicId?: string, tutorialId?: string): VideoInfo {
            var vidInfo: VideoInfo = null;

            if (sourceObj != null) {
                var imgUrl = 'http://i.ytimg.com/vi/' + sourceObj.youtube_id + '/0.jpg';
                vidInfo = { id: sourceObj.id, title: sourceObj.title, type: KA.ObjectType.video, imgUrl: imgUrl };

                if (saveToVideoList) {
                    var video: Video = {
                        id: sourceObj.id,
                        description: sourceObj.description,
                        title: sourceObj.title,
                        kaUrl: sourceObj.ka_url,
                        dateAdded: sourceObj.date_added,
                        youTubeId: sourceObj.youtube_id,
                        imgUrl: imgUrl
                    }

                    if (sourceObj.download_urls) {
                        video.vidUrl = sourceObj.download_urls.mp4;
                        video.imgHiUrl = sourceObj.download_urls.png;
                    } else {
                        video.vidUrl = null;
                        video.imgHiUrl = null;
                    }

                    //track hierarchy
                    video.parents = [];
                    if (domainId) {
                        video.parents.push(domainId);
                    }
                    if (subjectId) {
                        video.parents.push(subjectId);
                    }
                    if (topicId) {
                        video.parents.push(topicId);
                    }
                    if (tutorialId) {
                        video.parents.push(tutorialId);
                    }

                    service.videos.push(video);
                }
            } else {
                console.log('parseVideo: sourceObj equal to null');
            }

            return vidInfo;
        }

        save() {
            return new WinJS.Promise(function (c, e) {
                //save data
                if (service.domains && service.domains.length > 0) {
                    var content = JSON.stringify({ lastSyncETag: service.lastSyncETag, lastSyncDate: service.lastSyncDate, domains: service.domains, videos: service.videos });
                    WinJS.Application.local.writeText(savedDateFileName, content).done(c, e);
                } else {
                    c();
                }
            });
        }

        searchVideos(searchTerm) {
            var results: Video[] = [], title, videoFound;

            for (var i = 0; i < service.videos.length; i++) {
                title = service.videos[i].title.toLowerCase()
                if (title.indexOf(searchTerm) > -1) {
                    videoFound = false;

                    for (var j = 0; j < results.length; j++) {
                        if (results[j].id == service.videos[i].id) {
                            videoFound = true;
                            break;
                        }
                    }

                    if (!videoFound) {
                        results.push(service.videos[i]);
                    }
                }
            }

            return results;
        }

        updateIsConnected(): boolean {
            var cx = Windows.Networking.Connectivity.NetworkInformation.getInternetConnectionProfile();
            if (!cx || !('getNetworkConnectivityLevel' in cx) || cx.getNetworkConnectivityLevel() < 3) {
                return false;
            } else {
                return true;
            }
        }
    }
}