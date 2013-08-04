/// <reference path="models.ts" />
/// <reference path="../settings.ts" />
/// <reference path="../../scripts/typings/winrt.d.ts" />
/// <reference path="../../scripts/typings/winjs.d.ts" />
module KA {
    'use strict';

    var service: User;
    var authWeb = Windows.Security.Authentication.Web;
    var savedDateFileName = 'user.json';
    var baseUrl = 'http://khanacademy-us.cloudapp.net:50025/api/';
    var userInfo;

    export class User {
        authToken: KA.AuthToken = null;
        playbackList: KA.ResumeInfo[] = null;

        getAppCallBackUrl() {
            return authWeb.WebAuthenticationBroker.getCurrentApplicationCallbackUri().absoluteUri;
        }

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

                //ensure token is valid
                if (service.authToken && service.authToken.key && service.authToken.secret) {
                    var userUrl = baseUrl + 'user?key=' + service.authToken.key + '&secret=' + service.authToken.secret;
                    var userResponse = service.sendRequest(userUrl);

                    if (userResponse) {
                        var ur = JSON.parse(userResponse);
                        userInfo = {};
                        userInfo.id = ur.UserId;
                        userInfo.nickName = ur.NickName;
                        userInfo.points = ur.Points;
                        userInfo.joined = new Date(parseInt(ur.Joined.substr(6, ur.Joined.length - 8)))
                        WinJS.Application.queueEvent({ type: "userInfoUpdated", userInfo: userInfo });
                        c();
                    } else {
                        c();
                        WinJS.Application.queueEvent({ type: "userInfoUpdated" });
                    }
                } else {
                    c();
                    WinJS.Application.queueEvent({ type: "userInfoUpdated" });
                }
            });
        }

        static init() {
            service = new User();

            service.authToken = null;
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
                                service.authToken = savedData.authToken;
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

        logIn() {
            var logInUrl = baseUrl + 'user/signinurl?callback=' + service.getAppCallBackUrl();

            var response = service.sendRequest(logInUrl);

            if (response) {
                var startURI = new Windows.Foundation.Uri(JSON.parse(response));

                WinJS.Application.queueEvent({ type: "userInfoRequested", userInfo: userInfo });

                authWeb.WebAuthenticationBroker.authenticateAsync(
                    authWeb.WebAuthenticationOptions.none, startURI)
                    .done(function (result) {
                        if (result.responseStatus === authWeb.WebAuthenticationStatus.success) {
                            //parse url
                            var token: any = {};
                            var verifier = null;

                            var returnUri = new Windows.Foundation.Uri(result.responseData);
                            token.key = service.getParameterByName(returnUri.query, 'oauth_token');
                            token.secret = service.getParameterByName(returnUri.query, 'oauth_token_secret');
                            verifier = service.getParameterByName(returnUri.query, 'oauth_verifier');

                            if (token.key != null && token.secret != null && verifier != null) {
                                var tokenUrl = baseUrl + 'user/acesstoken?key=' + token.key + '&secret=' + token.secret + '&callback=' + service.getAppCallBackUrl() + '&verifier=' + verifier;
                                var tokenResponse = service.sendRequest(tokenUrl);

                                if (tokenResponse) {
                                    var t = JSON.parse(tokenResponse);
                                    service.authToken = {};
                                    service.authToken.key = t.Key;
                                    service.authToken.secret = t.Secret;
                                    service.save();
                                    service.fetchUserInfo();
                                } else {
                                    WinJS.Application.queueEvent({ type: "userInfoUpdated" });
                                }
                            }

                        } else {
                            //login error or cancelled
                            WinJS.Application.queueEvent({ type: "userInfoUpdated" });
                        }
                    }, function (err) {
                        WinJS.Application.queueEvent({ type: "userInfoUpdated" });
                    });
            } else {
                WinJS.Application.queueEvent({ type: "userInfoUpdated" });
            }
        }

        logOut() {
            //clear values
            userInfo = null;
            service.authToken = {};
            service.save();
            WinJS.Application.queueEvent({ type: "userInfoUpdated" });
        }

        save() {
            return new WinJS.Promise(function (c, e) {
                //save data
                var content = JSON.stringify({ authToken: service.authToken, playbackList: service.playbackList });
                var roaming: any = WinJS.Application.roaming;
                roaming.writeText(savedDateFileName, content).done(c, e);
            });
        }

        sendRequest(url) {
            var base64str = 'dgAxAC4AMgA7ADAAMwAwADAARAAwADEANQAwADMAMAAwAEUAMgAyADAAMAAzADAAMAAyAEEANQA4ADAAMwAwADAARQA0ADgAOAAwADMAMAAwADMAMgBCADgAMAA4ADAAMAAyADkAQwBGADAANQAwADAAMABBADIANQAwADUAMAAwADcANgBGAEYAMAA2ADAAMAAwADEAMAAwADAANAAwADAARQA0ADEANwAwADQAMAAwADIAMAAyADIAMAA0ADAAMABGAEMANQA0ADAANAAwADAAMABEADUARAAwADEAMAAwADEAOABEADQAMAAyADAAMABEADIANAAyADAAOQAwADAARAA2ADAAQgA7AFUAbgBrAG4AbwB3AG4AOwBVAG4AawBuAG8AdwBuADsAVwBpAG4AZABvAHcAcwA4AA==';

            try {
                var request = new XMLHttpRequest();
                request.open("GET", url, false);
                request.setRequestHeader("Accept", 'application/json');
                request.setRequestHeader("Authorization", base64str);
                request.send(null);
                if (request.status == 200) {
                    return request.responseText;
                } else {
                    return null;
                }
            } catch (err) {
                WinJS.log("Error sending request: " + err, "Web Authentication SDK Sample", "error");
            }
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