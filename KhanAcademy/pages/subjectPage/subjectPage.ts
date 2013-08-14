/// <reference path="../../js/base.ts" />

module SubjectPage {
    "use strict";
    var nav = WinJS.Navigation;
    var appView = Windows.UI.ViewManagement.ApplicationView;
    var appViewState = Windows.UI.ViewManagement.ApplicationViewState;
    var ui = WinJS.UI;
    var isConnected, childrenLv;
    var maxDescripLength = 297;

    var subject = null;

    function dataRequested(e) {
        var request = e.request;
        if (subject) {
            request.data.properties.title = subject.title;
            request.data.properties.description = subject.description;
            request.data.setUri(new Windows.Foundation.Uri(subject.kaUrl));
        } else {
            request.failWithDisplayText('Subject not loaded properly, please reload ');
        }
    }

    function initControls() {
        if (subject != null) {
            isConnected = KA.Data.getIsConnected();

            KA.id('pageTitle').innerText = subject.title;
            KA.id('pageDesc').innerHTML = subject.description;
            KA.id('subjectHeader').className = 'domainItemSubject ' + subject.domainId + '-subject';

            //does the subject have children?
            if (subject.children && subject.children.length > 0) {
                var childList = new WinJS.Binding.List(subject.children);
                childrenLv = KA.id('childrenLv').winControl;
                childrenLv.itemDataSource = childList.dataSource;

                //item template selection
                if (subject.children[0].type == KA.ObjectType.topic) {
                    childrenLv.itemTemplate = renderTopic;
                    childrenLv.addEventListener('iteminvoked', function (e) {
                        e.detail.itemPromise.done(function (item) {
                            var tp = KA.Data.getTopic(subject.id, item.data.id);
                            nav.navigate("/pages/topicPage/topicPage.html", { topic: tp });
                        });
                    });
                } else if (subject.children[0].type == KA.ObjectType.video) {
                    childrenLv.itemTemplate = renderVideo;
                    childrenLv.addEventListener('iteminvoked', function (e) {
                        e.detail.itemPromise.done(function (item) {
                            var vid = KA.Data.getVideo(item.data.id);
                            nav.navigate("/pages/videoPage/videoPage.html", { video: vid });
                        });
                    });
                } else {
                    console.log('subjectPage: subject does not contain recognizable children');
                }
                KA.initListLayout(childrenLv);
            } else {
                console.log('subjectPage: subject does not contain any children');
            }
        }
    }

    function renderTopic(itemPromise) {
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
            countDiv.innerText = childCount.toString();
            result.appendChild(countDiv);

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
            if (options.subjectId || options.subjectTitle) {
                if (options.subjectId) {
                    subject = KA.Data.getSubject(options.subjectId);
                } else {
                    subject = KA.Data.getSubjectByTitle(options.subjectTitle);
                }
                initControls();

                //share event
                var dataTransferManager: any = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
                dataTransferManager.addEventListener("datarequested", dataRequested);
            } else {
                console.log('subjectPage: neither subject id or title passed');
            }
        });
    }

    function unload() {
        var dataTransferManager: any = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
        dataTransferManager.removeEventListener("datarequested", dataRequested);
    }

    function updateLayout(element: HTMLElement, dimensionsChanged: boolean) {
        KA.updateLayout(childrenLv, dimensionsChanged);
    }

    KA.definePage("/pages/subjectPage/subjectPage.html", ready, unload, updateLayout);
}