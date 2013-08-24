/// <reference path="models.ts" />
/// <reference path="../settings.ts" />
/// <reference path="../../scripts/typings/winrt.d.ts" />
/// <reference path="../../scripts/typings/winjs.d.ts" />
module KA {
    'use strict';

    var service: User;
    var authWeb = Windows.Security.Authentication.Web;
    var savedDateFileName = "user.json";
    var userInfo;

    export class User {

        playbackList: KA.ResumeInfo[] = null;

        getParameterByName(queryString, name) {
            name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
            var regexS = "[\\?&]" + name + "=([^&#]*)";
            var regex = new RegExp(regexS);
            var results = regex.exec(queryString);
            if (results == null)
                return "";
            else
                return decodeURIComponent(results[1].replace(/\+/g, " "));
        }

        getUserInfo() {
            return userInfo;
        }

        fetchUserInfo() {
            return new WinJS.Promise(function (c, e) {
                var userResponse = KAAPI.GET(KAAPI.userURL);
                if (userResponse) {
                    var ur = JSON.parse(userResponse);
                    userInfo = {};
                    userInfo.id = ur.user_id;
                    userInfo.nickName = ur.nickname;
                    userInfo.points = ur.points;
                    userInfo.joined = new Date(ur.joined);
                    WinJS.Application.queueEvent({ type: "userInfoUpdated", userInfo: userInfo });
                    c();
                } else {
                    c();
                    WinJS.Application.queueEvent({ type: "userInfoUpdated" });
                }
            });
        }

        static init() {
            service = new User();
            service.playbackList = [];
            return new WinJS.Promise(function (c, e) {
                //check if data exists
                var app: any = WinJS.Application;
                app.roaming.exists(savedDateFileName).done(function (fileExists) {
                    if (fileExists) {
                        app.roaming.readText(savedDateFileName).done(function (text) {
                            if (text) {
                                //rehydrate data
                                var savedData = JSON.parse(text);
                                KAAPI.authToken = savedData.authToken;
                                if (savedData.playbackList) {
                                    service.playbackList = savedData.playbackList;
                                }

                                service.fetchUserInfo();
                            }
                            c()
                        });
                    } else {
                        c();
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

        isVideoPlaybackTracked(videoId) {
            if (userInfo && userInfo.id) {
                var foundVideoIdx = -1;

                for (var i = 0; i < service.playbackList.length; i++) {
                    if (service.playbackList[i].videoId == videoId && service.playbackList[i].userId == userInfo.id) {
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

        // Obtains a request token and calls callback
        getRequestToken(callback) {
            var requestparams = {
                consumerKey: KAAPI.consumerKey,
                consumerSecret: KAAPI.consumerSecret,
                method: "GET",
                url: KAAPI.requestTokenURL,
                view: "mobile",
                oauthCallback: OAuth.getAppCallBackUrl()
            };

            var params = OAuth.getOAuthRequestParams(requestparams);
            var startURI = new Windows.Foundation.Uri("https://www.khanacademy.org/api/auth/request_token?" + params);
            WinJS.Application.queueEvent({ type: "userInfoRequested", userInfo: userInfo });
            authWeb.WebAuthenticationBroker.
                authenticateAsync(authWeb.WebAuthenticationOptions.none, startURI).
                done(callback, function (err) {
                    WinJS.Application.queueEvent({ type: "userInfoUpdated" });
                });
        }

        logIn() {
            this.getRequestToken(function (result) {
                if (result.responseStatus === authWeb.WebAuthenticationStatus.success) {
                    var returnUri = new Windows.Foundation.Uri(result.responseData);
                    var requestToken = service.getParameterByName(returnUri.query, 'oauth_token');
                    var requestTokenSecret = service.getParameterByName(returnUri.query, 'oauth_token_secret');
                    var verifier = service.getParameterByName(returnUri.query, 'oauth_verifier');

                    if (requestToken != null && requestTokenSecret != null && verifier != null) {

                        var paramOverrides = {
                            oauthToken: requestToken,
                            oauthTokenSecret: requestTokenSecret,
                            oauthVerifier: verifier
                        };
                        var tokenResponse = KAAPI.makeAPICall(KAAPI.accessTokenURL, "GET", paramOverrides);
                        if (tokenResponse) {
                            tokenResponse = "?" + tokenResponse;
                            KAAPI.authToken = {};
                            KAAPI.authToken.key = service.getParameterByName(tokenResponse, "oauth_token");
                            KAAPI.authToken.secret = service.getParameterByName(tokenResponse, "oauth_token_secret");
                            service.save();
                            service.fetchUserInfo();
                        }
                    } else {
                        WinJS.Application.queueEvent({ type: "userInfoUpdated" });
                    }

                } else {
                        //login error or cancelled
                        WinJS.Application.queueEvent({ type: "userInfoUpdated" });
                }
            });
        }

        logOut() {
            //clear values
            userInfo = null;
            KAAPI.authToken = {};
            service.save();
            WinJS.Application.queueEvent({ type: "userInfoUpdated" });
        }

        save() {
            return new WinJS.Promise(function (c, e) {
                //save data
                var content = JSON.stringify({ authToken: KAAPI.authToken, playbackList: service.playbackList });
                var roaming: any = WinJS.Application.roaming;
                roaming.writeText(savedDateFileName, content).done(c, e);
            });
        }

        trackPlayback(videoId, currentTime) {
            if (userInfo && userInfo.id) {
                var foundVideoIdx = -1;

                for (var i = 0; i < service.playbackList.length; i++) {
                    if (service.playbackList[i].videoId == videoId && service.playbackList[i].userId == userInfo.id) {
                        foundVideoIdx = i;
                        break;
                    }
                }

                if (foundVideoIdx > -1) {
                    //edit item
                    service.playbackList[foundVideoIdx].currentTime = currentTime;
                } else {
                    //add item
                    service.playbackList.push({ userId: userInfo.id, videoId: videoId, currentTime: currentTime });
                }
            }
        }
    }
}