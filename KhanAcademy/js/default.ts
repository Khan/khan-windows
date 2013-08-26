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

                    if (args.detail.previousExecutionState == activation.ApplicationExecutionState.terminated) {
                        if (app.sessionState.history) {
                            // Restore the existing history saved on checkpoint
                            nav.history = app.sessionState.history;

                            // Don't add the page we're about to navigate to into history
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

        // Session data
        shutdownPromises.push(KA.navigator.save());

        // Persistent data
        shutdownPromises.push(KA.User.save());
        shutdownPromises.push(KA.Data.save());
        shutdownPromises.push(KA.Downloads.save());
        args.setPromise(WinJS.Promise.join(shutdownPromises));
    };

    app.start();
})();
