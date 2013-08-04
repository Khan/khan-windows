/// <reference path="../../js/base.ts" />

module NewsPage {

    "use strict";
    var nav = WinJS.Navigation;
    var appView = Windows.UI.ViewManagement.ApplicationView;
    var appViewState = Windows.UI.ViewManagement.ApplicationViewState;
    var ui = WinJS.UI;

    var newsLv, isConnected;
    var newsItems = null;

    function initControls() {
        isConnected = KA.Data.getIsConnected();

        newsItems = [];

        var domain;
        for (var i = 0; i < KA.Data.domains.length; i++) {
            //find news domain
            if (KA.Data.domains[i].id == KA.Data.newAndNoteworthyId) {
                domain = KA.Data.domains[i];
                //check for videos
                if (domain.children && domain.children.length > 0) {
                    for (var j = 0; j < domain.children.length; j++) {
                        newsItems.push(KA.Data.getVideo(domain.children[j].id));
                    }
                }
                break;
            }
        }

        if (newsItems.length > 0) {
            var newsList = new WinJS.Binding.List(newsItems);
            newsLv = KA.id('newsLv').winControl;
            newsLv.itemDataSource = newsList.dataSource;
            newsLv.itemTemplate = renderVideo;
            newsLv.addEventListener('iteminvoked', function (e) {
                e.detail.itemPromise.done(function (item) {
                    var vid = KA.Data.getVideo(item.data.id);
                    nav.navigate("/pages/videoPage/videoPage.html", { video: vid });
                });
            });
            initListLayout(appView.value);
        }
    }

    function initListLayout(viewState) {
        if (newsLv) {
            if (viewState === appViewState.snapped) {
                newsLv.layout = new ui.ListLayout();
            } else {
                newsLv.layout = new ui.GridLayout();
            }
        }
    }

    function renderVideo(itemPromise) {
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
    }

    //page event functions
    function ready(element, options) {
        WinJS.UI.processAll().then(function () {
            initControls();

            //share event
            var dataTransferManager: any = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
            dataTransferManager.addEventListener("datarequested", KA.generalSharingDataRequested);
        });
    }

    function unload() {
        var dataTransferManager: any = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
        dataTransferManager.removeEventListener("datarequested", KA.generalSharingDataRequested);
    }

    function updateLayout(element, viewState, lastViewState) {
        if (lastViewState !== viewState) {
            if (lastViewState === appViewState.snapped || viewState === appViewState.snapped) {
                var handler = function (e) {
                    newsLv.removeEventListener("contentanimating", handler, false);
                    e.preventDefault();
                }
                newsLv.addEventListener("contentanimating", handler, false);
                initListLayout(viewState);
            }
        }
    }

    KA.definePage("/pages/newsPage/newsPage.html", ready, unload, updateLayout);
}