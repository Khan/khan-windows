/// <reference path="//Microsoft.WinJS.1.0/js/base.js" />
/// <reference path="//Microsoft.WinJS.1.0/js/ui.js" />
/// <reference path="/js/base.js" />
/// <reference path="/js/data/data.js" />
/// <reference path="/js/data/downloads.js" />
/// <reference path="/js/data/user.js" />

(function () {
    "use strict";
    var page;
    var appBar, vidPlayer, firstRun, curIndex, tmbDiv, shadeDiv, isPlaying, isTmbShown, isDwldShown, downloadProgress;
    var noTranscriptDiv, transcriptDiv, transcriptList, script, selectedScriptIndex, previousScriptIndex, nextScriptEndTime, currentScriptStartTime, subTitleBlocks;
    var isConnected, isVideoDownloaded, isAutoAdvanced;

    WinJS.UI.Pages.define("/pages/videoPage/videoPage.html", {        
        video: null,
        parent: null,

        dataRequested: function (e) {
            var request = e.request;
            if (page.video) {                
                request.data.properties.title = page.video.title;
                request.data.properties.description = page.video.description;
                request.data.setUri(new Windows.Foundation.Uri(page.video.kaUrl));
            } else {
                request.failWithDisplayText('Video not loaded properly, please reload page.');
            }
        },

        handleDownloadComplete: function (e) {
            if (page.video && page.video.id == e.videoId) {
                page.showDownloadProgress();
                downloadProgress.value = 1;
                WinJS.UI.Animation.fadeOut(downloadProgress).done(function () {
                    KA.hide(downloadProgress);
                    isDwldShown = false;
                    page.toggleDownloadCmd(false);
                });
            }
        },

        handleDownloadProgress: function (e) {
            if (page.video && page.video.id == e.videoId) {
                page.showDownloadProgress();
                downloadProgress.value = (e.bytes / e.total);
            }
        },

        handleNewDownloadStarted: function (e) {
            if (page.video && page.video.id == e.videoId) {
                page.showNewDownloadStarted();
            }
        },

        initControls: function () {
            // function called on page load, video playlist clicks
            // just call the renderControls function to refresh the data

            isConnected = KA.Data.getIsConnected();
            firstRun = true;

            //init control variables
            tmbDiv = KA.id('tmbDiv');
            shadeDiv = KA.id('shadeDiv');
            downloadProgress = KA.id('downloadProgress');
            noTranscriptDiv = KA.id('noTranscriptDiv');
            transcriptDiv = KA.id('transcriptDiv');
            transcriptList = KA.id('transcriptList');

            transcriptDiv.addEventListener('MSPointerDown', function (e) {
                //pause auto advancing of scroll because user is dragging scroll bar
                isAutoAdvanced = false;
            });

            //video image
            tmbDiv.addEventListener('MSPointerDown', function (e) {
                page.togglePlayPause();
            });

            //video player
            vidPlayer = KA.id('vidPlayer');
            vidPlayer.addEventListener('play', function (e) {
                isPlaying = true;
                if (isTmbShown) {
                    isTmbShown = false;
                    WinJS.UI.Animation.fadeOut(tmbDiv).done(function () {
                        tmbDiv.style.display = 'none';
                    });
                }
            });
            vidPlayer.addEventListener('pause', function (e) {
                KA.User.trackPlayback(page.video.id, vidPlayer.currentTime);
                isPlaying = false;
            });
            vidPlayer.addEventListener('loadedmetadata', function (e) {
                var trackInfo = KA.User.isVideoPlaybackTracked(page.video.id);
                if (trackInfo) {
                    vidPlayer.currentTime = trackInfo.currentTime;
                }
            });
            vidPlayer.addEventListener('timeupdate', function (e) {
                if (script) {
                    var newTime = vidPlayer.currentTime * 1000;

                    if (newTime > nextScriptEndTime) {
                        //advance selected index
                        selectedScriptIndex++;

                        if (script[selectedScriptIndex] && newTime > script[selectedScriptIndex].end_time) {
                            //playhead moved forward more than a full segment
                            for (var i = selectedScriptIndex; i < script.length; i++) {
                                if (newTime < script[i].end_time) {
                                    selectedScriptIndex = i;
                                    page.updateSelectedSubtitle();
                                    break;
                                }
                            }
                        } else {
                            page.updateSelectedSubtitle();
                        }
                    } else if (newTime < currentScriptStartTime) {
                        //decrement selected index
                        selectedScriptIndex--;

                        if (newTime < script[selectedScriptIndex].start_time) {
                            //playhead moved back more than a full segment
                            for (var i = selectedScriptIndex - 1; i > -1; i--) {
                                if (newTime < script[i].end_time) {
                                    selectedScriptIndex = i;
                                }
                            }
                            page.updateSelectedSubtitle();
                        } else {
                            page.updateSelectedSubtitle();
                        }
                    }
                }
            });

            //app bar controls
            appBar = KA.id('appBar');
            KA.id('cmdDownload').addEventListener('MSPointerDown', function (e) {
                if (page.video != null) {
                    KA.Downloads.downloadVideo(page.video.id, page.video.vidUrl);
                }
            });
            KA.id('cmdDelete').addEventListener('MSPointerDown', function (e) {
                if (page.video != null) {
                    KA.Downloads.deleteVideo(page.video.id).done(function () {
                        page.toggleDownloadCmd(true);
                    }, function (err) {
                        console.log(err);
                    });
                }
            });

            var videoDownload = KA.id('videoDownload');
            videoDownload.addEventListener('MSPointerDown', function (e) {
                if (page.video != null) {
                    if (e.pointerType == e.MSPOINTER_TYPE_MOUSE) {
                        KA.Downloads.downloadVideo(page.video.id, page.video.vidUrl);
                    } else if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                        WinJS.Utilities.addClass(e.currentTarget, "touchShade");
                    }
                }
            });
            videoDownload.addEventListener('MSPointerUp', function (e) {
                if (page.video != null) {
                    if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                        WinJS.Utilities.removeClass(e.currentTarget, "touchShade");
                        KA.Downloads.downloadVideo(page.video.id, page.video.vidUrl);
                    }
                }
            });
            videoDownload.addEventListener('MSPointerOut', KA.handleMSPointerOut);

            var videoDelete = KA.id('videoDelete');
            videoDelete.addEventListener('MSPointerDown', function (e) {
                if (page.video != null) {
                    if (e.pointerType == e.MSPOINTER_TYPE_MOUSE) {
                        KA.Downloads.deleteVideo(page.video.id).done(function () {
                            page.toggleDownloadCmd(true);
                        }, function (err) {
                            console.log(err);
                        });
                    } else if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                        WinJS.Utilities.addClass(e.currentTarget, "touchShade");
                    }
                }
            });
            videoDelete.addEventListener('MSPointerUp', function (e) {
                if (page.video != null) {
                    if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                        WinJS.Utilities.removeClass(e.currentTarget, "touchShade");
                        KA.Downloads.deleteVideo(page.video.id).done(function () {
                            page.toggleDownloadCmd(true);
                        }, function (err) {
                            console.log(err);
                        });
                    }
                }
            });
            videoDelete.addEventListener('MSPointerOut', KA.handleMSPointerOut);

            KA.id('tutDownload').addEventListener('MSPointerDown', function (e) {
                if (page.parent != null && page.parent.children != null && page.parent.children.length > 0) {
                    var vid;
                    for (var i = 0; i < page.parent.children.length; i++) {
                    //for (var i = 0; i < 4; i++) {
                        vid = KA.Data.getVideo(page.parent.children[i].id);
                        if (vid != null) {
                            KA.Downloads.downloadVideo(vid.id, vid.vidUrl);
                        }
                    }
                    KA.id('tutDownload').style.opacity = '0.2';
                }
            });            

            //once initialized render controls
            page.renderControls();
        },

        renderControls: function () {
            //ensure video object
            if (this.video != null) {
                //clear previous video, image and offline status
                if (isTmbShown) {
                    WinJS.UI.Animation.fadeOut(tmbDiv);
                }
                vidPlayer.src = '';
                script = null;
                selectedScriptIndex = -1;
                KA.show(vidPlayer);
                KA.hide(KA.id('offlineDiv'));

                //reset status variables
                isTmbShown = true;
                isPlaying = false;
                isDwldShown = false;
                isAutoAdvanced = true;

                //check download status
                isVideoDownloaded = KA.Downloads.isVideoDownloaded(page.video.id);

                if (isVideoDownloaded) {
                    KA.hide(downloadProgress);
                    page.toggleDownloadCmd(false);
                } else if (isConnected && KA.Downloads.isVideoDownloadInProgress(this.video.id)) {
                    page.showNewDownloadStarted();
                    page.toggleDownloadCmd(true);
                } else {
                    KA.hide(downloadProgress);
                    page.toggleDownloadCmd(true);
                }

                //set text values
                KA.id('pageTitle').innerText = this.video.title;
                if (this.video.description) {
                    KA.id('pageDesc').innerHTML = this.video.description;
                    KA.show(KA.id('pageDescDivider'));
                } else {
                    KA.id('pageDesc').innerHTML = '';
                    KA.hide(KA.id('pageDescDivider'));
                }

                //show video, image
                if (isConnected) {
                    //use remote files
                    vidPlayer.src = this.video.vidUrl;
                    var img = new Image();
                    img.onload = function () {
                        page.showImage(page.video.imgHiUrl);
                    }
                    img.src = this.video.imgHiUrl;
                } else {
                    if (isVideoDownloaded) {
                        //use local files
                        vidPlayer.src = 'ms-appdata:///local/videos/' + page.video.id + '.mp4';
                        page.showImage('ms-appdata:///local/photos/' + page.video.id + '.jpg');
                    } else {
                        //show offline warning                        
                        KA.hide(vidPlayer);
                        page.showImage('/images/offline_image_full.png');
                        KA.show(KA.id('offlineDiv'));
                    }
                }

                //get transcript
                KA.Downloads.getTranscript(page.video, isVideoDownloaded).done(page.renderTranscript);

                if (firstRun) {
                    //check if parent object was passed during page init
                    if (page.parent && page.parent.children.length > 1) {
                        page.renderVideoList();
                    } else {
                        KA.hide(KA.id('tutDiv'));
                    }
                    firstRun = false;
                } else {
                    //update the list to show new selected video
                    var items = WinJS.Utilities.query(".tutItem");
                    for (var i = 0; i < items.length; i++) {
                        if (items[i].attributes['data-id'] == page.video.id) {
                            curIndex = i;
                            WinJS.Utilities.addClass(items[i], 'selected');
                        } else {
                            WinJS.Utilities.removeClass(items[i], 'selected');
                        }
                    }
                }
            }
        },

        renderTranscript: function (transcript) {
            if (transcript != null && transcript.length > 0 && transcript[0].start_time > -1) {
                script = transcript;                
                KA.show(transcriptDiv);
                KA.hide(noTranscriptDiv);

                //restart script selection
                selectedScriptIndex = 0;                

                //clear children
                transcriptDiv.scrollTop = 0;
                transcriptList.innerHTML = '';                
                subTitleBlocks = null;

                //add new children
                var item, timeDiv, textDiv;
                for (var i = 0; i < script.length; i++) {
                    item = document.createElement('div');
                    if (i == selectedScriptIndex) {
                        item.className = 'transcriptItem selected';
                    } else {
                        item.className = 'transcriptItem';
                    }
                    item.setAttribute('data-index', i);
                    item.addEventListener('MSPointerUp', function (e) {
                        var itemIndex = parseInt(e.currentTarget.getAttribute('data-index'), 10);                        
                        vidPlayer.currentTime = script[itemIndex].start_time / 1000;
                        isAutoAdvanced = true;
                        e.cancelBubble = true;

                        if (!isPlaying) {
                            vidPlayer.play();
                            isPlaying = true;
                        }
                    });

                    timeDiv = document.createElement('div');
                    timeDiv.className = 'time';
                    timeDiv.innerHTML = KA.millisecondsToMediaTime(script[i].start_time);
                    item.appendChild(timeDiv);

                    textDiv = document.createElement('div');
                    textDiv.className = 'text';
                    textDiv.innerHTML = script[i].text;
                    item.appendChild(textDiv);

                    transcriptList.appendChild(item);
                }

                subTitleBlocks = WinJS.Utilities.query('.transcriptItem', transcriptList);
                page.updateSelectedSubtitle();
            } else {
                KA.hide(transcriptDiv);
                KA.show(noTranscriptDiv);
            }
        },

        renderVideoList: function () {
            KA.id('tutTitle').innerText = page.parent.title;
            KA.id('tutTitleBgd').className = page.parent.domainId + '-subject';
            var tutDownload = KA.id('tutDownload');

            var tutList = KA.id('tutList'), tutItem;
            var allVideosDownloaded = true;
            for (var i = 0; i < page.parent.children.length; i++) {
                if(allVideosDownloaded){
                    allVideosDownloaded = KA.Downloads.isVideoDownloaded(page.parent.children[i].id);
                }
                tutItem = document.createElement("div");
                tutItem.attributes['data-id'] = page.parent.children[i].id;
                tutItem.attributes['data-index'] = i;
                if (page.parent.children[i].id == page.video.id) {
                    curIndex = i;
                    tutItem.className = 'selected tutItem';
                } else {
                    tutItem.className = 'tutItem';
                }
                tutItem.innerHTML = page.parent.children[i].title;

                tutItem.addEventListener('MSPointerDown', function (e) {
                    if (e.pointerType == e.MSPOINTER_TYPE_MOUSE) {
                        if (curIndex != e.currentTarget.attributes['data-index']) {
                            var vidId = e.currentTarget.attributes['data-id'];
                            switch (page.parent.type) {
                                case KA.ObjectType.subject:
                                    page.video = KA.Data.getVideoInSubject(page.parent.id, vidId);
                                    break;
                                case KA.ObjectType.topic:
                                    page.video = KA.Data.getVideoInTopic(page.parent.id, vidId);
                                    break;
                                case KA.ObjectType.tutorial:
                                    page.video = KA.Data.getVideoInTutorial(page.parent.id, vidId);
                                    break;
                            }
                            page.renderControls();
                        }
                    }
                });

                tutItem.addEventListener('MSPointerUp', function (e) {
                    if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                        if (curIndex != e.currentTarget.attributes['data-index']) {
                            var vidId = e.currentTarget.attributes['data-id'];
                            switch (page.parent.type) {
                                case KA.ObjectType.subject:
                                    page.video = KA.Data.getVideoInSubject(page.parent.id, vidId);
                                    break;
                                case KA.ObjectType.topic:
                                    page.video = KA.Data.getVideoInTopic(page.parent.id, vidId);
                                    break;
                                case KA.ObjectType.tutorial:
                                    page.video = KA.Data.getVideoInTutorial(page.parent.id, vidId);
                                    break;
                            }
                            page.renderControls();
                        }
                    }
                });

                tutList.appendChild(tutItem);
            }

            if (allVideosDownloaded) {
                tutDownload.style.opacity = '0.2';
            }

            tutDownload.title = 'Download all ' + page.parent.children.length + ' videos in this list';
        },

        showDownloadProgress: function () {
            if (!isDwldShown) {
                KA.show(downloadProgress);                
                isDwldShown = true;
            }
        },

        showImage: function (imgUrl) {
            if (isTmbShown) {
                tmbDiv.style.display = 'block';
                tmbDiv.style.opacity = '0';
                tmbDiv.style.backgroundImage = 'url(' + imgUrl + ')';
                WinJS.UI.Animation.fadeIn(tmbDiv);
            }
        },

        showNewDownloadStarted: function(){
            downloadProgress.value = 0;
            page.showDownloadProgress();
        },

        toggleDownloadCmd: function (isEnabled) {
            var cmdDownload = KA.id('cmdDownload');
            //ensure page is still up when download completes
            if(cmdDownload){
                if (isEnabled) {
                    //video can be downloaded
                    cmdDownload.winControl.disabled = false;
                    appBar.winControl.hideCommands(['cmdDelete']);
                    KA.show(KA.id('videoDownload'));
                    KA.hide(KA.id('videoDelete'));
                } else {
                    //video has already been downloaded
                    cmdDownload.winControl.disabled = true;
                    appBar.winControl.showCommands(['cmdDelete']);
                    KA.hide(KA.id('videoDownload'));
                    KA.show(KA.id('videoDelete'));
                }
            }
        },

        togglePlayPause: function () {
            if (isPlaying) {
                vidPlayer.pause();
            } else {
                vidPlayer.play();
            }
        },

        updateSelectedSubtitle: function () {
            var subTitle = script[selectedScriptIndex];
            if (subTitle) {
                nextScriptEndTime = subTitle.end_time;
                if (selectedScriptIndex > 0) {
                    currentScriptStartTime = subTitle.start_time;
                } else {
                    currentScriptStartTime = 0;
                }

                //clear past selection
                if (subTitleBlocks && previousScriptIndex > -1 && subTitleBlocks[previousScriptIndex]) {
                    WinJS.Utilities.removeClass(subTitleBlocks[previousScriptIndex], "selected");
                }

                //add new selection
                var newSubTitleBlock = subTitleBlocks[selectedScriptIndex];
                WinJS.Utilities.addClass(newSubTitleBlock, "selected");
                
                if (isAutoAdvanced && selectedScriptIndex > 2) {
                    newSubTitleBlock = subTitleBlocks[selectedScriptIndex - 2];
                    transcriptDiv.scrollTop = (newSubTitleBlock.offsetTop - transcriptList.offsetTop);
                }

                previousScriptIndex = selectedScriptIndex;
            }
        },

        //page event functions
        ready: function (element, options) {
            page = this;
            WinJS.UI.processAll().then(function () {
                if (options.video) {
                    page.video = options.video;
                    if (page.video.parents && page.video.parents.length > 0) {
                        switch (page.video.parents.length) {
                            case 2:
                                //subject
                                page.parent = KA.Data.getSubject(page.video.parents[1]);
                                break;
                            case 3:
                                //topic
                                page.parent = KA.Data.getTopic(page.video.parents[1], page.video.parents[2]);
                                break;
                            case 4:
                                //tutorial
                                page.parent = KA.Data.getTutorial(page.video.parents[1], page.video.parents[2], page.video.parents[3]);
                                break;

                        }
                    }
                    page.initControls();
                } else {
                    console.log('videoPage: video id not passed');
                }

                //download events
                WinJS.Application.addEventListener("newDownloadStarted", page.handleNewDownloadStarted);
                WinJS.Application.addEventListener("downloadProgress", page.handleDownloadProgress);
                WinJS.Application.addEventListener("downloadComplete", page.handleDownloadComplete);

                //share event
                var dataTransferManager = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
                dataTransferManager.addEventListener("datarequested", page.dataRequested);
            });
        },

        unload: function () {
            WinJS.Application.removeEventListener("newDownloadStarted", page.handleNewDownloadStarted);
            WinJS.Application.removeEventListener("downloadProgress", page.handleDownloadProgress);
            WinJS.Application.removeEventListener("downloadComplete", page.handleDownloadComplete);

            var dataTransferManager = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
            dataTransferManager.removeEventListener("datarequested", page.dataRequested);
        }
    });
})();
