module KA {
    'use strict';

    var service: Global, loggedIn;
    var userMenuClickEater, userMenu, isUserMenuOpen;
    var userNameDiv, loginOptionsDiv, loginDiv, registerDiv;

    export class Global {
        // property to track if the app is running for the first time for current version. 
        // this is used for cleaning/upgrading data from old versions and showing user what's new in the new version
        public IsFirstRun: boolean;

        constructor() {
            var localSettings = Windows.Storage.ApplicationData.current.localSettings,
                version = Windows.ApplicationModel.Package.current.id.version;

            var appVersion = version.major + "." + version.minor + "." + version.build + "." + version.revision;

            var lastAppVersion = localSettings.values[Constants.SETTINGS_APP_VERSION];

            this.IsFirstRun = !lastAppVersion || lastAppVersion != appVersion;

            // set the version if it's first run. this value will be persisted and for next run, app would know it's not first run
            if (this.IsFirstRun) {
                localSettings.values[Constants.SETTINGS_APP_VERSION] = appVersion;
            }
        }

        handleLogOutBtnClick(e) {
            KA.User.logOut();
            loggedIn = false;
            service.hideUserMenu();
            KA.hide(userNameDiv);
            KA.show(loginDiv);
        }

        handleNetworkStatusChanged(e) {
            if (e.statusChange) {
                service.showNetworkStatus();

                // If user is signed in and connectivity just got restored, refresh user data
                if (KA.Data.getIsConnected() && User.AuthToken && User.AuthToken.key && !User.UserInfo) {
                    User.Refresh();
                }
            }
        }

        handleUserInfoRequested() {
            KA.show(KA.id('userProgress'));
        }

        handleUserInfoUpdated(e) {
            if (e.userInfo) {
                loggedIn = true;
                userNameDiv.innerHTML = e.userInfo.nickName;
                KA.show(userNameDiv);
                KA.hide(loginOptionsDiv);

                if (e.userInfo.points > 0) {
                    var decimalFormat = new Windows.Globalization.NumberFormatting.DecimalFormatter();
                    decimalFormat.isGrouped = true;
                    decimalFormat.fractionDigits = 0;
                    KA.id('userPtsDiv').innerHTML = decimalFormat.format(e.userInfo.points) + ' <span>points</span>';
                } else {
                    KA.id('userPtsDiv').innerHTML = '0 <span>points</span>';
                }

            } else {
                loggedIn = false;
                KA.hide(userNameDiv);
                KA.show(loginOptionsDiv);
            }
            KA.hide(KA.id('userProgress'));
        }

        handleUsernameDivClick(e) {
            if (isUserMenuOpen) {
                service.hideUserMenu();
            } else {
                userMenuClickEater.style.visibility = 'visible';
                userMenu.style.visibility = 'visible';
                WinJS.UI.Animation.enterContent(userMenu, { top: "12px", left: "0px", rtlflip: false }).done(function () {
                    isUserMenuOpen = true;
                });
            }
        }

        hideUserMenu() {
            WinJS.UI.Animation.exitContent(userMenu, { top: "12px", left: "0px", rtlflip: false }).done(function () {
                userMenuClickEater.style.visibility = 'collapse';
                userMenu.style.visibility = 'collapse';
                isUserMenuOpen = false;
            });
        }

        static init() {
            service = new KA.Global();

            // start WinJS logging as there is other code which might fail and try to log errors
            WinJS.Utilities.startLog({ type: "error", tags: "Khan Academy" });

            return new WinJS.Promise(function (c, e) {
                //init user log in menu

                service.initUserMenu();

                //init services
                KA.ApiClient.init().then(function () { 
                    //run init on services in parallel to speed up startup
                    return WinJS.Promise.join([
                        KA.Data.init(service.IsFirstRun),
                        KA.User.init(),
                        KA.Downloads.init()]);
                }).done(function () {
                    //init settings flyout
                    WinJS.Application.onsettings = function (e) {
                        e.detail.applicationcommands = {
                            "terms": { title: "Terms of Service", href: "/pages/flyouts/terms.html" },
                            "privacy": { title: "Privacy Policy", href: "/pages/flyouts/privacy.html" },
                            "about": { title: "About", href: "/pages/flyouts/about.html" },
                            "feedback": { title: "Feedback", href: "/pages/flyouts/feedback.html" }
                        };
                        WinJS.UI.SettingsFlyout.populateSettings(e);
                    };

                    //init logging
                    WinJS.Promise.onerror = KA.handleError;
                    WinJS.Application.onerror = KA.handleError;
                    window.onerror = function (err) {
                        KA.handleError(err);
                    };
                    c();
                });
            });
        }

        static handleLogOutBtnClick(e) {
            service.handleLogOutBtnClick(e);
        }

        static handleUsernameDivClick(e) {
            service.handleUsernameDivClick(e);
        }

        static showNetworkStatus() {
            service.showNetworkStatus();
        }

        initUserMenu() {
            loggedIn = false;
            isUserMenuOpen = false;

            userMenuClickEater = KA.id('userMenuClickEater');
            userMenu = KA.id('userMenu');
            userNameDiv = KA.id('userNameDiv');
            loginOptionsDiv = KA.id('loginOptionsDiv');
            loginDiv = KA.id('loginDiv');
            registerDiv = KA.id('registerDiv');

            loginDiv.addEventListener('MSPointerDown', function (e) {
                if (e.pointerType == e.MSPOINTER_TYPE_MOUSE) {
                    KA.User.logIn();
                } else if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                    WinJS.Utilities.addClass(e.currentTarget, "touchShade");
                }
            });

            loginDiv.addEventListener('MSPointerUp', function (e) {
                if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                    WinJS.Utilities.removeClass(e.currentTarget, "touchShade");
                    KA.User.logIn();
                }
            });

            loginDiv.addEventListener('MSPointerOut', KA.handleMSPointerOut);

            registerDiv.addEventListener('MSPointerDown', function (e) {
                if (e.pointerType == e.MSPOINTER_TYPE_MOUSE) {
                    var uri = new Windows.Foundation.Uri(Constants.URL_REGISTRATION);
                    Windows.System.Launcher.launchUriAsync(uri);
                } else if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                    WinJS.Utilities.addClass(e.currentTarget, "touchShade");
                }
            });

            registerDiv.addEventListener('MSPointerUp', function (e) {
                if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                    WinJS.Utilities.removeClass(e.currentTarget, "touchShade");
                    var uri = new Windows.Foundation.Uri(Constants.URL_REGISTRATION);
                    Windows.System.Launcher.launchUriAsync(uri);
                }
            });

            registerDiv.addEventListener('MSPointerOut', KA.handleMSPointerOut);

            userNameDiv.addEventListener('MSPointerDown', function (e) {
                if (e.pointerType == e.MSPOINTER_TYPE_MOUSE) {
                    service.handleUsernameDivClick(e);
                } else if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                    WinJS.Utilities.addClass(e.currentTarget, "touchShade");
                }
            });

            userNameDiv.addEventListener('MSPointerUp', function (e) {
                if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                    WinJS.Utilities.removeClass(e.currentTarget, "touchShade");
                    service.handleUsernameDivClick(e);
                }
            });

            userNameDiv.addEventListener('MSPointerOut', KA.handleMSPointerOut);

            var logOutBtn = KA.id('logOutBtn');
            logOutBtn.addEventListener('MSPointerDown', function (e: any) {
                if (e.pointerType == e.MSPOINTER_TYPE_MOUSE) {
                    service.handleLogOutBtnClick(e);
                }
            });

            logOutBtn.addEventListener('MSPointerUp', function (e: any) {
                if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                    service.handleLogOutBtnClick(e);
                }
            });

            userMenuClickEater.addEventListener('MSPointerDown', function (e) {
                service.hideUserMenu();
            });

            WinJS.Application.addEventListener("userInfoUpdated", service.handleUserInfoUpdated);
            WinJS.Application.addEventListener("userInfoRequested", service.handleUserInfoRequested);
            WinJS.Application.addEventListener("networkStatusChanged", service.handleNetworkStatusChanged);
        }

        showNetworkStatus() {
            if (KA.Data.getIsConnected()) {
                KA.hide(KA.id('noConnectionPane'));
            } else {
                KA.show(KA.id('noConnectionPane'));
            }
        }
    }
}