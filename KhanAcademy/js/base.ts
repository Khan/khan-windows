/// <reference path="//Microsoft.WinJS.1.0/js/base.js" />
/// <reference path="//Microsoft.WinJS.1.0/js/ui.js" />

(function () {
    'use strict';

    var service, loggedIn;
    var userMenuClickEater, userMenu, isUserMenuOpen;
    var userNameDiv, loginOptionsDiv, loginDiv, registerDiv;

    WinJS.Namespace.define("KA", {

        generalSharingDataRequested: function (e) {
            e.request.data.properties.title = 'Khan Academy';
            e.request.data.properties.description = 'Learn almost anything for free.';
            e.request.data.setUri(new Windows.Foundation.Uri('http://www.khanacademy.org/'));
        },

        handleError: function (event) {
            var ex
            if (event.detail) {
                if (event.detail.error) {
                    if (event.detail.error.responseText) {
                        ex = event.detail.error.responseText;
                    } else if (event.detail.error.message) {
                        ex = event.detail.error.message;
                    } else if (Object.prototype.toString.call(event.detail.error) === '[object Array]') {
                        ex = event.detail.error[0].message;
                    } else if (Object.prototype.toString.call(event.detail.error) === '[object String]') {
                        ex = event.detail.error;
                    }
                } else {
                    ex = event.detail.error;
                }
            } else {
                ex = event;
            }
            if (ex != 'Layout is not initialized.') {
                //setStatus(e);
            }
            WinJS.log && WinJS.log(ex, "Khan Academy", "error");
        },

        handleLogOutBtnClick: function (e) {
            KA.User.logOut();
            loggedIn = false;
            service.hideUserMenu();
            KA.hide(userNameDiv);
            KA.show(loginDiv);
        },

        handleMSPointerOut: function (e) {
            if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                WinJS.Utilities.removeClass(e.currentTarget, "touchScale");
                WinJS.Utilities.removeClass(e.currentTarget, "touchShade");              
            }
        },

        handleNetworkStatusChanged: function (e) {
            if (e.statusChange) {
                service.showNetworkStatus();
            }
        },
        
        handleUserInfoRequested: function(){            
            KA.show(KA.id('userProgress'));
        },

        handleUserInfoUpdated: function(e){
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
        },

        handleUsernameDivClick: function (e) {
            if (isUserMenuOpen) {
                service.hideUserMenu();
            } else {
                userMenuClickEater.style.visibility = 'visible';
                userMenu.style.visibility = 'visible';
                WinJS.UI.Animation.enterContent(userMenu, { top: "12px", left: "0px", rtlflip: false }).done(function () {
                    isUserMenuOpen = true;
                });
            }
        },

        hide: function (element) {
            if (element instanceof Array) {
                for (var i = 0; i < element.length; i++) {
                    element[i].style.display = 'none';
                }
            } else {
                element.style.display = 'none';
            }
        },

        hideUserMenu: function () {
            WinJS.UI.Animation.exitContent(userMenu, { top: "12px", left: "0px", rtlflip: false }).done(function () {
                userMenuClickEater.style.visibility = 'collapse';
                userMenu.style.visibility = 'collapse';
                isUserMenuOpen = false;
            });
        },

        id: function (elementID) {
            return document.getElementById(elementID);
        },

        init: function () {
            service = this;
            return new WinJS.Promise(function (c, e) {
                //init user log in menu
                
                service.initUserMenu();

                //init data
                KA.Data.init()
                    .then(function () { return KA.User.init() })
                    .then(function () { return KA.Downloads.init() })
                    .done(function () {
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
                        WinJS.Promise.onerror = service.handleError;
                        WinJS.Application.onerror = service.handleError;
                        window.onerror = function (err) {
                            service.handleError(err);
                        };
                        WinJS.Utilities.startLog({ type: "error", tags: "Khan Academy" });
                        c();
                    });
            });
        },

        initUserMenu: function() {
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
                    var uri = new Windows.Foundation.Uri(KA.Settings.registrationLink);
                    Windows.System.Launcher.launchUriAsync(uri);
                } else if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                    WinJS.Utilities.addClass(e.currentTarget, "touchShade");
                }
            });

            registerDiv.addEventListener('MSPointerUp', function (e) {
                if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                    WinJS.Utilities.removeClass(e.currentTarget, "touchShade");
                    var uri = new Windows.Foundation.Uri(KA.Settings.registrationLink);
                    Windows.System.Launcher.launchUriAsync(uri);
                }
            });

            registerDiv.addEventListener('MSPointerOut', KA.handleMSPointerOut);

            userNameDiv.addEventListener('MSPointerDown', function (e) {
                if (e.pointerType == e.MSPOINTER_TYPE_MOUSE) {
                    KA.handleUsernameDivClick(e);
                } else if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                    WinJS.Utilities.addClass(e.currentTarget, "touchShade");
                }
            });

            userNameDiv.addEventListener('MSPointerUp', function (e) {
                if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                    WinJS.Utilities.removeClass(e.currentTarget, "touchShade");
                    KA.handleUsernameDivClick(e);
                }
            });

            userNameDiv.addEventListener('MSPointerOut', KA.handleMSPointerOut);

            var logOutBtn = KA.id('logOutBtn');
            logOutBtn.addEventListener('MSPointerDown', function (e) {
                if (e.pointerType == e.MSPOINTER_TYPE_MOUSE) {
                    KA.handleLogOutBtnClick(e);
                }
            });

            logOutBtn.addEventListener('MSPointerUp', function (e) {
                if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                    KA.handleLogOutBtnClick(e);
                }
            });

            userMenuClickEater.addEventListener('MSPointerDown', function (e) {
                service.hideUserMenu();
            });

            WinJS.Application.addEventListener("userInfoUpdated", service.handleUserInfoUpdated);
            WinJS.Application.addEventListener("userInfoRequested", service.handleUserInfoRequested);
            WinJS.Application.addEventListener("networkStatusChanged", service.handleNetworkStatusChanged);
        },

        logError: function (e) {
            if (Object.prototype.toString.call(e) == '[object String]') {
                e = new Error(e);
            }
            service.handleError(e)
        },

        millisecondsToMediaTime: function(milli)
        {
            var seconds = Math.floor((milli / 1000) % 60);
            var minutes = Math.floor((milli / (60 * 1000)) % 60);
            if (seconds < 10) {
                seconds = '0' + seconds;
            }
            return minutes + ":" + seconds;
        },

        show: function (element) {
            if (element instanceof Array) {
                for (var i = 0; i < element.length; i++) {
                    element[i].style.display = 'block';
                }
            } else {
                element.style.display = 'block';
            }
        },

        showNetworkStatus: function () {
            if (KA.Data.getIsConnected()) {
                KA.hide(KA.id('noConnectionPane'));
            } else {
                KA.show(KA.id('noConnectionPane'));
            }
        },

        ObjectType: {
            domain: 0,
            subject: 1,
            topic: 2,
            tutorial: 3,
            video: 4
        }
    });
})();

Array.prototype.contains = function (element) {
    for (var i = 0; i < this.length; i++) {
        if (this[i] == element) {
            return true;
        }
    }
    return false;
}

String.prototype.trim = function () {
    return this.replace(/^\s+|\s+$/g, "");
}

Date.prototype.setISO8601 = function (dString) {

    var regexp = /(\d\d\d\d)(-)?(\d\d)(-)?(\d\d)(T)?(\d\d)(:)?(\d\d)(:)?(\d\d)(\.\d+)?(Z|([+-])(\d\d)(:)?(\d\d))/;

    if (dString.toString().match(new RegExp(regexp))) {
        var d = dString.match(new RegExp(regexp));
        var offset = 0;

        this.setUTCDate(1);
        this.setUTCFullYear(parseInt(d[1], 10));
        this.setUTCMonth(parseInt(d[3], 10) - 1);
        this.setUTCDate(parseInt(d[5], 10));
        this.setUTCHours(parseInt(d[7], 10));
        this.setUTCMinutes(parseInt(d[9], 10));
        this.setUTCSeconds(parseInt(d[11], 10));
        if (d[12])
            this.setUTCMilliseconds(parseFloat(d[12]) * 1000);
        else
            this.setUTCMilliseconds(0);
        if (d[13] != 'Z') {
            offset = (d[15] * 60) + parseInt(d[17], 10);
            offset *= ((d[14] == '-') ? -1 : 1);
            this.setTime(this.getTime() - offset * 60 * 1000);
        }
    }
    else {
        this.setTime(Date.parse(dString));
    }
    return this;
};
