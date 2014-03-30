module KA {
    'use strict';

    var service: User;
    var authWeb = Windows.Security.Authentication.Web;
    var savedDateFileName = "user.json";

    export class User {
        userInfo: KA.UserInfo;
        authToken: KA.AuthToken = null;
        playbackList: KA.ResumeInfo[] = null;
        watchedList: KA.WatchedInfo[] = null;

        fetchUserInfo() {
            return new WinJS.Promise(function (complete, error) {
                ApiClient.getUserInfoAsync().then(function (user) {
                    service.userInfo = user;
                    WinJS.Application.queueEvent({ type: "userInfoUpdated", userInfo: service.userInfo });
                    complete();
                }, function (err) {
                        WinJS.Application.queueEvent({ type: "userInfoUpdated", userInfo: service.userInfo });
                    });
            });
        }

        fetchUserVideos() {
            return new WinJS.Promise(function (complete, error) {
                ApiClient.getUserVideosAsync().done(function (result) {
                    service.watchedList = [];
                    if (result && result.userVideos) {
                        result.userVideos.forEach(function (v) {
                            if (v.completed && service.userInfo) {
                                service.watchedList.push({ userId: service.userInfo.id, videoId: v.video.id });
                            }
                        });
                    }
                    service.save();
                    WinJS.Application.queueEvent({ type: "userVideosFetched", watchedList: service.watchedList });
                    complete();
                }, function (err) {
                    WinJS.Application.queueEvent({ type: "userVideosFetched", watchedList: service.watchedList});
                    });
            });
        }

        refreshUserInfo() {
            WinJS.Application.queueEvent({ type: "userInfoRequested", userInfo: service.userInfo });
            this.fetchUserInfo();
            this.fetchUserVideos();
        }

        static init() {
            service = new User();
            service.playbackList = [];
            return new WinJS.Promise(function (complete, error) {
                //check if data exists
                var app: any = WinJS.Application;
                app.roaming.exists(savedDateFileName).done(function (fileExists) {
                    if (fileExists) {
                        app.roaming.readText(savedDateFileName).done(function (text) {
                            if (text) {
                                //rehydrate data
                                var savedData = JSON.parse(text);
                                service.authToken = savedData.authToken;
                                if (savedData.playbackList) {
                                    service.playbackList = savedData.playbackList;
                                }
                                if (service.authToken) {
                                    service.refreshUserInfo();
                                }
                                if (savedData.watchedList) {
                                    service.watchedList = savedData.watchedList;
                                }
                            }
                            complete()
                        });
                    } else {
                        complete();
                    }
                });
            });
        }

        static logIn() {
            service.logIn();
        }

        static logOut() {
            service.logOut();
        }

        static save() {
            return service.save();
        }

        static trackPlayback(videoId, currentTime) {
            service.trackPlayback(videoId, currentTime);
        }

        static isVideoPlaybackTracked(videoId) {
            return service.isVideoPlaybackTracked(videoId);
        }

        static isVideoWatched(videoId) {
            return service.isVideoWatched(videoId);
        }

        static Refresh() {
            service.refreshUserInfo();
        }

        static get AuthToken() {
            return service.authToken;
        }

        static get UserInfo() {
            return service.userInfo;
        }

        isVideoPlaybackTracked(videoId) {
            if (this.userInfo && this.userInfo.id) {
                var foundVideoIdx = -1;

                for (var i = 0; i < service.playbackList.length; i++) {
                    if (service.playbackList[i].videoId == videoId && service.playbackList[i].userId == this.userInfo.id) {
                        foundVideoIdx = i;
                        break;
                    }
                }

                if (foundVideoIdx > -1) {
                    return service.playbackList[foundVideoIdx];
                } else {
                    return null;
                }
            }
        }

        isVideoWatched(videoId) {
            if (!this.userInfo || !this.userInfo.id || !this.watchedList)
                return false;

            var found = service.watchedList.reduce(function (prevFound, watchedVideo) {
                return prevFound || watchedVideo.videoId == videoId &&
                    watchedVideo.userId == service.userInfo.id;
            }, false);
            return found;
        }

        logIn() {
            var requestparams = {
                consumerKey: ApiClient.OAuthKeys.key,
                consumerSecret: ApiClient.OAuthKeys.secret,
                method: "GET",
                url: Constants.URL_REQUEST_TOKEN,
                view: "mobile",
                oauthCallback: OAuth.getAppCallBackUrl()
            };

            var params = OAuth.getOAuthRequestParams(requestparams);
            var startUri = new Windows.Foundation.Uri(Constants.URL_REQUEST_TOKEN + "?" + params);

            WinJS.Application.queueEvent({ type: "userInfoRequested", userInfo: service.userInfo });

            authWeb.WebAuthenticationBroker.authenticateAsync(authWeb.WebAuthenticationOptions.none, startUri)
                .done(function (result) {
                    if (result.responseStatus === authWeb.WebAuthenticationStatus.success) {
                        var returnUri = new Windows.Foundation.Uri(result.responseData);

                        var accessToken = new KA.AuthToken(KA.getParameterByName(returnUri.query, 'oauth_token'),
                            KA.getParameterByName(returnUri.query, 'oauth_token_secret'));

                        var verifier = KA.getParameterByName(returnUri.query, 'oauth_verifier');

                        KA.ApiClient.getAccessTokenAsync(accessToken, verifier).done(function (token: AuthToken) {
                            service.authToken = token;
                            service.save();
                            service.fetchUserInfo();
                            service.fetchUserVideos();
                        });
                    } else {
                        //login error or cancelled
                        WinJS.Application.queueEvent({ type: "userInfoUpdated" });
                    }
                }, function (err) {
                    WinJS.Application.queueEvent({ type: "userInfoUpdated" });
                });
        }

        logOut() {
            //clear values
            this.userInfo = null;
            this.authToken = null;
            this.save();
            WinJS.Application.queueEvent({ type: "userInfoUpdated" });
        }

        save() {
            return new WinJS.Promise(function (c, e) {
                //save data
                var content = JSON.stringify({ authToken: service.authToken, playbackList: service.playbackList, watchedList: service.watchedList });
                var roaming: any = WinJS.Application.roaming;
                roaming.writeText(savedDateFileName, content).done(c, e);
            });
        }

        trackPlayback(videoId, currentTime) {
            if (this.userInfo && this.userInfo.id) {
                var foundVideoIdx = -1;

                for (var i = 0; i < service.playbackList.length; i++) {
                    if (service.playbackList[i].videoId == videoId && service.playbackList[i].userId == this.userInfo.id) {
                        foundVideoIdx = i;
                        break;
                    }
                }

                if (foundVideoIdx > -1) {
                    //edit item
                    service.playbackList[foundVideoIdx].currentTime = currentTime;
                } else {
                    //add item
                    service.playbackList.push({ userId: this.userInfo.id, videoId: videoId, currentTime: currentTime });
                }
            }
        }
    }
}