/// <reference path="../../js/global.ts" />

module DownloadsPage {
    "use strict";
    var nav = WinJS.Navigation;
    var appView = Windows.UI.ViewManagement.ApplicationView;
    var appViewState = Windows.UI.ViewManagement.ApplicationViewState;
    var ui = WinJS.UI;

    var appBar, downloadsLv, videoList;


    function buildDownloads() {
        var videoIds = KA.Downloads.getDownloadedVideoList();
        downloadsLv = KA.id('downloadsLv');

        updatedownloadCount();

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
                downloadsLv.winControl.itemTemplate = renderVideo;
                downloadsLv.addEventListener("iteminvoked", function (e) {
                    e.detail.itemPromise.done(function (item) {
                        var vid = KA.Data.getVideo(item.data.id);
                        nav.navigate("/pages/videoPage/videoPage.html", { video: vid });
                    });
                });
                downloadsLv.addEventListener("selectionchanged", listSelectionChanged);
                KA.initListLayout(downloadsLv);
            } else {
                KA.show(KA.id('noDownloads'));
                KA.hide(downloadsLv);
            }
        } else {
            KA.show(KA.id('noDownloads'));
            KA.hide(downloadsLv);
        }
    }

    function clearVideoSelection() {
        downloadsLv.winControl.selection.clear();
    }

    function deleteSelectedVideos() {
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
                updatedownloadCount();
            });
        }
    }

    function initControls() {
        buildDownloads();

        //appBar
        appBar = KA.id('appBar').winControl;
        KA.id('cmdDelete').addEventListener('pointerdown', deleteSelectedVideos, false);
        KA.id('cmdSelectAll').addEventListener('pointerdown', selectAllVideos, false);
        KA.id('cmdClearSelection').addEventListener('pointerdown', clearVideoSelection, false);

        appBar.disabled = true;
        appBar.hideCommands(appBar.element.querySelectorAll('.multiSelect'));
    }

    function listSelectionChanged() {
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
    }

    function renderVideo(itemPromise) {
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
    }

    function selectAllVideos() {
        downloadsLv.winControl.selection.selectAll();
    }

    function updatedownloadCount() {
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

    function updateLayout(element: HTMLElement, dimensionsChanged: boolean) {
        KA.updateLayout(downloadsLv, dimensionsChanged);
    }

    KA.definePage("/pages/downloadsPage/downloadsPage.html", ready, unload, updateLayout);
}