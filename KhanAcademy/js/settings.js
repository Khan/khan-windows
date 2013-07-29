/// <reference path="//Microsoft.WinJS.1.0/js/base.js" />
/// <reference path="//Microsoft.WinJS.1.0/js/ui.js" />
/// <reference path="/js/base.js" />

(function () {
    'use strict';

    WinJS.Namespace.define("KA.Settings", {
        isInDesigner: Windows.ApplicationModel.DesignMode.designModeEnabled,
        newDataCheckDelay: 3,
        registrationLink: 'http://www.khanacademy.org/signup'
    });
})();