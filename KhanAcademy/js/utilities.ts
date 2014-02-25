module KA {
    export function generalSharingDataRequested(e) {
        e.request.data.properties.title = 'Khan Academy';
        e.request.data.properties.description = 'Learn almost anything for free.';
        e.request.data.setUri(new Windows.Foundation.Uri('http://www.khanacademy.org/'));
    }

    export var markSupportedForProcessing = WinJS.Utilities.markSupportedForProcessing;

    export function logError(e) {
        if (Object.prototype.toString.call(e) == '[object String]') {
            e = new Error(e);
        }
        KA.handleError(e)
    }

    export function millisecondsToMediaTime(milli) {
        var seconds = Math.floor((milli / 1000) % 60);
        var minutes = Math.floor((milli / (60 * 1000)) % 60).toString();
        if (seconds < 10) {
            return minutes + ':0' + seconds.toString();
        }
        return minutes + ":" + seconds.toString();
    }

    export function handleError(event) {
        if (!event)
            return;

        var ex: string;
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
    }

    export function id(elementID) {
        return document.getElementById(elementID);
    }

    export function show(element) {
        if (element instanceof Array) {
            for (var i = 0; i < element.length; i++) {
                element[i].style.display = 'block';
            }
        } else {
            element.style.display = 'block';
        }
    }

    export function hide(element) {
        if (element instanceof Array) {
            for (var i = 0; i < element.length; i++) {
                element[i].style.display = 'none';
            }
        } else {
            element.style.display = 'none';
        }
    }

    export function handleMSPointerOut(e) {
        if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
            WinJS.Utilities.removeClass(e.currentTarget, "touchScale");
            WinJS.Utilities.removeClass(e.currentTarget, "touchShade");
        }
    }

    //TODO: make parameters stronly typed
    export function definePage(path: string, ready, unload, updateLayout?) {
        if (updateLayout) {
            WinJS.UI.Pages.define(path, {
                ready: ready,
                unload: unload,
                updateLayout: updateLayout
            });
        }
        else {

            WinJS.UI.Pages.define(path, {
                ready: ready,
                unload: unload
            });
        }
    }

    // itemLv purposely untyped since sometimes it has itemLv.winControl
    // and sometimes it does not.
    export function initListLayout(itemLv) {
        if (!itemLv)
            return;

        var ctrl = itemLv.winControl || itemLv;
        var viewState = Windows.UI.ViewManagement.ApplicationView.value;
        if (viewState === Windows.UI.ViewManagement.ApplicationViewState.snapped) {
            ctrl.layout = new WinJS.UI.ListLayout();
        } else {
            ctrl.layout = new WinJS.UI.GridLayout();
        }
    }

    // Common updateLayout functionality that most pages want
    export function updateLayout(itemLv: HTMLElement, dimensionsChanged: boolean, initListLayout?: Function) {
        if (!dimensionsChanged)
            return;
        var handler = function (e) {
            itemLv.removeEventListener("contentanimating", handler, false);
            e.preventDefault();
        }
        itemLv.addEventListener("contentanimating", handler, false);
        if (initListLayout) {
            initListLayout(itemLv);
        } else {
            KA.initListLayout(itemLv);
        }
    }

    // Returns value of query string parameter
    export function getParameterByName(queryString, name) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regexS = "[\\?&]" + name + "=([^&#]*)";
        var regex = new RegExp(regexS);
        var results = regex.exec(queryString);
        if (results == null)
            return "";
        else
            return decodeURIComponent(results[1].replace(/\+/g, " "));
    }
}