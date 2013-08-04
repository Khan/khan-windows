/// <reference path="//Microsoft.WinJS.1.0/js/base.js" />
/// <reference path="//Microsoft.WinJS.1.0/js/ui.js" />
/// <reference path="/js/base.js" />
/// <reference path="/js/data/data.js" />

(function () {
    "use strict";
    var nav = WinJS.Navigation;
    var appView = Windows.UI.ViewManagement.ApplicationView;
    var appViewState = Windows.UI.ViewManagement.ApplicationViewState;
    var ui = WinJS.UI;

    var page;
    var newsLv, isConnected;

    WinJS.UI.Pages.define("/pages/newsPage/newsPage.html", {
        newsItems: null,

        initControls: function () {
            isConnected = KA.Data.getIsConnected();

            page.newsItems = [];

            var domain;
            for (var i = 0; i < KA.Data.domains.length; i++) {
                //find news domain
                if (KA.Data.domains[i].id == KA.Data.newAndNoteworthyId) {
                    domain = KA.Data.domains[i];
                    //check for videos
                    if (domain.children && domain.children.length > 0) {
                        for (var j = 0; j < domain.children.length; j++) {
                            page.newsItems.push(KA.Data.getVideo(domain.children[j].id));                            
                        }
                    }
                    break;
                }
            }

            if (page.newsItems.length > 0) {
                var newsList = new WinJS.Binding.List(page.newsItems);
                newsLv = KA.id('newsLv').winControl;
                newsLv.itemDataSource = newsList.dataSource;
                newsLv.itemTemplate = page.renderVideo;
                newsLv.addEventListener('iteminvoked', function (e) {
                    e.detail.itemPromise.done(function (item) {
                        var vid = KA.Data.getVideo(item.data.id);
                        nav.navigate("/pages/videoPage/videoPage.html", { video: vid });
                    });
                });
                page.initListLayout(appView.value);
            }
        },

        initListLayout: function (viewState) {
            if (newsLv) {
                if (viewState === appViewState.snapped) {
                    newsLv.layout = new ui.ListLayout();
                } else {
                    newsLv.layout = new ui.GridLayout();
                }
            }
        },

        renderVideo: function (itemPromise) {
            return itemPromise.then(function (currentItem) {
                var result = document.createElement("div");
                result.className = 'videoItem';

                if (isConnected) {
                    result.style.backgroundImage = 'url(' + currentItem.data.imgUrl + ')';
                } else {
                    if (KA.Downloads.isVideoDownloaded(currentItem.data.id)) {
                        //show local file
                        result.style.backgroundImage = "url('ms-appdata:///local/photos/" + currentItem.data.id + ".jpg')";
                    } else {
                        //show default file
                        result.style.backgroundImage = 'url(/images/offline_image.png)';
                    }
                }

                var titleDiv = document.createElement("div");
                titleDiv.className = 'titleDiv';
                titleDiv.innerHTML = currentItem.data.title;

                result.appendChild(titleDiv);

                return result;
            });
        },
        
        //page event functions
        ready: function (element, options) {
            page = this;
            WinJS.UI.processAll().then(function () {
                page.initControls();

                //share event
                var dataTransferManager = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
                dataTransferManager.addEventListener("datarequested", KA.generalSharingDataRequested);
            });
        },

        unload: function () {
            var dataTransferManager = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
            dataTransferManager.removeEventListener("datarequested", KA.generalSharingDataRequested);
        },

        updateLayout: function (element, viewState, lastViewState) {
            if (lastViewState !== viewState) {
                if (lastViewState === appViewState.snapped || viewState === appViewState.snapped) {
                    var handler = function (e) {
                        newsLv.removeEventListener("contentanimating", handler, false);
                        e.preventDefault();
                    }
                    newsLv.addEventListener("contentanimating", handler, false);
                    this.initListLayout(viewState);
                }
            }
        }
    });
})();
