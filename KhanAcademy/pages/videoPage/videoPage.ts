/// <reference path="../../js/global.ts" />

module VideoPage {
    "use strict";
    var appBar, vidPlayer, firstRun, curIndex, shadeDiv, isPlaying, isDwldShown, downloadProgress;
    var noTranscriptDiv, transcriptDiv, transcriptList, script, selectedScriptIndex: number, previousScriptIndex, nextScriptEndTime, currentScriptStartTime, subTitleBlocks;
    var isConnected, isVideoDownloaded, isAutoAdvanced;

    var video = null, parent = null;

    function dataRequested(e) {
        var request = e.request;
        if (video) {
            request.data.properties.title = video.title;
            request.data.properties.description = video.description;
            request.data.setUri(new Windows.Foundation.Uri(video.kaUrl));
        } else {
            request.failWithDisplayText('Video not loaded properly, please reload ');
        }
    }

    function handleDownloadComplete(e) {
        if (video && video.id == e.videoId) {
            showDownloadProgress();
            downloadProgress.value = 1;
            WinJS.UI.Animation.fadeOut(downloadProgress).done(function () {
                KA.hide(downloadProgress);
                isDwldShown = false;
                toggleDownloadCmd(false);
            });
        }
    }

    function handleDownloadProgress(e) {
        if (video && video.id == e.videoId) {
            showDownloadProgress();
            downloadProgress.value = (e.bytes / e.total);
        }
    }

    function handleNewDownloadStarted(e) {
        if (video && video.id == e.videoId) {
            showNewDownloadStarted();
        }
    }

    function handleVisibilityChange(e) {
        // Pause the video as soon as visibility changes, otherwise
        // the audio would stop, but the video would continue until suspension.
        if (document.visibilityState === 'hidden') {
            if (isPlaying) {
                vidPlayer.pause();
                vidPlayer.wasPlayingBeforeHide = true;
            }
        } else if (vidPlayer.wasPlayingBeforeHide) {
            delete vidPlayer.wasPlayingBeforeHide;
            vidPlayer.play();
        }
    }

    function initControls() {
        // function called on page load, video playlist clicks
        // just call the renderControls function to refresh the data

        isConnected = KA.Data.getIsConnected();
        firstRun = true;

        //init control variables
        shadeDiv = KA.id('shadeDiv');
        downloadProgress = KA.id('downloadProgress');
        noTranscriptDiv = KA.id('noTranscriptDiv');
        transcriptDiv = KA.id('transcriptDiv');
        transcriptList = KA.id('transcriptList');

        transcriptDiv.addEventListener('MSPointerDown', function (e) {
            //pause auto advancing of scroll because user is dragging scroll bar
            isAutoAdvanced = false;
        });

        //video player
        vidPlayer = KA.id('vidPlayer');
        vidPlayer.addEventListener('play', function (e) {
            isPlaying = true;
        });

        vidPlayer.addEventListener('MSPointerDown', function posterPlay(e) {
            vidPlayer.play();
            vidPlayer.removeEventListener('MSPointerDown', posterPlay);
        });

        vidPlayer.addEventListener('pause', function (e) {
            KA.User.trackPlayback(video.id, vidPlayer.currentTime);
            isPlaying = false;
        });
        vidPlayer.addEventListener('loadedmetadata', function (e) {
            var trackInfo = KA.User.isVideoPlaybackTracked(video.id);
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
                                updateSelectedSubtitle();
                                break;
                            }
                        }
                    } else {
                        updateSelectedSubtitle();
                    }
                } else if (newTime < currentScriptStartTime) {
                    //decrement selected index
                    selectedScriptIndex--;

                    if (!script[selectedScriptIndex] || newTime < script[selectedScriptIndex].start_time) {
                        //playhead moved back more than a full segment
                        for (var i = selectedScriptIndex - 1; i > -1; i--) {
                            if (!script[i] || newTime < script[i].end_time) {
                                selectedScriptIndex = i;
                            }
                        }
                        updateSelectedSubtitle();
                    } else {
                        updateSelectedSubtitle();
                    }
                }
            }
        });

        document.addEventListener("visibilitychange", handleVisibilityChange, true);

        //app bar controls
        appBar = KA.id('appBar');
        KA.id('cmdDownload').addEventListener('MSPointerDown', function (e) {
            if (video != null) {
                KA.Downloads.downloadVideo(video.id, video.vidUrl);
            }
        });
        KA.id('cmdDelete').addEventListener('MSPointerDown', function (e) {
            if (video != null) {
                KA.Downloads.deleteVideo(video.id).done(function () {
                    toggleDownloadCmd(true);
                }, function (err) {
                    console.log(err);
                });
            }
        });

        var videoDownload = KA.id('videoDownload');
        videoDownload.addEventListener('MSPointerDown', function (e: MSPointerEvent) {
            if (video != null) {
                if (e.pointerType == e.MSPOINTER_TYPE_MOUSE) {
                    KA.Downloads.downloadVideo(video.id, video.vidUrl);
                } else if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                    WinJS.Utilities.addClass(e.currentTarget, "touchShade");
                }
            }
        });
        videoDownload.addEventListener('MSPointerUp', function (e: MSPointerEvent) {
            if (video != null) {
                if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                    WinJS.Utilities.removeClass(e.currentTarget, "touchShade");
                    KA.Downloads.downloadVideo(video.id, video.vidUrl);
                }
            }
        });
        videoDownload.addEventListener('MSPointerOut', KA.handleMSPointerOut);

        var videoDelete = KA.id('videoDelete');
        videoDelete.addEventListener('MSPointerDown', function (e: MSPointerEvent) {
            if (video != null) {
                if (e.pointerType == e.MSPOINTER_TYPE_MOUSE) {
                    KA.Downloads.deleteVideo(video.id).done(function () {
                        toggleDownloadCmd(true);
                    }, function (err) {
                        console.log(err);
                    });
                } else if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                    WinJS.Utilities.addClass(e.currentTarget, "touchShade");
                }
            }
        });
        videoDelete.addEventListener('MSPointerUp', function (e: MSPointerEvent) {
            if (video != null) {
                if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                    WinJS.Utilities.removeClass(e.currentTarget, "touchShade");
                    KA.Downloads.deleteVideo(video.id).done(function () {
                        toggleDownloadCmd(true);
                    }, function (err) {
                        console.log(err);
                    });
                }
            }
        });
        videoDelete.addEventListener('MSPointerOut', KA.handleMSPointerOut);

        KA.id('tutDownload').addEventListener('MSPointerDown', function (e) {
            if (parent != null && parent.children != null && parent.children.length > 0) {
                var vid;
                for (var i = 0; i < parent.children.length; i++) {
                    //for (var i = 0; i < 4; i++) {
                    vid = KA.Data.getVideo(parent.children[i].id);
                    if (vid != null) {
                        KA.Downloads.downloadVideo(vid.id, vid.vidUrl);
                    }
                }
                KA.id('tutDownload').style.opacity = '0.2';
            }
        });

        //once initialized render controls
        renderControls();
    }

    function renderControls() {
        //ensure video object
        if (video != null) {
            vidPlayer.src = '';
            script = null;
            selectedScriptIndex = -1;
            KA.show(vidPlayer);
            KA.hide(KA.id('offlineDiv'));

            //reset status variables
            isPlaying = false;
            isDwldShown = false;
            isAutoAdvanced = true;

            //check download status
            isVideoDownloaded = KA.Downloads.isVideoDownloaded(video.id);

            if (isVideoDownloaded) {
                KA.hide(downloadProgress);
                toggleDownloadCmd(false);
            } else if (isConnected && KA.Downloads.isVideoDownloadInProgress(video.id)) {
                showNewDownloadStarted();
                toggleDownloadCmd(true);
            } else {
                KA.hide(downloadProgress);
                toggleDownloadCmd(true);
            }

            //set text values
            KA.id('pageTitle').innerText = video.title;
            if (video.description) {
                KA.id('pageDesc').innerHTML = video.description;
                KA.id('pageDesc').title = video.description;
                KA.show(KA.id('pageDescDivider'));
            } else {
                KA.id('pageDesc').innerHTML = '';
                KA.hide(KA.id('pageDescDivider'));
            }

            //show video, image
            if (isConnected) {
                //use remote files
                vidPlayer.src = video.vidUrl;
                var img = new Image();
                img.onload = function () {
                    showImage(video.imgHiUrl);
                }
                img.src = video.imgHiUrl;
            } else {
                if (isVideoDownloaded) {
                    //use local files
                    vidPlayer.src = 'ms-appdata:///local/videos/' + video.id + '.mp4';
                    showImage('ms-appdata:///local/photos/' + video.id + '.jpg');
                } else {
                    //show offline warning
                    showImage('/images/offline_image_full.png');
                    KA.show(KA.id('offlineDiv'));
                }
            }

            //get transcript
            KA.Downloads.getTranscript(video, isVideoDownloaded).done(renderTranscript, function () {
            });

            if (firstRun) {
                //check if parent object was passed during page init
                if (parent && parent.children.length > 1) {
                    renderVideoList();
                } else {
                    KA.hide(KA.id('tutDiv'));
                }
                firstRun = false;
            } else {
                //update the list to show new selected video
                var items = WinJS.Utilities.query(".tutItem");
                for (var i = 0; i < items.length; i++) {
                    if (items[i].attributes['data-id'] == video.id) {
                        curIndex = i;
                        WinJS.Utilities.addClass(items[i], 'selected');
                    } else {
                        WinJS.Utilities.removeClass(items[i], 'selected');
                    }
                }
            }
        }
    }

    function renderTranscript(transcript) {
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
            updateSelectedSubtitle();
        } else {
            KA.hide(transcriptDiv);
            KA.show(noTranscriptDiv);
        }
    }

    function renderVideoList() {
        KA.id('tutTitle').innerText = parent.title;
        KA.id('tutTitleBgd').className = 'domainItemSubject ' + parent.domainId + '-subject';
        var tutDownload = KA.id('tutDownload');

        var tutList = KA.id('tutList'), tutItem;
        var allVideosDownloaded = true;
        for (var i = 0; i < parent.children.length; i++) {
            if (allVideosDownloaded) {
                allVideosDownloaded = KA.Downloads.isVideoDownloaded(parent.children[i].id);
            }
            tutItem = document.createElement("div");
            tutItem.attributes['data-id'] = parent.children[i].id;
            tutItem.attributes['data-index'] = i;
            if (parent.children[i].id == video.id) {
                curIndex = i;
                tutItem.className = 'selected tutItem';
            } else {
                tutItem.className = 'tutItem';
            }
            tutItem.innerHTML = parent.children[i].title;

            tutItem.addEventListener('MSPointerDown', function (e) {
                if (e.pointerType == e.MSPOINTER_TYPE_MOUSE) {
                    if (curIndex != e.currentTarget.attributes['data-index']) {
                        var vidId = e.currentTarget.attributes['data-id'];
                        switch (parent.type) {
                            case KA.ObjectType.subject:
                                video = KA.Data.getVideoInSubject(parent.id, vidId);
                                break;
                            case KA.ObjectType.topic:
                                video = KA.Data.getVideoInTopic(parent.id, vidId);
                                break;
                            case KA.ObjectType.tutorial:
                                video = KA.Data.getVideoInTutorial(parent.id, vidId);
                                break;
                        }
                        renderControls();
                    }
                }
            });

            tutItem.addEventListener('MSPointerUp', function (e) {
                if (e.pointerType == e.MSPOINTER_TYPE_TOUCH) {
                    if (curIndex != e.currentTarget.attributes['data-index']) {
                        var vidId = e.currentTarget.attributes['data-id'];
                        switch (parent.type) {
                            case KA.ObjectType.subject:
                                video = KA.Data.getVideoInSubject(parent.id, vidId);
                                break;
                            case KA.ObjectType.topic:
                                video = KA.Data.getVideoInTopic(parent.id, vidId);
                                break;
                            case KA.ObjectType.tutorial:
                                video = KA.Data.getVideoInTutorial(parent.id, vidId);
                                break;
                        }
                        renderControls();
                    }
                }
            });

            tutList.appendChild(tutItem);
        }

        if (allVideosDownloaded) {
            tutDownload.style.opacity = '0.2';
        }

        tutDownload.title = 'Download all ' + parent.children.length + ' videos in this list';
    }

    function showDownloadProgress() {
        if (!isDwldShown) {
            // If the download progress was previously faded out with
            // WinJS.UI.Animation.fadeOut , then its opacity is 0.
            downloadProgress.style.opacity = '1';

            KA.show(downloadProgress);
            isDwldShown = true;
        }
    }

    function showImage(imgUrl) {
        vidPlayer.poster = imgUrl;
    }

    function showNewDownloadStarted() {
        downloadProgress.value = 0;
        showDownloadProgress();
    }

    function toggleDownloadCmd(isEnabled) {
        var cmdDownload = KA.id('cmdDownload');
        //ensure page is still up when download completes
        if (cmdDownload) {
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
    }

    function togglePlayPause() {
        if (isPlaying) {
            vidPlayer.pause();
        } else {
            vidPlayer.play();
        }
    }

    function updateSelectedSubtitle() {
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
    }

    //page event functions
    function ready(element, options) {
        WinJS.UI.processAll().then(function () {
            if (options.video) {
                video = options.video;
                if (video.parents && video.parents.length > 0) {
                    switch (video.parents.length) {
                        case 2:
                            //subject
                            parent = KA.Data.getSubject(video.parents[1]);
                            break;
                        case 3:
                            //topic
                            parent = KA.Data.getTopic(video.parents[1], video.parents[2]);
                            break;
                        case 4:
                            //tutorial
                            parent = KA.Data.getTutorial(video.parents[1], video.parents[2], video.parents[3]);
                            break;

                    }
                }
                initControls();
            } else {
                console.log('videoPage: video id not passed');
            }

            //download events
            WinJS.Application.addEventListener("newDownloadStarted", handleNewDownloadStarted);
            WinJS.Application.addEventListener("downloadProgress", handleDownloadProgress);
            WinJS.Application.addEventListener("downloadComplete", handleDownloadComplete);

            //share event
            var dataTransferManager: any = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
            dataTransferManager.addEventListener("datarequested", dataRequested);
        });
    }

    function unload() {
        WinJS.Application.removeEventListener("newDownloadStarted", handleNewDownloadStarted);
        WinJS.Application.removeEventListener("downloadProgress", handleDownloadProgress);
        WinJS.Application.removeEventListener("downloadComplete", handleDownloadComplete);

        var dataTransferManager: any = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
        dataTransferManager.removeEventListener("datarequested", dataRequested);

        document.removeEventListener("visibilitychange", handleVisibilityChange);
    }

    KA.definePage("/pages/videoPage/videoPage.html", ready, unload);
}