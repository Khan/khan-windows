/// <reference path="//Microsoft.WinJS.1.0/js/base.js" />
/// <reference path="//Microsoft.WinJS.1.0/js/ui.js" />
/// <reference path="/js/base.js" />
/// <reference path="/js/data/data.js" />
/// <reference path="/js/data/downloads.js" />

(function () {
    "use strict";
    var nav = WinJS.Navigation;
    var appView = Windows.UI.ViewManagement.ApplicationView;
    var appViewState = Windows.UI.ViewManagement.ApplicationViewState;
    var ui = WinJS.UI;

    var page;
    var appBar, downloadsLv, videoList;

    WinJS.UI.Pages.define("/pages/downloadsPage/downloadsPage.html", {

        buildDownloads: function () {
            var videoIds = KA.Downloads.getDownloadedVideoList();
            downloadsLv = KA.id('downloadsLv');

            page.updatedownloadCount();

            if (videoIds.length > 0) {
                KA.hide(KA.id('noDownloads'));
                KA.show(downloadsLv);

                var downloadedVideos = [];
                for (var i = 0; i < videoIds.length; i++) {
                    var v = KA.Data.getVideo(videoIds[i].videoId);
                    if (v) {
                        downloadedVideos.push(v);
                    }
                }
                if (downloadedVideos.length > 0) {
                    videoList = new WinJS.Binding.List(downloadedVideos);
                    downloadsLv.winControl.itemDataSource = videoList.dataSource;
                    downloadsLv.winControl.itemTemplate = page.renderVideo;
                    downloadsLv.addEventListener("iteminvoked", function (e) {
                        e.detail.itemPromise.done(function (item) {
                            var vid = KA.Data.getVideo(item.data.id);
                            nav.navigate("/pages/videoPage/videoPage.html", { video: vid });
                        });
                    });
                    downloadsLv.addEventListener("selectionchanged", page.listSelectionChanged);

                    page.initListLayout(appView.value);
                } else {
                    KA.show(KA.id('noDownloads'));
                    KA.hide(downloadsLv);
                }
            } else {
                KA.show(KA.id('noDownloads'));
                KA.hide(downloadsLv);
            }
        },

        clearVideoSelection: function () {
            downloadsLv.winControl.selection.clear();
        },

        deleteSelectedVideos: function () {
            if (downloadsLv.winControl.selection.count() > 0) {
                var indices = downloadsLv.winControl.selection.getIndices();
                var deletePromises = [];
                for (var i = indices.length - 1; i >= 0; i--) {
                    var list = videoList.splice(indices[i], 1);
                    if (list && list.length > 0) {
                        deletePromises.push(KA.Downloads.deleteVideo(list[0].id));
                    }
                }

                WinJS.Promise.join(deletePromises).done(function () {
                    page.updatedownloadCount();
                });
            }
        },

        initControls: function () {
            page.buildDownloads();

            //appBar
            appBar = KA.id('appBar').winControl;
            KA.id('cmdDelete').addEventListener('MSPointerDown', page.deleteSelectedVideos, false);
            KA.id('cmdSelectAll').addEventListener('MSPointerDown', page.selectAllVideos, false);
            KA.id('cmdClearSelection').addEventListener('MSPointerDown', page.clearVideoSelection, false);
            
            appBar.disabled = true;
            appBar.hideCommands(appBar.element.querySelectorAll('.multiSelect'));
        },

        initListLayout: function (viewState) {
            if (downloadsLv) {
                if (viewState === appViewState.snapped) {
                    downloadsLv.winControl.layout = new ui.ListLayout();
                } else {
                    downloadsLv.winControl.layout = new ui.GridLayout();
                }
            }
        },

        listSelectionChanged: function () {
            if (downloadsLv.winControl.selection.count() > 0) {
                // Show selection commands in AppBar
                appBar.disabled = false;
                appBar.showCommands(appBar.element.querySelectorAll('.multiSelect'));
                appBar.sticky = true;

                appBar.show();
            } else {
                // Hide selection commands in AppBar
                appBar.hide();
                appBar.hideCommands(appBar.element.querySelectorAll('.multiSelect'));                
                appBar.sticky = false;
                appBar.disabled = true;
            }
        },

        renderVideo: function (itemPromise) {
            return itemPromise.then(function (currentItem) {
                var result = document.createElement("div");
                result.className = 'videoItem';
                result.style.backgroundImage = 'url(' + currentItem.data.imgUrl + ')';

                var titleDiv = document.createElement("div");
                titleDiv.className = 'titleDiv';
                titleDiv.innerHTML = currentItem.data.title;

                result.appendChild(titleDiv);

                return result;
            });
        },

        selectAllVideos: function () {
            downloadsLv.winControl.selection.selectAll();
        },

        updatedownloadCount: function(){
            var dwnldCount = KA.Downloads.getDownloadedVideoCount();
            if (dwnldCount == 0) {
                KA.id('downloadCount').innerText = '';
                KA.hide(downloadsLv);
                KA.show(KA.id('noDownloads'));
            } else if (dwnldCount == 1) {
                KA.id('downloadCount').innerText = '1 video';
            } else {
                KA.id('downloadCount').innerText = dwnldCount + ' videos';
            }
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
                        downloadsLv.removeEventListener("contentanimating", handler, false);
                        e.preventDefault();
                    }
                    downloadsLv.addEventListener("contentanimating", handler, false);
                    this.initListLayout(viewState);
                }
            }
        }
    });
})();
