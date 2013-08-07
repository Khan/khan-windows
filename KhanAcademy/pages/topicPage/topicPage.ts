/// <reference path="../../js/base.ts" />

module TopicPage {
    "use strict";
    var appView = Windows.UI.ViewManagement.ApplicationView;
    var appViewState = Windows.UI.ViewManagement.ApplicationViewState;
    var ui = WinJS.UI;

    var isConnected, childrenLv;
    var maxDescripLength = 557;
    var maxVideoLinks = 5;

    var topic = null;

    function dataRequested(e) {
        var request = e.request;
        if (topic) {
            request.data.properties.title = topic.title;
            request.data.properties.description = topic.description;
            request.data.setUri(new Windows.Foundation.Uri(topic.kaUrl));
        } else {
            request.failWithDisplayText('Topic not loaded properly, please reload ');
        }
    }

    function initControls() {
        if (topic != null) {
            isConnected = KA.Data.getIsConnected();

            KA.id('pageTitle').innerText = topic.title;
            KA.id('pageDesc').innerHTML = topic.description;
            KA.id('topicHeader').className = 'domainItemSubject ' + topic.domainId + '-subject';

            //does tutorial have children?
            if (topic.children && topic.children.length > 0) {
                var childList = new WinJS.Binding.List(topic.children);
                childrenLv = KA.id('childrenLv').winControl;
                childrenLv.itemDataSource = childList.dataSource;

                if (topic.children[0].type == KA.ObjectType.tutorial) {
                    childrenLv.itemTemplate = renderTutorial;
                    childrenLv.addEventListener('iteminvoked', function (e) {
                        var tutIndex = e.detail.itemIndex;
                        var tutId = topic.children[tutIndex].id
                        var vidId = topic.children[tutIndex].children[0].id;
                        var vid = KA.Data.getVideoInTutorial(tutId, vidId);
                        WinJS.Navigation.navigate("/pages/videoPage/videoPage.html", { video: vid });
                    });
                } else if (topic.children[0].type == KA.ObjectType.video) {
                    childrenLv.itemTemplate = renderVideo;
                    childrenLv.addEventListener('iteminvoked', function (e) {
                        var vidIdx = e.detail.itemIndex;
                        var vid = KA.Data.getVideoInTopic(topic.id, topic.children[vidIdx].id);
                        WinJS.Navigation.navigate("/pages/videoPage/videoPage.html", { video: vid });
                    });
                } else {
                    console.log('topicPage: topic does not contain recognizable children');
                }
                initListLayout(appView.value);
            } else {
                console.log('topicPage: topic does not contain tutorials');
            }
        }
    }

    function initListLayout(viewState) {
        if (childrenLv) {
            if (viewState === appViewState.snapped) {
                maxVideoLinks = 2;
                childrenLv.layout = new ui.ListLayout();
            } else {
                maxVideoLinks = 5;
                childrenLv.layout = new ui.GridLayout();
            }
        }
    }

    function renderTutorial(itemPromise) {
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
            if (options.topic) {
                topic = options.topic;
                initControls();
            } else {
                console.log('topicPage: topic id not passed');
            }

            //share event
            var dataTransferManager: any = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
            dataTransferManager.addEventListener("datarequested", dataRequested);
        });
    }

    function unload() {
        var dataTransferManager: any = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
        dataTransferManager.removeEventListener("datarequested", dataRequested);
    }

    function updateLayout(element, viewState, lastViewState) {
        if (lastViewState !== viewState) {
            if (lastViewState === appViewState.snapped || viewState === appViewState.snapped) {
                var handler = function (e) {
                    childrenLv.removeEventListener("contentanimating", handler, false);
                    e.preventDefault();
                }
                childrenLv.addEventListener("contentanimating", handler, false);
                initListLayout(viewState);
            }
        }
    }

    KA.definePage("/pages/topicPage/topicPage.html", ready, unload, updateLayout);
}