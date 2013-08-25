module KA.Constants {
    'use strict';

    export var SETTINGS_APP_VERSION = 'AppVersion';

    export var URL_BASE = "https://www.khanacademy.org/";
    export var URL_API_BASE = URL_BASE + "api/";
    export var URL_REQUEST_TOKEN = URL_API_BASE + "auth/request_token";
    export var URL_ACCESS_TOKEN = URL_API_BASE + "auth/access_token";
    export var URL_TOPIC_TREE = URL_API_BASE + "v1/topictree";
    export var URL_USER = URL_API_BASE + "v1/user";
    export var URL_REGISTRATION = URL_BASE + "signup";

    export var HTTP_METHOD_GET = "GET";
    export var HTTP_METHOD_POST = "POST";
    export var HTTP_METHOD_PUT = "PUT";

    export var RESPONSE_TYPE_TEXT = "text";
    export var RESPONSE_TYPE_JSON = "json";
}