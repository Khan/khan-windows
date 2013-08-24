/// <reference path="../scripts/typings/winrt.d.ts" />

module KA {
    'use strict';
    export class KAAPI {
        static baseURL = "https://www.khanacademy.org/api/";
        static baseV1URL = KAAPI.baseURL + "v1/";
        static requestTokenURL = KAAPI.baseURL + "auth/request_token";
        static accessTokenURL = KAAPI.baseURL + "auth/access_token";
        static userURL = KAAPI.baseV1URL + "user";
        static consumerKey: string;
        static consumerSecret: string;
        static authToken: KA.AuthToken = null;

        static init() {
            var url = new Windows.Foundation.Uri("ms-appx:///secrets.json");
            Windows.Storage.StorageFile.getFileFromApplicationUriAsync(url).then(function (file) {
                Windows.Storage.FileIO.readTextAsync(file).then(function (text) {
                      var secrets = JSON.parse(text);
                      KAAPI.consumerKey = secrets.consumerKey;
                      KAAPI.consumerSecret = secrets.consumerSecret;
                });
            });
        }

        static GET(url: string): string {
          return KAAPI.makeAPICall(url, "GET");
        }

        static PUT(url: string): string {
          return KAAPI.makeAPICall(url, "PUT");
        }

        static DELETE(url: string): string {
          return KAAPI.makeAPICall(url, "DELETE");
        }

        static sendHTTPRequest(url: string, method: string): string {
            try {
                var request = new XMLHttpRequest();
                request.open(method, url, false);
                request.setRequestHeader("Accept", 'application/json');
                request.send(null);
                if (request.status == 200) {
                    return request.responseText;
                }
            } catch (ex) {
                WinJS.log && WinJS.log(ex, "Khan Academy", "error");
            }
            return null;
        }

        static makeAPICall(url:string, method: string, paramOverrides?): string {
            if (paramOverrides === undefined)
                paramOverrides = {};

            var requestParams = {
                consumerKey: KAAPI.consumerKey,
                consumerSecret: KAAPI.consumerSecret,
                method: method,
                url: url,
                oauthToken: KAAPI.authToken.key,
                oauthTokenSecret: KAAPI.authToken.secret
            };

            for(var prop in paramOverrides){
                requestParams[prop] = paramOverrides[prop];
            }

            if (!requestParams.oauthToken || !requestParams.oauthTokenSecret)
                return null;

            var params = OAuth.getOAuthRequestParams(requestParams);
            var userUrl = url + '?' + params;
            return KAAPI.sendHTTPRequest(userUrl, method);
      }
    }
}