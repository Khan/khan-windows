/// <reference path="//Microsoft.WinJS.1.0/js/base.js" />
/// <reference path="//Microsoft.WinJS.1.0/js/ui.js" />
/// <reference path="/js/base.js" />
/// <reference path="/js/data/data.js" />

(function () {
    "use strict";
    var appView = Windows.UI.ViewManagement.ApplicationView;
    var appViewState = Windows.UI.ViewManagement.ApplicationViewState;
    var ui = WinJS.UI;

    var page, isConnected, childrenLv;
    var maxDescripLength = 557;
    var maxVideoLinks = 5;

    WinJS.UI.Pages.define("/pages/topicPage/topicPage.html", {
        topic: null,

        dataRequested: function (e) {
            var request = e.request;
            if (page.topic) {
                request.data.properties.title = page.topic.title;
                request.data.properties.description = page.topic.description;
                request.data.setUri(new Windows.Foundation.Uri(page.topic.kaUrl));
            } else {
                request.failWithDisplayText('Topic not loaded properly, please reload page.');
            }
        },

        initControls: function () {
            if (this.topic != null) {
                isConnected = KA.Data.getIsConnected();

                KA.id('pageTitle').innerText = this.topic.title;
                KA.id('pageDesc').innerHTML = this.topic.description;
                KA.id('topicHeader').className = this.topic.domainId + '-subject';

                //does tutorial have children?
                if (this.topic.children && this.topic.children.length > 0) {
                    var childList = new WinJS.Binding.List(this.topic.children);
                    childrenLv = KA.id('childrenLv').winControl;
                    childrenLv.itemDataSource = childList.dataSource;

                    if (this.topic.children[0].type == KA.ObjectType.tutorial) {
                        childrenLv.itemTemplate = page.renderTutorial;
                        childrenLv.addEventListener('iteminvoked', function (e) {
                            var tutIndex = e.detail.itemIndex;
                            var tutId = page.topic.children[tutIndex].id
                            var vidId = page.topic.children[tutIndex].children[0].id;
                            var vid = KA.Data.getVideoInTutorial(tutId, vidId);
                            WinJS.Navigation.navigate("/pages/videoPage/videoPage.html", { video: vid });
                        });
                    } else if (this.topic.children[0].type == KA.ObjectType.video) {
                        childrenLv.itemTemplate = page.renderVideo;
                        childrenLv.addEventListener('iteminvoked', function (e) {
                            var vidIdx = e.detail.itemIndex;
                            var vid = KA.Data.getVideoInTopic(page.topic.id, page.topic.children[vidIdx].id);
                            WinJS.Navigation.navigate("/pages/videoPage/videoPage.html", { video: vid });
                        });
                    } else {
                        console.log('topicPage: topic does not contain recognizable children');
                    }
                    this.initListLayout(appView.value);
                } else {
                    console.log('topicPage: topic does not contain tutorials');
                }
            }
        },

        initListLayout: function (viewState) {
            if (childrenLv) {
                if (viewState === appViewState.snapped) {
                    maxVideoLinks = 2;
                    childrenLv.layout = new ui.ListLayout();
                } else {
                    maxVideoLinks = 5;
                    childrenLv.layout = new ui.GridLayout();
                }
            }
        },

        renderTutorial: function (itemPromise) {
            return itemPromise.then(function (currentItem) {
                var result = document.createElement("div");
                result.className = 'tutorialItem';
                result.attributes['data-id'] = currentItem.data.id;
                result.attributes['data-index'] = currentItem.index;

                var contentDiv = document.createElement("div");
                contentDiv.className = 'content';

                var titleDiv = document.createElement("div");
                titleDiv.className = 'title';
                titleDiv.innerText = currentItem.data.title;
                contentDiv.appendChild(titleDiv);

                //optional:description
                if (currentItem.data.description) {
                    var descripDiv = document.createElement("div");
                    descripDiv.className = 'descrip';
                    var d = currentItem.data.description;
                    if (d.length > maxDescripLength) {
                        d = d.substring(0, maxDescripLength) + '...';
                    }
                    descripDiv.innerText = d;
                    contentDiv.appendChild(descripDiv);
                };

                result.appendChild(contentDiv);

                //are children video objects?
                if (currentItem.data.children && currentItem.data.children.length > 0 && currentItem.data.children[0].type == KA.ObjectType.video) {
                    var video, pItem;
                    var playlistDiv = document.createElement("div");
                    playlistDiv.className = 'playlist';

                    for (var i = 0; i < maxVideoLinks; i++) {
                        if (currentItem.data.children[i]) {
                            video = currentItem.data.children[i];
                            pItem = document.createElement("div");
                            if (i == (currentItem.data.children.length - 1)) {
                                if (i == 0) {
                                    pItem.className = 'pSoloItem';
                                } else {
                                    pItem.className = 'pEndItem';
                                }
                            } else {
                                pItem.className = 'pItem';
                            }
                            pItem.innerText = video.title;

                            if (i > 0) {
                                pItem.attributes['data-id'] = video.id;
                                pItem.addEventListener('MSPointerDown', function (e) {
                                    if (e.pointerType == e.MSPOINTER_TYPE_MOUSE) {
                                        e.cancelBubble = true;
                                        var tutId = e.currentTarget.parentElement.parentElement.attributes['data-id'];
                                        var vid = KA.Data.getVideoInTutorial(tutId, e.currentTarget.attributes['data-id']);
                                        WinJS.Navigation.navigate("/pages/videoPage/videoPage.html", { video: vid });
                                    }
                                });

                                pItem.addEventListener('MSPointerUp', function (e) {
                                    if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                                        e.cancelBubble = true;
                                        var tutId = e.currentTarget.parentElement.parentElement.attributes['data-id'];
                                        var vid = KA.Data.getVideoInTutorial(tutId, e.currentTarget.attributes['data-id']);
                                        WinJS.Navigation.navigate("/pages/videoPage/videoPage.html", { video: vid });
                                    }
                                });
                            }

                            playlistDiv.appendChild(pItem);
                        }
                    }

                    if (maxVideoLinks < currentItem.data.children.length) {
                        pItem = document.createElement("div");
                        pItem.className = 'mItem';
                        pItem.innerText = currentItem.data.children.length + ' total videos';
                        playlistDiv.appendChild(pItem);
                    }

                    result.appendChild(playlistDiv);
                } else {
                    console.log('topicPage: renderTutorial, children not video objects');
                }

                return result;
            });
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
                if (options.topic) {
                    page.topic = options.topic;
                    page.initControls();
                } else {
                    console.log('topicPage: topic id not passed');
                }

                //share event
                var dataTransferManager = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
                dataTransferManager.addEventListener("datarequested", page.dataRequested);
            });
        },        

        unload: function () {
            var dataTransferManager = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
            dataTransferManager.removeEventListener("datarequested", page.dataRequested);
        },

        updateLayout: function (element, viewState, lastViewState) {
            if (lastViewState !== viewState) {
                if (lastViewState === appViewState.snapped || viewState === appViewState.snapped) {
                    var handler = function (e) {
                        childrenLv.removeEventListener("contentanimating", handler, false);
                        e.preventDefault();
                    }
                    childrenLv.addEventListener("contentanimating", handler, false);
                    this.initListLayout(viewState);
                }
            }
        }
    });
})();
