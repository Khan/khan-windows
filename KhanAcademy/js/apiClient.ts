module KA {
    'use strict';

    var service: ApiClient;

    export class ApiClient {
        oauthKeys: KA.AuthToken;

        static get OAuthKeys() {
            return service.oauthKeys;
        }

        static init() {
            service = new ApiClient();

            return new WinJS.Promise(function (complete, error) {
                var url = new Windows.Foundation.Uri("ms-appx:///secrets.json");

                Windows.Storage.StorageFile.getFileFromApplicationUriAsync(url).done(function (file) {
                    Windows.Storage.FileIO.readTextAsync(file).done(function (text) {
                        service.oauthKeys = <KA.AuthToken>JSON.parse(text);
                        complete();
                    }, function (err) { service.handleError(err, error) });
                }, function (err) { service.handleError(err, error) });
            });
        }

        // Submits request for topic tree and returns a Promise
        static getTopicTreeAsync(lastSyncETag: string) {
            return new WinJS.Promise(function (complete, error) {
                service.sendRequest(Constants.URL_TOPIC_TREE, Constants.HTTP_METHOD_HEAD)
                    .then(function (request) {
                        if (request.status === 200 && request.getResponseHeader('ETag') !== lastSyncETag) {
                            return service.sendRequest(Constants.URL_TOPIC_TREE);
                        }
                    }).done(function (request) {
                        if (request && request.status === 200) {
                            var topicTree = JSON.parse(request.responseText);
                            //send new data to completion for processing
                            complete({ topicTree: topicTree, eTag: request.getResponseHeader('ETag') });
                        } else {
                            //nothing to update, call completion with null value
                            complete();
                        }
                    }, function (err) { service.handleError(err, error) });
            });
        }

        // Submits request for user videos and returns a Promise
        static getUserVideosAsync() {
            return new WinJS.Promise(function (complete, error) {
                var url = service.getUrlWithAuthParams(Constants.URL_USER_VIDEOS, Constants.HTTP_METHOD_GET, User.AuthToken);
                service.sendRequest(url)
                    .done(function (request) {
                        if (request && request.status === 200) {
                            var userVideos = JSON.parse(request.responseText);
                            //send new data to completion for processing
                            complete({ userVideos: userVideos });
                        } else {
                            //nothing to update, call completion with null value
                            complete();
                        }
                    }, function (err) {
                        service.handleError(err, error)
                    });
            });
        }

        // Reports video progress for the specified youtube ID
        // yotubeID: The ID of the youtube video
        // secondsWatched: The incremental number of seconds that have passed where the user is watching the video
        //   since the last report.
        // lastSecondWatched: The last location in seconds of the video position
        static reportVideoProgressAsync(youtubeID: string, secondsWatched: number, lastSecondWatched: number) {
            return new WinJS.Promise(function (complete, error) {
                var extraParams = {
                    queryParams: {
                        seconds_watched: secondsWatched.toString(),
                        last_second_watched: lastSecondWatched.toString()
                    }
                };

                var url = service.getUrlWithAuthParams(Constants.URL_USER_VIDEO_LOG.replace("<youtubeid>", youtubeID),
                    Constants.HTTP_METHOD_POST, User.AuthToken, extraParams);
                service.sendRequest(url, Constants.HTTP_METHOD_POST, service.getFormData(extraParams))
                    .done(function (request) {
                        if (request && request.status === 200) {
                            var info = JSON.parse(request.responseText);
                            //send new data to completion for processing
                            complete({
                                completed: info.is_video_completed,
                                lastSecondWatched: info.last_second_watched,
                                pointsEarned: info.points_earned,
                                youtubeID: info.youtube_id
                            });
                        } else {
                            //nothing to update, call completion with null value
                            complete();
                        }
                    }, function (err) {
                        service.handleError(err, error)
                    });
            });
        }

        // Fetches access token for given oauth request token and verifier and returns a Promise
        static getAccessTokenAsync(token: KA.AuthToken, verifier: string) {
            return new WinJS.Promise(function (complete, error) {

                if (token && token.key && token.secret && verifier) {
                    var paramOverrides = {
                        oauthToken: token.key,
                        oauthTokenSecret: token.secret,
                        oauthVerifier: verifier
                    };

                    var url = service.getUrlWithAuthParams(Constants.URL_ACCESS_TOKEN, Constants.HTTP_METHOD_GET, token, paramOverrides);

                    if (url) {
                        service.sendRequest(url).done(function (request: XMLHttpRequest) {

                            if (request.status === 200) {
                                var response = "?" + request.responseText;
                                complete(new KA.AuthToken(KA.getParameterByName(response, "oauth_token"),
                                    KA.getParameterByName(response, "oauth_token_secret")));
                            }
                        }, function (err) { service.handleError(err, error) });
                    }
                }
            });
        }

        // Fetches logged in user's details from KA API and returns a Promise
        static getUserInfoAsync() {
            return new WinJS.Promise(function (complete, error) {

                var url = service.getUrlWithAuthParams(Constants.URL_USER, Constants.HTTP_METHOD_GET, User.AuthToken);

                if (url) {
                    service.sendRequest(url).done(function (request: XMLHttpRequest) {
                        if (request.status === 200) {
                            var ur = JSON.parse(request.responseText);
                            var userInfo = {
                                id: ur.user_id,
                                nickName: ur.nickname,
                                points: ur.points,
                                avatarUrl: ur.avatar_url,
                                profileRoot: ur.profile_root,
                                joined: new Date(ur.joined),
                            }
                            complete(userInfo);
                        } else {
                            complete(null);
                        }
                    }, function (err) { service.handleError(err, error) });
                }
            });
        }


        handleError(e, error) {
            KA.logError(e);
            if (error) {
                error();
            }
        }

        // Encapsulates WinJS.xhr, sends the requests and returns Promise
        sendRequest(url: string, httpMethod = Constants.HTTP_METHOD_GET, data = null) {
            return WinJS.xhr({
                type: httpMethod,
                url: url,
                data: data
            });
        }

        getFormData(values) : FormData {
            var formData = new FormData();
            for (var prop in values) {
                formData.append(prop, values[prop]);
            }
            return formData;
        }

        // Returns  API url with OAuth parameters appended in the query string
        getUrlWithAuthParams(url: string, method: string, token: AuthToken, paramOverrides?: {}): string {
            if (!service.oauthKeys || !service.oauthKeys.key || !service.oauthKeys.secret) {
                KA.logError("OAuth secrets are empty, all user API calls are going to fail. Make sure secrets.json file exists in project root and contains correct data.");
                return null;
            }

            if (!token || !token.key || !token.secret) {
                KA.logError("No auth token is passed to prepare authorization parameters for the user API call, call will fail.");
                return null;
            }

            paramOverrides = paramOverrides || {};

            var requestParams = {
                consumerKey: service.oauthKeys.key,
                consumerSecret: service.oauthKeys.secret,
                method: method,
                url: url,
                oauthToken: token.key,
                oauthTokenSecret: token.secret
            };

            for (var prop in paramOverrides) {
                requestParams[prop] = paramOverrides[prop];
            }

            return url + '?' + OAuth.getOAuthRequestParams(requestParams);
        }
    }
}