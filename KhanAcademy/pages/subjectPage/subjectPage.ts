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
    var page, isConnected, childrenLv;
    var maxDescripLength = 297;

    WinJS.UI.Pages.define("/pages/subjectPage/subjectPage.html", {
        subject: null,

        dataRequested: function (e) {
            var request = e.request;
            if (page.subject) {
                request.data.properties.title = page.subject.title;
                request.data.properties.description = page.subject.description;
                request.data.setUri(new Windows.Foundation.Uri(page.subject.kaUrl));
            } else {
                request.failWithDisplayText('Subject not loaded properly, please reload page.');
            }
        },

        initControls: function () {
            if (this.subject != null) {
                isConnected = KA.Data.getIsConnected();

                KA.id('pageTitle').innerText = this.subject.title;
                KA.id('pageDesc').innerHTML = this.subject.description;
                KA.id('subjectHeader').className = this.subject.domainId + '-subject';

                //does the subject have children?
                if (this.subject.children && this.subject.children.length > 0) {
                    var childList = new WinJS.Binding.List(this.subject.children);
                    childrenLv = KA.id('childrenLv').winControl;
                    childrenLv.itemDataSource = childList.dataSource;

                    //item template selection
                    if (this.subject.children[0].type == KA.ObjectType.topic) {                        
                        childrenLv.itemTemplate = page.renderTopic;
                        childrenLv.addEventListener('iteminvoked', function (e) {
                            e.detail.itemPromise.done(function (item) {
                                var tp = KA.Data.getTopic(page.subject.id, item.data.id);
                                nav.navigate("/pages/topicPage/topicPage.html", { topic: tp });
                            });
                        });
                    } else if (this.subject.children[0].type == KA.ObjectType.video) {
                        childrenLv.itemTemplate = page.renderVideo;
                        childrenLv.addEventListener('iteminvoked', function (e) {
                            e.detail.itemPromise.done(function (item) {
                                var vid = KA.Data.getVideo(item.data.id);
                                nav.navigate("/pages/videoPage/videoPage.html", { video: vid });
                            });
                        });
                    } else {
                        console.log('subjectPage: subject does not contain recognizable children');
                    }
                    this.initListLayout(appView.value);
                } else {
                    console.log('subjectPage: subject does not contain any children');
                }
            }
        },

        initListLayout: function (viewState) {
            if (childrenLv) {
                if (viewState === appViewState.snapped) {
                    childrenLv.layout = new ui.ListLayout();
                } else {
                    childrenLv.layout = new ui.GridLayout();
                }
            }
        },

        renderTopic: function (itemPromise) {
            return itemPromise.then(function (currentItem) {
                var childCount = 0, imgUrl = null, imgId = '';
                var result = document.createElement("div");
                result.className = 'topicItem';                

                //find img of first video and total child count
                if (currentItem.data.children && currentItem.data.children.length > 0) {
                    if (currentItem.data.children[0].type == KA.ObjectType.tutorial) {                        
                        for (var i = 0; i < currentItem.data.children.length; i++) {
                            if (!imgUrl && currentItem.data.children[i].children[0]) {
                                imgId = currentItem.data.children[i].children[0].id;
                                imgUrl = currentItem.data.children[i].children[0].imgUrl;
                            }

                            for (var j = 0; j < currentItem.data.children[i].children.length; j++) {
                                childCount++;
                            }
                        }
                    } else if (currentItem.data.children[0].type == KA.ObjectType.video) {
                        imgId = currentItem.data.children[0].id;
                        imgUrl = currentItem.data.children[0].imgUrl;
                        childCount = currentItem.data.children.length;
                    }
                }

                if (imgUrl) {
                    var imgDiv = document.createElement("div");
                    imgDiv.className = 'image';

                    if (isConnected) {
                        imgDiv.style.backgroundImage = 'url(' + imgUrl + ')';
                    } else {
                        if (KA.Downloads.isVideoDownloaded(imgId)) {
                            //show local file
                            imgDiv.style.backgroundImage = "url('ms-appdata:///local/photos/" + imgId + ".jpg')";
                        } else {
                            //show default file
                            imgDiv.style.backgroundImage = 'url(/images/offline_image.png)';
                        }
                    }
                    
                    result.appendChild(imgDiv);
                }

                //content
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

                //count
                var countDiv = document.createElement("div");
                countDiv.className = 'count';
                countDiv.innerText = childCount;
                result.appendChild(countDiv);
                                
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
                if (options.subjectId || options.subjectTitle) {
                    if (options.subjectId) {
                        page.subject = KA.Data.getSubject(options.subjectId);
                    } else {
                        page.subject = KA.Data.getSubjectByTitle(options.subjectTitle);
                    }
                    page.initControls();

                    //share event
                    var dataTransferManager = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
                    dataTransferManager.addEventListener("datarequested", page.dataRequested);
                } else {
                    console.log('subjectPage: neither subject id or title passed');
                }
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
