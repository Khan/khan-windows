/// <reference path="../../js/navigator.ts" />
/// <reference path="../../js/base.ts" />

module SearchResults {
    "use strict";
    var nav = WinJS.Navigation;
    var appView = Windows.UI.ViewManagement.ApplicationView;
    var appViewState = Windows.UI.ViewManagement.ApplicationViewState;
    var ui = WinJS.UI;

    var resultsLv, categorySelect, resultList, filteredList = null, isConnected;
    var results = null;

    function initControls(searchTerm) {
        isConnected = KA.Data.getIsConnected();

        //render header and filters
        KA.id('pageTitle').innerText = 'Results for "' + searchTerm + '"';

        categorySelect = KA.id('categorySelect')
        var opt;
        for (var i = 0; i < KA.Data.domains.length; i++) {
            if (KA.Data.domains[i].id != KA.Data.newAndNoteworthyId) {
                opt = document.createElement('option');
                opt.value = KA.Data.domains[i].id;
                opt.innerText = KA.Data.domains[i].title;
                categorySelect.appendChild(opt);
            }
        }
        categorySelect.addEventListener('change', function (e) {
            var selIdx = e.currentTarget.selectedIndex;
            if (selIdx > 0) {
                var selId = categorySelect.children[selIdx].value;
                filteredList = resultList.createFiltered(function (item) {
                    return item.parents && item.parents[0] == selId;
                });
                resultsLv.winControl.itemDataSource = filteredList.dataSource;
                updateResultCount();
            } else {
                filteredList = null;
                resultsLv.winControl.itemDataSource = resultList.dataSource;
                updateResultCount();
            }
        });

        //ensure back button is enabled if app initialized as search result
        var backButton = <HTMLElement>document.body.querySelector("header[role=banner] .win-backbutton");
        if (backButton) {
            if (!nav.canGoBack) {
                backButton.removeAttribute("disabled");
                backButton.onclick = function () { nav.navigate(KA.navigator.home); };
            }
        }

        //render results
        resultsLv = KA.id('resultsLv');
        results = KA.Data.searchVideos(searchTerm.toLowerCase());

        if (results && results.length > 0) {
            updateResultCount();
            KA.hide(KA.id('noResults'));
            KA.show(resultsLv);

            resultList = new WinJS.Binding.List(results);
            resultsLv.winControl.itemDataSource = resultList.dataSource;
            resultsLv.winControl.itemTemplate = renderVideo;
            resultsLv.addEventListener('iteminvoked', function (e) {
                e.detail.itemPromise.done(function (item) {
                    var vid = KA.Data.getVideo(item.data.id);
                    nav.navigate("/pages/videoPage/videoPage.html", { video: vid });
                });
            });
            initListLayout(appView.value);
        } else {
            updateResultCount();
            KA.show(KA.id('noResults'));
            KA.hide(resultsLv);
        }
    }

    function initListLayout(viewState) {
        if (resultsLv) {
            if (viewState === appViewState.snapped) {
                resultsLv.winControl.layout = new ui.ListLayout();
            } else {
                resultsLv.winControl.layout = new ui.GridLayout();
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

    function updateResultCount() {
        var resultCount = results.length;
        if (filteredList != null) {
            resultCount = filteredList.length;
        }

        if (resultCount > 1) {
            KA.id('resultsCount').innerText = resultCount + ' videos';
        } else if (resultCount == 0) {
            KA.id('resultsCount').innerText = '0 videos';
        } else {
            KA.id('resultsCount').innerText = '1 video';
        }
    }

    //page event functions
    function ready(element, options) {
        WinJS.UI.processAll().then(function () {
            if (options && options.searchDetails) {
                initControls(options.searchDetails);
            } else if (KA.Settings.isInDesigner) {
                initControls('art');
            }

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
                    resultsLv.removeEventListener("contentanimating", handler, false);
                    e.preventDefault();
                }
                resultsLv.addEventListener("contentanimating", handler, false);
                initListLayout(viewState);
            }
        }
    }

    KA.definePage("/pages/searchResults/searchResults.html", ready, unload, updateLayout);
}