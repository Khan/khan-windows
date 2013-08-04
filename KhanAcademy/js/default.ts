/// <reference path="navigator.ts" />
/// <reference path="data/user.ts" />
/// <reference path="base.ts" />
/// <reference path="../scripts/typings/winrt.d.ts" />
/// <reference path="../scripts/typings/winjs.d.ts" />

(function () {
    "use strict";

    WinJS.Binding.optimizeBindingReferences = true;
    WinJS.strictProcessing();

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;
    var nav = WinJS.Navigation;

    app.onactivated = function (args:any) {
        if (args.detail.kind === Windows.ApplicationModel.Activation.ActivationKind.launch) {
            args.setPromise(WinJS.UI.processAll().then(function () {
                KA.Global.init().done(function () {
                    //initial offline check
                    KA.Global.showNetworkStatus();

                    if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
                        if (nav.location) {
                            nav.history.current.initialPlaceholder = true;
                            return nav.navigate(nav.location, nav.state);
                        } else {
                            return nav.navigate(KA.navigator.home);
                        }
                    } else {
                        return nav.navigate(KA.navigator.home);
                    }
                }, function () {
                    KA.logError('error during init');
                });
            }));
        } else if (args.detail.kind === Windows.ApplicationModel.Activation.ActivationKind.search) {
            args.setPromise(WinJS.UI.processAll().then(function () {
                KA.Global.init().done(function () {
                    //initial offline check
                    KA.Global.showNetworkStatus();

                    if (args.detail.queryText && args.detail.queryText != "") {
                        return nav.navigate("/pages/searchResults/searchResults.html", { searchDetails: args.detail.queryText });
                    } else {
                        return nav.navigate(KA.navigator.home);                    
                    }                
                });
            }));
        }
    };

    Windows.ApplicationModel.Search.SearchPane.getForCurrentView().onquerysubmitted = function (args) {
        WinJS.Navigation.navigate("/pages/searchResults/searchResults.html", { searchDetails: args.queryText });
    };

    app.oncheckpoint = function (args: any) {
        var shutdownPromises = [];

        //var pageControl = KA.id('contenthost').winControl.pageControl;
        //save page if needed
        //if (WinJS.Navigation.history.current.location == "/pages/.../.html") {
        //    if (pageControl.save) {
        //        shutdownPromises.push(pageControl.save());
        //    }
        //}

        shutdownPromises.push(KA.User.save());
        shutdownPromises.push(KA.Data.save());
        shutdownPromises.push(KA.Downloads.save());
        args.setPromise(WinJS.Promise.join(shutdownPromises));
    };

    app.start();
})();
