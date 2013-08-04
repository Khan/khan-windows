/// <reference path="//Microsoft.WinJS.1.0/js/base.js" />
/// <reference path="//Microsoft.WinJS.1.0/js/ui.js" />
/// <reference path="/js/base.js" />
/// <reference path="/js/data/data.js" />
/// <reference path="/js/data/downloads.js" />
/// <reference path="/js/data/user.js" />

(function () {
    "use strict";
    var nav = WinJS.Navigation;
    var appView = Windows.UI.ViewManagement.ApplicationView;
    var appViewState = Windows.UI.ViewManagement.ApplicationViewState;
    var ui = WinJS.UI;

    var page;
    var newsItemCount = 3, newsVideos, downloadedVideos;
    var domainMenus, domainItems, domainMenuClickEater, isMenuInitialized;
    var downloadsLv;
    var isDomainMenuOpen, curDomainMenuIndex, isSplashUp, isConnected;

    WinJS.UI.Pages.define("/pages/mainHub/mainHub.html", {

        buildDomainMenu: function () {
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

                                domainMenuItem.addEventListener('MSPointerDown', function (e) {
                                    if (e.pointerType == e.MSPOINTER_TYPE_MOUSE) {
                                        if (e.currentTarget.attributes['data-id']) {
                                            nav.navigate("/pages/subjectPage/subjectPage.html", { subjectId: e.currentTarget.attributes['data-id'] });
                                        } else if (e.currentTarget.attributes['data-title']) {
                                            nav.navigate("/pages/subjectPage/subjectPage.html", { subjectTitle: e.currentTarget.attributes['data-title'] });
                                        }
                                    }
                                });

                                domainMenuItem.addEventListener('MSPointerUp', function (e) {
                                    if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
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
                            domainItem.addEventListener('MSPointerDown', function (e) {
                                if (e.pointerType == e.MSPOINTER_TYPE_MOUSE) {
                                    page.showDomainMenu(e.currentTarget.attributes['data-index']);
                                } else if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                                    WinJS.Utilities.addClass(e.currentTarget, "touchScale");
                                }
                            });

                            domainItem.addEventListener('MSPointerUp', function (e) {
                                if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                                    WinJS.Utilities.removeClass(e.currentTarget, "touchScale");
                                    page.showDomainMenu(e.currentTarget.attributes['data-index']);
                                }
                            });

                            domainItem.addEventListener('MSPointerOut', KA.handleMSPointerOut);
                        }
                    }

                    domainItem.appendChild(el);
                    domainList.appendChild(domainItem);
                }
            }
        },        

        buildDownloads: function () {
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
                    downloadsLv.winControl.itemTemplate = page.renderVideo;
                    downloadsLv.addEventListener('iteminvoked', function (e) {
                        e.detail.itemPromise.done(function (item) {
                            var vid = KA.Data.getVideo(item.data.id);
                            nav.navigate("/pages/videoPage/videoPage.html", { video: vid });
                        });
                    });
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

        buildNews: function () {
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
                        for (var j = 0; j < newsItemCount; j++) {
                            video = KA.Data.getVideo(domain.children[j].id);
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

                            newsItem.addEventListener('MSPointerDown', function (e) {
                                if (e.pointerType == e.MSPOINTER_TYPE_MOUSE) {
                                    var vid = newsVideos[e.currentTarget.attributes['data-index']];
                                    nav.navigate("/pages/videoPage/videoPage.html", { video: vid });
                                } else if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                                    WinJS.Utilities.addClass(e.currentTarget, "touchScale");
                                }
                            });

                            newsItem.addEventListener('MSPointerUp', function (e) {
                                if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                                    WinJS.Utilities.removeClass(e.currentTarget, "touchScale");
                                    var vid = newsVideos[e.currentTarget.attributes['data-index']];
                                    nav.navigate("/pages/videoPage/videoPage.html", { video: vid });
                                }
                            });
                            newsItem.addEventListener('MSPointerOut', KA.handleMSPointerOut);

                            newsItem.appendChild(el);
                            newsList.appendChild(newsItem);
                        }
                    }
                    break;
                }
            }
        },

        handleNewDataCheckCompleted: function (e) {
            if (e.newDataAvailable) {
                if (isSplashUp) {
                    console.log('newdata check completed, newDataAvailable and splash is up');
                    WinJS.UI.Animation.fadeOut(KA.id('noDataPane')).done(function () {
                        KA.hide(KA.id('noDataPane'));
                        KA.show(KA.id('contenthost'));
                        page.initControls();
                    });
                } else {
                    console.log('newdata check completed, newDataAvailable and splash is not up');
                    page.updateLists();
                }
            } else {
                console.log('newdata check completed, no newDataAvailable');
            }
        },

        hideDomainMenu: function () {
            return new WinJS.Promise(function (c, e) {
                if (isDomainMenuOpen) {
                    WinJS.UI.Animation.exitContent(domainMenus[curDomainMenuIndex]).done(function () {
                        domainMenuClickEater.style.visibility = 'collapse';
                        domainMenus[curDomainMenuIndex].style.visibility = 'collapse';
                        isDomainMenuOpen = false;
                        curDomainMenuIndex = -1;
                        c();
                    });
                } else {
                    c();
                }
            });
        },

        initControls: function () {
            if (appView.value === appViewState.snapped) {
                KA.id('userPane').style.visibility = 'hidden';
            }

            isConnected = KA.Data.getIsConnected();
            isDomainMenuOpen = false;
            isMenuInitialized = false;
            curDomainMenuIndex = -1;

            page.updateLists();
            page.buildDownloads();

            domainMenuClickEater = KA.id('domainMenuClickEater');
            domainMenuClickEater.addEventListener('MSPointerDown', function (e) {
                page.hideDomainMenu();
            });
            
            var downloadsTitle = KA.id('downloadsTitle');
            downloadsTitle.addEventListener('MSPointerDown', function (e) {                
                if (e.pointerType == e.MSPOINTER_TYPE_MOUSE) {
                    nav.navigate("/pages/downloadsPage/downloadsPage.html");
                } else if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                    WinJS.Utilities.addClass(e.currentTarget, "touchShade");
                }
            });

            downloadsTitle.addEventListener('MSPointerUp', function (e) {
                if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                    WinJS.Utilities.removeClass(e.currentTarget, "touchShade");
                    nav.navigate("/pages/downloadsPage/downloadsPage.html");
                }
            });

            downloadsTitle.addEventListener('MSPointerOut', KA.handleMSPointerOut);

            var newsTitle = KA.id('newsTitle');
            newsTitle.addEventListener('MSPointerDown', function (e) {
                if (e.pointerType == e.MSPOINTER_TYPE_MOUSE) {
                    nav.navigate("/pages/newsPage/newsPage.html");
                } else if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                    WinJS.Utilities.addClass(e.currentTarget, "touchShade");
                }
            });

            newsTitle.addEventListener('MSPointerUp', function (e) {
                if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                    WinJS.Utilities.removeClass(e.currentTarget, "touchShade");
                    nav.navigate("/pages/newsPage/newsPage.html");
                }
            });

            newsTitle.addEventListener('MSPointerOut', KA.handleMSPointerOut);
        },

        initListLayout: function (viewState) {
            if (downloadsLv) {
                if (viewState === appViewState.snapped) {
                    downloadsLv.winControl.layout = new ui.ListLayout();
                } else if (viewState === appViewState.fullScreenPortrait) {
                    downloadsLv.winControl.layout = new ui.GridLayout();
                } else {
                    downloadsLv.winControl.layout = new ui.GridLayout({ maxRows: 3 });
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
                    //show local file
                    result.style.backgroundImage = "url('ms-appdata:///local/photos/" + currentItem.data.id + ".jpg')";
                }

                var titleDiv = document.createElement("div");
                titleDiv.className = 'titleDiv';
                titleDiv.innerHTML = currentItem.data.title;

                result.appendChild(titleDiv);

                return result;
            });
        },

        repositionDomainMenus: function () {
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
                    domainMenus[i].style.left = (dPos.left + (i % 2 == 0 ? offsetLeft : offsetOddLeft)) + 'px';
                    domainMenus[i].style.top = (dPos.top + offsetTop) + 'px';
                }
            }
        },

        showDomainMenu: function (domainIndex) {
            if (!isMenuInitialized) {
                isMenuInitialized = true;
                domainMenus = WinJS.Utilities.query(".domainMenu");
                domainItems = WinJS.Utilities.query(".domainItem");
                page.repositionDomainMenus();
            }

            if (domainIndex != curDomainMenuIndex) {                
                page.hideDomainMenu().done(function () {
                    domainMenuClickEater.style.visibility = 'visible';
                    domainMenus[domainIndex].style.visibility = 'visible';
                    WinJS.UI.Animation.enterContent(domainMenus[domainIndex]);

                    curDomainMenuIndex = domainIndex;
                    isDomainMenuOpen = true;
                });
            }
        },

        updateLists: function () {
            page.buildDomainMenu();
            page.buildNews();
        },

        //page event functions
        ready: function (element, options) {
            page = this;
            WinJS.UI.processAll().then(function () {
                //data events
                WinJS.Application.addEventListener("newDataCheckCompleted", page.handleNewDataCheckCompleted);

                //do we have data?
                if (KA.Data.domains) {
                    isSplashUp = false;
                    KA.hide(KA.id('noDataPane'));
                    KA.show(KA.id('contenthost'));
                    page.initControls();
                } else {
                    isSplashUp = true;
                    KA.show(KA.id('noDataPane'));
                    KA.hide(KA.id('contenthost'));
                }

                //share event
                var dataTransferManager = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
                dataTransferManager.addEventListener("datarequested", KA.generalSharingDataRequested);
            });
        },

        unload: function () {
            KA.id('userPane').style.visibility = 'visible';

            var dataTransferManager = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
            dataTransferManager.removeEventListener("datarequested", KA.generalSharingDataRequested);

            WinJS.Application.removeEventListener("newDataCheckCompleted", page.handleNewDataCheckCompleted);
        },

        updateLayout: function (element, viewState, lastViewState) {
            if (lastViewState !== viewState) {
                if (lastViewState === appViewState.snapped || viewState === appViewState.snapped) {
                    page.repositionDomainMenus();
                    var handler = function (e) {
                        downloadsLv.removeEventListener("contentanimating", handler, false);
                        e.preventDefault();
                    }
                    downloadsLv.addEventListener("contentanimating", handler, false);
                    this.initListLayout(viewState);
                    if (viewState === appViewState.snapped) {
                        KA.id('userPane').style.visibility = 'hidden';
                    } else {
                        KA.id('userPane').style.visibility = 'visible';
                    }
                }
            }
        }
    });
})();
