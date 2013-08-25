// Parts of the implementation of the functions below were taken and modified from:
// Source: http://code.msdn.microsoft.com/windowsapps/WinJS-OAuth-for-Twitter-6fb22e37

module KA {
    "use strict";
    export class OAuth {

        // Obtains an OAuth request parameter string
        static getOAuthRequestParams(requestParams) {
            var sigParams = {
                oauth_callback: !requestParams.oauthTokenSecret ? encodeURIComponent(requestParams.oauthCallback) : "",
                oauth_consumer_key: requestParams.consumerKey,
                oauth_nonce: Math.floor(Math.random() * 1000000000),
                oauth_signature_method: "HMAC-SHA1",
                oauth_timestamp: Math.round(new Date().getTime() / 1000.0),
                oauth_token: requestParams.oauthToken || "",
                oauth_verifier: requestParams.oauthVerifier || "",
                oauth_version: "1.0",
                view: requestParams.view || "",
            };

            //We need to combine the oauth params with any query params
            if (requestParams.queryParams) {
                for (var queryParamsKey in requestParams.queryParams) {
                    if (requestParams.queryParams.hasOwnProperty(queryParamsKey)) {
                        sigParams[queryParamsKey] = requestParams.queryParams[queryParamsKey];
                    }
                }
            }

            // Compute base signature string and sign it.
            // This is a common operation that is required for all requests even after the token is obtained.
            // Parameters need to be sorted in alphabetical order
            // Keys and values should be URL Encoded.
            var sigBaseStringParams = "";
            var sortedKeys = this.getSortedKeys(sigParams);
            for (var i = 0; i < sortedKeys.length; i++) {
                var k = sortedKeys[i];
                var kv = sigParams[sortedKeys[i]];
                if (kv && kv !== "") {
                    if (sigBaseStringParams !== "") {
                        sigBaseStringParams += "&";
                    }
                    sigBaseStringParams += k + "=" + kv;
                }
            }

            var sigBaseString = requestParams.method + "&" + encodeURIComponent(requestParams.url) + "&" + encodeURIComponent(sigBaseStringParams);

            var keyText = encodeURIComponent(requestParams.consumerSecret) + "&";
            if (requestParams.oauthTokenSecret) {
                keyText += encodeURIComponent(requestParams.oauthTokenSecret);
            }

            var signature = this.generateHmacSha1Signature(sigBaseString, keyText);
            return sigBaseStringParams + "&oauth_signature=" + encodeURIComponent(signature);
        }

        //Generate an OAuth 1.0a HMAC-SHA1 signature for an HTTP request
        // Copied from the MSDN sample: WinJS OAuth for Twitter
        // Source: http://code.msdn.microsoft.com/windowsapps/WinJS-OAuth-for-Twitter-6fb22e37
        static generateHmacSha1Signature(sigBaseString, keyText) {
            var keyMaterial = Windows.Security.Cryptography.CryptographicBuffer.convertStringToBinary(keyText, Windows.Security.Cryptography.BinaryStringEncoding.utf8);
            var macAlgorithmProvider = Windows.Security.Cryptography.Core.MacAlgorithmProvider.openAlgorithm("HMAC_SHA1");
            var key = macAlgorithmProvider.createKey(keyMaterial);
            var tbs = Windows.Security.Cryptography.CryptographicBuffer.convertStringToBinary(sigBaseString, Windows.Security.Cryptography.BinaryStringEncoding.utf8);
            var signatureBuffer = Windows.Security.Cryptography.Core.CryptographicEngine.sign(key, tbs);
            var signature = Windows.Security.Cryptography.CryptographicBuffer.encodeToBase64String(signatureBuffer);
            return signature;
        }

        // Returns an array of sorted keys from the passed in object
        static getSortedKeys(obj) {
            var key,
                keys = [];

            for (key in obj) {
                if (obj.hasOwnProperty(key)) {
                    keys[keys.length] = key;
                }
            }

            return keys.sort();
        }

        static getAppCallBackUrl() {
            return Windows.Security.Authentication.Web.
                   WebAuthenticationBroker.getCurrentApplicationCallbackUri().absoluteUri;
        }
    }
}