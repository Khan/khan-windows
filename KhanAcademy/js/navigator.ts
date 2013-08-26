module KA {
    "use strict";

    var appView = Windows.UI.ViewManagement.ApplicationView;
    var nav = WinJS.Navigation;
    export var navigator: PageControlNavigator;

    export class PageControlNavigator {
        home: string = "";
        _element: HTMLElement = null;
        _lastNavigationPromise: WinJS.Promise<any> = WinJS.Promise.as();
        _lastWidth: number = 0;
        _lastHeight: number = 0;

        // Define the constructor function for the PageControlNavigator.
        constructor(element, options) {

            this._element = element || document.createElement("div");
            this._element.appendChild(this._createPageElement());

            this.home = options.home;
            this._lastWidth = this._element.clientWidth;
            this._lastHeight = this._element.clientHeight;

            nav.onnavigated = this._navigated.bind(this);
            element.onresize = this._resized.bind(this);

            document.body.onkeyup = this._keyupHandler.bind(this);
            document.body.onkeypress = this._keypressHandler.bind(this);
            document.body.onmspointerup = this._mspointerupHandler.bind(this);

            KA.navigator = this;
        }

        // This is the currently loaded Page object.
        private get pageControl() {
            return this.pageElement && this.pageElement.winControl;
        }

        // This is the root element of the current page.
        private get pageElement() {
            return this._element.firstElementChild;
        }

        // Creates a container for a new page to be loaded into.
        _createPageElement() {
            var element = document.createElement("div");
            element.style.width = "100%";
            element.style.height = "100%";
            return element;
        }

        // Retrieves a list of animation elements for the current page.
        // If the page does not define a list, animate the entire page.
        _getAnimationElements() {
            if (this.pageControl && this.pageControl.getAnimationElements) {
                return this.pageControl.getAnimationElements();
            }
            return this.pageElement;
        }

        // Navigates back whenever the backspace key is pressed and
        // not captured by an input field.
        _keypressHandler(args) {
            if (args.key === "Backspace") {
                nav.back();
            }
        }

        // Navigates back or forward when alt + left or alt + right
        // key combinations are pressed.
        _keyupHandler(args) {
            if ((args.key === "Left" && args.altKey) || (args.key === "BrowserBack")) {
                nav.back();
            } else if ((args.key === "Right" && args.altKey) || (args.key === "BrowserForward")) {
                nav.forward();
            }
        }

        // This function responds to clicks to enable navigation using
        // back and forward mouse buttons.
        _mspointerupHandler(args) {
            if (args.button === 3) {
                nav.back();
            } else if (args.button === 4) {
                nav.forward();
            }
        }

        // Responds to navigation by adding new pages to the DOM.
        _navigated(args) {
            var newElement = this._createPageElement();
            var parentedComplete;
            var parented = new WinJS.Promise(function (c) { parentedComplete = c; });

            this._lastNavigationPromise.cancel();

            this._lastNavigationPromise = WinJS.Promise.timeout().then(function () {
                return WinJS.UI.Pages.render(args.detail.location, newElement, args.detail.state, parented);
            }, function (err) {
                KA.logError(err);
            }).then((control) => {
                var oldElement = <HTMLElement>this.pageElement;
                if (oldElement.winControl && oldElement.winControl.unload) {
                    oldElement.winControl.unload();
                }
                this._element.appendChild(newElement);
                this._element.removeChild(oldElement);
                oldElement.innerText = "";
                this._updateBackButton();
                parentedComplete();
                WinJS.UI.Animation.enterPage(this._getAnimationElements()).done();
            }.bind(this));

            args.detail.setPromise(this._lastNavigationPromise);
        }

        // Responds to resize events and call the updateLayout function
        // on the currently loaded page.
        _resized(args) {

            if (this.pageControl && this.pageControl.updateLayout) {
                var dimensionsChanged = this._lastWidth != this.pageElement.clientWidth ||
                                        this._lastHeight != this.pageElement.clientHeight;
                this.pageControl.updateLayout.call(this.pageControl, this.pageElement, dimensionsChanged);
            }
            this._lastWidth = this.pageElement.clientWidth;
            this._lastHeight = this.pageElement.clientHeight;
        }

        // Updates the back button state. Called after navigation has
        // completed.
        _updateBackButton() {
            var backButton = <HTMLElement>this.pageElement.querySelector("header[role=banner] .win-backbutton");
            if (backButton) {
                backButton.onclick = function () { nav.back(); };

                if (nav.canGoBack) {
                    backButton.removeAttribute("disabled");
                } else {
                    backButton.setAttribute("disabled", "disabled");
                }
            }
        }
    }

    KA.markSupportedForProcessing(PageControlNavigator);
}
