/// <reference path="../../js/global.ts" />

module MainHub {
    "use strict";
    var nav = WinJS.Navigation;
    var appView = Windows.UI.ViewManagement.ApplicationView;
    var appViewState = Windows.UI.ViewManagement.ApplicationViewState;
    var ui = WinJS.UI;

    var newsItemCount = 3, newsVideos, downloadedVideos;
    var domainMenus, domainItems, domainMenuClickEater, isMenuInitialized;
    var downloadsLv;
    var isDomainMenuOpen, curDomainMenuIndex, isSplashUp, isConnected;

    function buildDomainMenu() {
        //domains
        var domainList = KA.id('domainList');
        var domainMenuList = KA.id('domainMenuList');
        var domainItem, domainMenu, domainMenuItem, el;
        var domain;

        domainList.innerHTML = '';
        domainMenuList.innerHTML = '';
        for (var i = 0; i < KA.Data.domains.length; i++) {
            //skip news when building domain menu
            if (KA.Data.domains[i].id != KA.Data.newAndNoteworthyId) {
                domain = KA.Data.domains[i];
                domainItem = document.createElement('div');
                domainItem.attributes['data-index'] = domainList.children.length;
                el = document.createElement('div');

                domainItem.className = 'domainItem ' + domain.id;
                domainItem.style.backgroundImage = "url('/images/" + domain.id + ".png')";
                el.innerText = domain.title;

                //check for children
                if (domain.children && domain.children.length > 0 && domain.children[0]) {
                    //check for subjects
                    if (domain.children[0].type == KA.ObjectType.subject) {
                        domainMenu = document.createElement('div');
                        domainMenu.className = 'domainMenu ' + domain.id;
                        domainMenu.attributes['data-index'] = domainList.children.length;

                        for (var j = 0; j < domain.children.length; j++) {
                            domainMenuItem = document.createElement('div');
                            //some subjects from API do not have IDs
                            if (domain.children[j].id) {
                                domainMenuItem.attributes['data-id'] = domain.children[j].id;
                            } else {
                                domainMenuItem.attributes['data-title'] = domain.children[j].title;
                            }
                            domainMenuItem.innerText = domain.children[j].title;

                            domainMenuItem.addEventListener('pointerdown', function (e) {
                                if (e.pointerType == "mouse") {
                                    if (e.currentTarget.attributes['data-id']) {
                                        nav.navigate("/pages/subjectPage/subjectPage.html", { subjectId: e.currentTarget.attributes['data-id'] });
                                    } else if (e.currentTarget.attributes['data-title']) {
                                        nav.navigate("/pages/subjectPage/subjectPage.html", { subjectTitle: e.currentTarget.attributes['data-title'] });
                                    }
                                }
                            });

                            domainMenuItem.addEventListener('pointerdown', function (e) {
                                if (e.pointerType == "touch") {
                                    if (e.currentTarget.attributes['data-id']) {
                                        nav.navigate("/pages/subjectPage/subjectPage.html", { subjectId: e.currentTarget.attributes['data-id'] });
                                    } else if (e.currentTarget.attributes['data-title']) {
                                        nav.navigate("/pages/subjectPage/subjectPage.html", { subjectTitle: e.currentTarget.attributes['data-title'] });
                                    }
                                }
                            });

                            domainMenu.appendChild(domainMenuItem);
                        }

                        domainMenuList.appendChild(domainMenu);
                        domainItem.addEventListener('pointerdown', function (e) {
                            if (e.pointerType == "mouse") {
                                showDomainMenu(e.currentTarget.attributes['data-index']);
                            } else if (e.pointerType == "touch") {
                                WinJS.Utilities.addClass(e.currentTarget, "touchScale");
                            }
                        });

                        domainItem.addEventListener('pointerdown', function (e) {
                            if (e.pointerType == "touch") {
                                WinJS.Utilities.removeClass(e.currentTarget, "touchScale");
                                showDomainMenu(e.currentTarget.attributes['data-index']);
                            }
                        });

                        domainItem.addEventListener('pointerout', KA.handlePointerOut);
                    }
                }

                domainItem.appendChild(el);
                domainList.appendChild(domainItem);
            }
        }
    }

    function buildDownloads() {
        var dwnldCount = KA.Downloads.getDownloadedVideoCount();
        if (dwnldCount == 0) {
            KA.id('downloadCount').innerText = '';
        } else if (dwnldCount == 1) {
            KA.id('downloadCount').innerText = '1 video';
        } else {
            KA.id('downloadCount').innerText = dwnldCount + ' videos';
        }

        var vidLimit = 9;
        var videoIds = KA.Downloads.getDownloadedVideoList(vidLimit);
        downloadsLv = KA.id('downloadsLv');

        if (videoIds.length > 0) {
            KA.hide(KA.id('noDownloads'));
            KA.show(downloadsLv);

            downloadedVideos = [];
            for (var i = 0; i < videoIds.length; i++) {
                var v = KA.Data.getVideo(videoIds[i].videoId);
                if (v) {
                    downloadedVideos.push(v);
                }
            }
            if (downloadedVideos.length > 0) {
                var videoList = new WinJS.Binding.List(downloadedVideos);
                downloadsLv.winControl.itemDataSource = videoList.dataSource;
                downloadsLv.winControl.itemTemplate = renderVideo;
                downloadsLv.addEventListener('iteminvoked', function (e) {
                    e.detail.itemPromise.done(function (item) {
                        var vid = KA.Data.getVideo(item.data.id);
                        nav.navigate("/pages/videoPage/videoPage.html", { video: vid });
                    });
                });
                initListLayout(downloadsLv);
            } else {
                KA.show(KA.id('noDownloads'));
                KA.hide(downloadsLv);
            }
        } else {
            KA.show(KA.id('noDownloads'));
            KA.hide(downloadsLv);
        }
    }

    function buildNews() {
        var domain, video, newsItem, el;
        newsVideos = [];

        var newsList = KA.id('newsList');
        newsList.innerHTML = '';
        for (var i = 0; i < KA.Data.domains.length; i++) {
            //find news domain
            if (KA.Data.domains[i].id == KA.Data.newAndNoteworthyId) {
                domain = KA.Data.domains[i];
                //check for videos
                if (domain.children && domain.children.length > 0) {
                    for (var j = 0; j < domain.children.length && newsVideos.length < newsItemCount; j++) {
                        video = KA.Data.getVideo(domain.children[j].id);
                        if (!video)
                          continue;
                        newsVideos.push(video);
                        newsItem = document.createElement('div');
                        newsItem.attributes['data-index'] = j;
                        el = document.createElement('div');

                        if (j == 0) {
                            newsItem.className = 'bigNewsItem';
                        } else {
                            newsItem.className = 'newsItem';
                        }
                        if (isConnected) {
                            newsItem.style.backgroundImage = 'url(' + video.imgUrl + ')';
                        } else {
                            if (KA.Downloads.isVideoDownloaded(video.id)) {
                                //show local file
                                newsItem.style.backgroundImage = "url('ms-appdata:///local/photos/" + video.id + ".jpg')";
                            } else {
                                //show default file
                                if (j == 0) {
                                    newsItem.style.backgroundImage = 'url(/images/offline_image_big.png)';
                                } else {
                                    newsItem.style.backgroundImage = 'url(/images/offline_image.png)';
                                }
                            }
                        }
                        el.innerText = video.title;
                        el.className = 'titleDiv';

                        newsItem.addEventListener('pointerdown', function (e) {
                            if (e.pointerType == "mouse") {
                                var vid = newsVideos[e.currentTarget.attributes['data-index']];
                                nav.navigate("/pages/videoPage/videoPage.html", { video: vid });
                            } else if (e.pointerType == "touch") {
                                WinJS.Utilities.addClass(e.currentTarget, "touchScale");
                            }
                        });

                        newsItem.addEventListener('pointerdown', function (e) {
                            if (e.pointerType == "touch") {
                                WinJS.Utilities.removeClass(e.currentTarget, "touchScale");
                                var vid = newsVideos[e.currentTarget.attributes['data-index']];
                                nav.navigate("/pages/videoPage/videoPage.html", { video: vid });
                            }
                        });
                        newsItem.addEventListener('pointerout', KA.handlePointerOut);

                        newsItem.appendChild(el);
                        newsList.appendChild(newsItem);
                    }
                }
                break;
            }
        }
    }

    function handleNewDataCheckCompleted(e) {
        if (e.newDataAvailable) {
            if (isSplashUp) {
                console.log('newdata check completed, newDataAvailable and splash is up');
                WinJS.UI.Animation.fadeOut(KA.id('noDataPane')).done(function () {
                    KA.hide(KA.id('noDataPane'));
                    KA.show(KA.id('contenthost'));
                    initControls();
                });
            } else {
                console.log('newdata check completed, newDataAvailable and splash is not up');
                updateLists();
            }
        } else {
            console.log('newdata check completed, no newDataAvailable');
        }
    }

    function hideDomainMenu() {
        return new WinJS.Promise(function (c, e) {
            if (isDomainMenuOpen) {
                WinJS.UI.Animation.exitContent(domainMenus[curDomainMenuIndex]).done(function () {
                    domainMenuClickEater.style.visibility = 'collapse';
                    // This extra check is needed because 2 async operations can be queued before
                    // either one is processed.
                    if (isDomainMenuOpen) {
                        domainMenus[curDomainMenuIndex].style.visibility = 'collapse';
                        isDomainMenuOpen = false;
                        curDomainMenuIndex = -1;
                    }
                    c();
                });
            } else {
                c();
            }
        });
    }

    function initControls() {
        isConnected = KA.Data.getIsConnected();
        isDomainMenuOpen = false;
        isMenuInitialized = false;
        curDomainMenuIndex = -1;

        updateLists();
        buildDownloads();

        domainMenuClickEater = KA.id('domainMenuClickEater');
        domainMenuClickEater.addEventListener('pointerdown', function (e) {
            hideDomainMenu();
        });

        var downloadsTitle = KA.id('downloadsTitle');
        downloadsTitle.addEventListener('pointerdown', function (e: MSPointerEvent) {
            if (e.pointerType == "mouse") {
                nav.navigate("/pages/downloadsPage/downloadsPage.html");
            } else if (e.pointerType == "touch") {
                WinJS.Utilities.addClass(e.currentTarget, "touchShade");
            }
        });

        downloadsTitle.addEventListener('pointerdown', function (e: MSPointerEvent) {
            if (e.pointerType == "touch") {
                WinJS.Utilities.removeClass(e.currentTarget, "touchShade");
                nav.navigate("/pages/downloadsPage/downloadsPage.html");
            }
        });

        downloadsTitle.addEventListener('pointerout', KA.handlePointerOut);

        var newsTitle = KA.id('newsTitle');
        newsTitle.addEventListener('pointerdown', function (e: MSPointerEvent) {
            if (e.pointerType == "mouse") {
                nav.navigate("/pages/newsPage/newsPage.html");
            } else if (e.pointerType == "touch") {
                WinJS.Utilities.addClass(e.currentTarget, "touchShade");
            }
        });

        newsTitle.addEventListener('pointerdown', function (e: MSPointerEvent) {
            if (e.pointerType == "touch") {
                WinJS.Utilities.removeClass(e.currentTarget, "touchShade");
                nav.navigate("/pages/newsPage/newsPage.html");
            }
        });

        newsTitle.addEventListener('pointerout', KA.handlePointerOut);
    }

    function initListLayout(itemLv: HTMLElement) {
        if (!itemLv)
            return;
        if (appView.value === appViewState.snapped) {
            itemLv.winControl.layout = new ui.ListLayout();
        } else if (appView.value === appViewState.fullScreenPortrait) {
            itemLv.winControl.layout = new ui.GridLayout();
        } else {
            itemLv.winControl.layout = new ui.GridLayout({ maxRows: 3 });
        }
    }

    function renderVideo(itemPromise) {
        return itemPromise.then(function (currentItem) {
            var result = document.createElement("div");
            result.className = 'videoItem';
            if (isConnected) {
                result.style.backgroundImage = 'url(' + currentItem.data.imgUrl + ')';
            } else {
                //show local file
                result.style.backgroundImage = "url('ms-appdata:///local/photos/" + currentItem.data.id + ".jpg')";
            }

            var titleDiv = document.createElement("div");
            titleDiv.className = 'titleDiv';
            titleDiv.innerHTML = currentItem.data.title;

            result.appendChild(titleDiv);

            return result;
        });
    }

    function repositionDomainMenus() {
        if (domainMenus) {
            var dItem, dPos;
            var offsetLeft = 150, offsetTop = 0, offsetOddLeft = 150;
            if (appView.value === appViewState.snapped) {
                offsetLeft = 0;
                offsetTop = 24;
                offsetOddLeft = -132;
            }
            for (var i = 0; i < domainMenus.length; i++) {
                dItem = domainItems[domainMenus[i].attributes['data-index']];
                dPos = WinJS.Utilities.getPosition(dItem);
                var menuLeft = Math.min(dPos.left + (i % 2 == 0 ? offsetLeft : offsetOddLeft),
                                        window.innerWidth - domainMenus[i].clientWidth);
                var menuTop = Math.max(0, Math.min(dPos.top + offsetTop,
                                       window.innerHeight - domainMenus[i].clientHeight));
                domainMenus[i].style.top = menuTop + 'px';
                domainMenus[i].style.left = menuLeft + 'px';
            }
        }
    }

    function showDomainMenu(domainIndex) {
        if (!isMenuInitialized) {
            isMenuInitialized = true;
            domainMenus = WinJS.Utilities.query(".domainMenu");
            domainItems = WinJS.Utilities.query(".domainItem");
            repositionDomainMenus();
        }

        if (domainIndex != curDomainMenuIndex) {
            hideDomainMenu().done(function () {
                domainMenuClickEater.style.visibility = 'visible';
                domainMenus[domainIndex].style.visibility = 'visible';
                WinJS.UI.Animation.enterContent(domainMenus[domainIndex]);

                curDomainMenuIndex = domainIndex;
                isDomainMenuOpen = true;
            });
        }
    }

    function updateLists() {
        buildDomainMenu();
        buildNews();
    }

    //page event functions
    function ready(element, options) {
        WinJS.UI.processAll().then(function () {
            //data events
            WinJS.Application.addEventListener("newDataCheckCompleted", handleNewDataCheckCompleted);

            //do we have data?
            if (KA.Data.domains) {
                isSplashUp = false;
                KA.hide(KA.id('noDataPane'));
                KA.show(KA.id('contenthost'));
                initControls();
            } else {
                isSplashUp = true;
                KA.show(KA.id('noDataPane'));
                KA.hide(KA.id('contenthost'));
            }

            //share event
            var dataTransferManager: any = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
            dataTransferManager.addEventListener("datarequested", KA.generalSharingDataRequested);
        });
    }

    function unload() {
        var dataTransferManager: any = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
        dataTransferManager.removeEventListener("datarequested", KA.generalSharingDataRequested);

        WinJS.Application.removeEventListener("newDataCheckCompleted", handleNewDataCheckCompleted);
    }

    function updateLayout(element: HTMLElement, dimensionsChanged: boolean) {
        KA.updateLayout(downloadsLv, dimensionsChanged, initListLayout);
        if (!dimensionsChanged)
            return;
        repositionDomainMenus();
    }

    KA.definePage("/pages/mainHub/mainHub.html", ready, unload, updateLayout);
}
