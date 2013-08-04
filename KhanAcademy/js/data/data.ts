/// <reference path="//Microsoft.WinJS.1.0/js/base.js" />
/// <reference path="//Microsoft.WinJS.1.0/js/ui.js" />
/// <reference path="/js/base.js" />
/// <reference path="/js/settings.js" />

(function () {
    'use strict';
    var app = WinJS.Application;
    var networkInfo = Windows.Networking.Connectivity.NetworkInformation;

    var service;
    var topicUrl = 'http://www.khanacademy.org/api/v1/topictree';
    var savedDateFileName = 'data.json';
    var isConnected = null;

    WinJS.Namespace.define("KA.Data", {
        newAndNoteworthyId: 'x29232c6b',
        coachResId: 'x6a4a5e33',
        partnerContentId:'x54390c7e',
        domains: null,
        videos: null,
        lastSyncETag: null,
        lastSyncDate: null,

        getIsConnected: function(){
            if(isConnected == null){
                isConnected = service.updateIsConnected();
            }
            return isConnected;
            //return false;
        },

        getSubject: function (subjectId) {
            var result;

            for (var i = 0; i < this.domains.length; i++) {
                //does the domain have children that are subjects
                if (this.domains[i].children && this.domains[i].children.length > 0 && this.domains[i].children[0].type == KA.ObjectType.subject) {
                    for (var j = 0; j < this.domains[i].children.length; j++) {
                        if (this.domains[i].children[j].id == subjectId) {
                            result = this.domains[i].children[j];
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
        },

        getSubjectByTitle: function (subjectTitle) {
            var result;

            for (var i = 0; i < this.domains.length; i++) {
                //does the domain have children that are subjects
                if (this.domains[i].children && this.domains[i].children.length > 0 && this.domains[i].children[0].type == KA.ObjectType.subject) {
                    for (var j = 0; j < this.domains[i].children.length; j++) {
                        if (this.domains[i].children[j].title == subjectTitle) {
                            result = this.domains[i].children[j];
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
        },

        getTopic: function (subjectId, topicId) {
            var sub = this.getSubject(subjectId);
            var top = null;

            if (sub != null) {
                for (var i = 0; i < sub.children.length; i++) {
                    if (sub.children[i].id == topicId) {
                        top = sub.children[i];
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
        },

        getTutorial: function (subjectId, topicId, tutorialId) {
            var top = this.getTopic(subjectId, topicId);
            var tut = null;

            if (top != null) {
                for (var i = 0; i < top.children.length; i++) {
                    if (top.children[i].id == tutorialId) {
                        tut = top.children[i];
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
        },

        getVideo: function (videoId) {
            var vid = null;

            for (var i = 0; i < service.videos.length; i++) {
                if (service.videos[i].id == videoId) {
                    vid = service.videos[i];
                    break;
                }
            }

            return vid;
        },

        getVideoInSubject: function (subjectId, videoId) {
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
        },

        getVideoInTopic: function (topicId, videoId) {
            var vid = this.getVideo(videoId);

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
        },

        getVideoInTutorial: function (tutorialId, videoId) {
            var vid = this.getVideo(videoId);

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
        },

        getVideoList: function (videoId) {
            var videos = [];

            for (var i = 0; i < service.videos.length; i++) {
                if (service.videos[i].id == videoId) {
                    videos.push(service.videos[i]);
                }
            }

            return videos;
        },

        handleNetworkStatusChange: function () {
            //reset isConnected variable and check for change
            var statusChange;            
            var lastIsConnected = isConnected;
            isConnected = null;
            statusChange = lastIsConnected != service.getIsConnected();

            app.queueEvent({ type: "networkStatusChanged", statusChange: statusChange });
        },

        init: function () {
            service = this;

            //register for network change
            networkInfo.addEventListener("networkstatuschanged", service.handleNetworkStatusChange);

            return new WinJS.Promise(function (c, e) {
                //check if data exists
                app.local.exists(savedDateFileName).done(function (fileExists) {
                    if (fileExists) {
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
                                service.loadDataFromUrl();
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
                        service.loadDataFromUrl().done();
                    }
                });
            });
        },

        loadDataFromUrl: function () {
            return new WinJS.Promise(function (c, e) {
                if (!KA.Settings.isInDesigner) {
                    WinJS.Application.queueEvent({ type: "newDataCheckRequested" });

                    WinJS.xhr({ url: topicUrl }).done(function (result) {
                        if (result.status === 200) {
                            var eTag = result.getResponseHeader('ETag');

                            //have we synced before and is the eTag different?
                            if (!service.lastSyncETag || (eTag != service.lastSyncETag)) {
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
        },

        parseTopicTree: function (parsedObject) {
            return new WinJS.Promise(function (c, e) {
                var obj, obj2, obj3, obj4;
                var domain, subject, topic, tutorial;

                //domains
                for (var i = 0; i < parsedObject.children.length; i++) {
                    obj = parsedObject.children[i];

                    //skip coach resources and partner content
                    if (obj.id != service.coachResId && obj.id != service.partnerContentId) {
                        domain = {};
                        domain.type = KA.ObjectType.domain;
                        domain.id = obj.id;
                        domain.title = obj.title;
                        domain.children = [];

                        //check for subjects or just videos, example News and Noteworthy
                        if (obj.children && obj.children.length > 0 && obj.children[0].kind == 'Video') {
                            //videos only
                            for (var j = 0; j < obj.children.length; j++) {
                                if (obj.children[j].kind == 'Video') {
                                    domain.children.push(service.parseVideo(obj.children[j], domain.id != service.newAndNoteworthyId, domain.id));
                                }
                            }
                        } else {
                            //subjects
                            for (var j = 0; j < obj.children.length; j++) {
                                obj2 = obj.children[j];
                                subject = {};
                                subject.type = KA.ObjectType.subject;
                                subject.id = obj2.id;
                                subject.description = obj2.description;
                                subject.title = obj2.title;
                                if (!obj2.title) {
                                    subject.title = obj2.standalone_title;
                                }
                                subject.kaUrl = obj2.ka_url;
                                subject.children = [];

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
                                            topic = {};
                                            topic.type = KA.ObjectType.topic;
                                            topic.id = obj3.id;
                                            topic.description = obj3.description;
                                            topic.title = obj3.title;
                                            if (!obj3.title) {
                                                topic.title = obj3.standalone_title;
                                            }
                                            topic.kaUrl = obj3.ka_url;
                                            topic.children = [];

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
                                                        tutorial = {};
                                                        tutorial.type = KA.ObjectType.tutorial;
                                                        tutorial.id = obj4.id;
                                                        tutorial.domainId = domain.id;
                                                        tutorial.description = obj4.description;
                                                        tutorial.title = obj4.standalone_title;
                                                        tutorial.kaUrl = obj4.ka_url;
                                                        tutorial.children = [];

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
        },

        parseVideo: function (sourceObj, saveToVideoList, domainId, subjectId, topicId, tutorialId) {
            var vidInfo = null;            

            if (sourceObj != null) {
                var imgUrl = 'http://i.ytimg.com/vi/' + sourceObj.youtube_id + '/0.jpg';
                var vidInfo = { id: sourceObj.id, title: sourceObj.title, type: KA.ObjectType.video, imgUrl: imgUrl };

                if (saveToVideoList) {
                    var video = {};
                    video.id = sourceObj.id;
                    video.description = sourceObj.description;
                    video.title = sourceObj.title;
                    video.kaUrl = sourceObj.ka_url;
                    video.dateAdded = sourceObj.date_added;
                    video.youTubeId = sourceObj.youtube_id;

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

                    video.imgUrl = imgUrl;
                    service.videos.push(video);
                }
            } else {
                console.log('parseVideo: sourceObj equal to null');
            }

            return vidInfo;
        },

        save: function () {
            return new WinJS.Promise(function (c, e) {
                //save data
                if (service.domains && service.domains.length > 0) {
                    var content = JSON.stringify({ lastSyncETag: service.lastSyncETag, lastSyncDate: service.lastSyncDate, domains: service.domains, videos: service.videos });
                    WinJS.Application.local.writeText(savedDateFileName, content).done(c, e);
                } else {
                    c();
                }
            });
        },

        searchVideos: function (searchTerm) {
            var results = [], title, videoFound;

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
        },

        updateIsConnected: function () {
            var cx = new Windows.Networking.Connectivity.NetworkInformation.getInternetConnectionProfile();
            if ((!('getNetworkConnectivityLevel' in cx)) || ((cx.getNetworkConnectivityLevel()) < 3)) {
                return false;
            } else {
                return true;
            }
        }
    });
})();