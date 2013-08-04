/// <reference path="//Microsoft.WinJS.1.0/js/base.js" />
/// <reference path="//Microsoft.WinJS.1.0/js/ui.js" />
/// <reference path="/js/base.js" />
/// <reference path="/js/settings.js" />

(function () {
    'use strict';
    var app = WinJS.Application;

    var service;
    var downloadedVideos = [];
    var trackedDownloads = [];
    var downloadOperations = [];
    var savedDateFileName = 'tracked.json';

    WinJS.Namespace.define("KA.Downloads", {

        deleteVideo: function (videoId) {
            return new WinJS.Promise(function (c, e) {
                var fileName = videoId + '.mp4';
                var photoFileName = videoId + '.jpg';
                var scriptFileName = videoId + '.json';
                app.local.folder.getFolderAsync('videos').done(function (folder) {
                    folder.getFileAsync(fileName).done(function (file) {
                        if (file) {
                            file.deleteAsync().done(function () {
                                //update in memory list
                                downloadedVideos.forEach(function (vidInfo, index) {
                                    if (vidInfo.videoId == videoId) {
                                        downloadedVideos.splice(index, 1);
                                    }
                                });

                                //delete accompanying image
                                app.local.folder.getFolderAsync('photos').done(function (photoFolder) {
                                    photoFolder.getFileAsync(photoFileName).done(function (photoFile) {
                                        if (photoFile) {
                                            photoFile.deleteAsync();
                                        }
                                    }, function (err) {
                                        KA.logError(err);
                                    })
                                });

                                //delete accompanying script
                                app.local.folder.getFolderAsync('scripts').done(function (scriptFolder) {
                                    scriptFolder.getFileAsync(scriptFileName).done(function (scriptFile) {
                                        if (scriptFile) {
                                            scriptFile.deleteAsync();
                                        }
                                    }, function (err) {
                                        KA.logError(err);
                                    })
                                });
                                c();
                            }, e);                            
                        } else {
                            c();
                        }
                    });
                });
            });
        },

        downloadVideo: function (videoId, videoUrl) {
            var videoFound = false;

            //check to make sure its not already downloading
            for (var i = 0; i < trackedDownloads.length; i++) {
                if (trackedDownloads[i].videoId == videoId) {
                    videoFound = true;
                    break;
                }
            }

            //check previously downloaded videos
            if (!videoFound) {
                videoFound = service.isVideoDownloaded(videoId);
            }

            if (!videoFound) {
                var newDownload = new DownloadOperation();
                var uri;
                try {
                    uri = new Windows.Foundation.Uri(videoUrl);
                } catch (error) {
                    console.log("Error: Invalid URI. " + error.message);
                    return;
                }

                newDownload.start(uri, videoId);

                // Persist the download operation in the global array.
                downloadOperations.push(newDownload);
            }
        },

        getDownloadedVideoCount: function () {
            return downloadedVideos.length;
        },

        getDownloadedVideoList: function (maxCount) {
            if (maxCount && downloadedVideos.length > maxCount) {
                return downloadedVideos.slice(0, maxCount);
            } else {
                return downloadedVideos;
            }
        },

        getTranscript: function (video, isVideoDownloaded) {
            return new WinJS.Promise(function (c, e) {
                if (KA.Settings.isInDesigner) {
                    var url = new Windows.Foundation.Uri("ms-appx:///transcript.json");
                    Windows.Storage.StorageFile.getFileFromApplicationUriAsync(url).then(function (file) {
                        Windows.Storage.FileIO.readTextAsync(file).then(function (text) {
                            c(JSON.parse(text));
                        }, function (err) {
                            KA.logError(err);
                        });
                    }, function (err) {
                        KA.logError(err);
                    });
                } else {
                    if (isVideoDownloaded) {
                        //script should have been downloaded with video
                        var scriptFileName = video.id + '.json';

                        app.local.folder.getFolderAsync('scripts').done(function (folder) {
                            folder.getFileAsync(scriptFileName).done(function (file) {
                                Windows.Storage.FileIO.readTextAsync(file).then(function (text) {
                                    if (text != undefined && text != '') {
                                        c(JSON.parse(text));
                                    } else {
                                        c();
                                    }
                                });
                            }, function (err) {
                                //as a backup, grab it from the web
                                service.getTranscriptFromWeb(video).done(c, e);
                            });
                        });
                    } else {
                        service.getTranscriptFromWeb(video).done(c, e);
                    }
                }
            });
        },

        getTranscriptFromWeb: function(video){
            return new WinJS.Promise(function (c, e) {
                //check to see if transcript has been cached in temporary
                var scriptFileName = video.id + '.script';

                app.temp.folder.getFileAsync(scriptFileName).done(
                    function (file) {
                        //file exists in cache
                        Windows.Storage.FileIO.readTextAsync(file).then(function (text) {
                            if (text != '') {
                                c(JSON.parse(text));
                            } else {
                                c();
                            }
                        });
                    }, function (err) {
                        //file does not exist in cache, go to web to find it
                        var transcriptUrl = 'http://khanacademy.org/api/v1/videos/' + video.youTubeId + '/transcript';
                        WinJS.xhr({ url: transcriptUrl }).done(function (result) {
                            if (result.status === 200) {
                                //store in temp folder
                                app.temp.writeText(scriptFileName, result.responseText)

                                //send back results
                                if (result.responseText != '') {
                                    c(JSON.parse(result.responseText));
                                } else {
                                    c();
                                }
                            }
                        }, function (err2) {
                            KA.logError(err2);
                            if (e) {
                                e();
                            }
                        });
                });
            });
        },        

        init: function () {
            service = this;
            return new WinJS.Promise(function (c, e) {
                //load tracked video downloads
                app.local.exists(savedDateFileName).done(function (fileExists) {
                    if (fileExists) {
                        app.local.readText(savedDateFileName).done(function (text) {
                            //rehydrate data
                            var savedData = JSON.parse(text);
                            trackedDownloads = savedData.trackedDownloads;
                            service.loadDownloadedVideos().done(c, e);
                        });
                    } else {
                        service.loadDownloadedVideos().done(c, e);
                    }
                });
            });
        },        

        isVideoDownloaded: function (videoId) {
            var result = false;

            for (var i = 0; i < downloadedVideos.length; i++) {
                if (downloadedVideos[i].videoId == videoId) {
                    result = true;
                    break;
                }
            }

            return result;
        },

        isVideoDownloadInProgress: function (videoId) {
            var result = false;

            for (var i = 0; i < trackedDownloads.length; i++) {
                if (trackedDownloads[i].videoId == videoId) {
                    result = true;
                    break;
                }
            }

            return result;
        },

        loadDownloadedVideos: function(){
            return new WinJS.Promise(function (c, e) {
                //verify photos and scripts folder exists
                app.local.folder.createFolderAsync('photos', Windows.Storage.CreationCollisionOption.openIfExists);
                app.local.folder.createFolderAsync('scripts', Windows.Storage.CreationCollisionOption.openIfExists);

                //verify videos folder exists and list downloaded videos
                app.local.folder.createFolderAsync('videos', Windows.Storage.CreationCollisionOption.openIfExists).done(function (folder) {
                    folder.getFilesAsync().done(function (files) {
                        if (files.size > 0) {
                            files.forEach(function (file) {
                                downloadedVideos.push({ videoId: file.name.substring(0, file.name.lastIndexOf('.')), dateDownloaded: file.dateCreated });
                            });
                        }

                        //remove incomplete downloads
                        var cuts = [];
                        for (var i = 0; i < downloadedVideos.length; i++) {
                            for (var j = 0; j < trackedDownloads.length; j++) {
                                if (trackedDownloads[j].videoId == downloadedVideos[i].videoId) {
                                    cuts.push(i);
                                }
                            }
                        }
                        //cut dup videos
                        for (var i = 0; i < cuts.length; i++) {
                            downloadedVideos.splice(cuts[i] - i, 1);
                        }

                        //sort by download date
                        if (downloadedVideos.length > 0) {
                            downloadedVideos.sort(function (a, b)
                            { return b.dateDownloaded - a.dateDownloaded }
                            );
                        }

                        // Enumerate outstanding downloads
                        Windows.Networking.BackgroundTransfer.BackgroundDownloader.getCurrentDownloadsAsync().done(function (downloads) {
                            // If downloads from previous application state exist, reassign callbacks and persist to global array.
                            for (var i = 0; i < downloads.size; i++) {
                                var download = new DownloadOperation();
                                download.load(downloads[i]);
                                downloadOperations.push(download);
                            }
                            console.log("current downloads check done");
                        });

                        c();
                    });
                }, function (err) {
                    console.log('downloads.init: error creating videos folder');
                    c();
                });
            });
        },

        recordDownloadSuccess: function (guid) {
            trackedDownloads.forEach(function (trackInfo, index) {
                if (trackInfo.g == guid) {

                    //grab accompanying image
                    var video = KA.Data.getVideo(trackInfo.videoId);
                    var uri = new Windows.Foundation.Uri(video.imgUrl);
                    app.local.folder.getFolderAsync('photos').done(function (folder) {
                        folder.createFileAsync(video.id + '.jpg', Windows.Storage.CreationCollisionOption.replaceExisting).done(function (newFile) {
                            //not tracking because files are so small
                            var downloader = new Windows.Networking.BackgroundTransfer.BackgroundDownloader();
                            var download = downloader.createDownload(uri, newFile);
                            download.startAsync();
                        })
                    });

                    //grab accompanying transcript
                    uri = new Windows.Foundation.Uri('http://khanacademy.org/api/v1/videos/' + video.youTubeId + '/transcript');
                    app.local.folder.getFolderAsync('scripts').done(function (folder) {
                        folder.createFileAsync(video.id + '.json', Windows.Storage.CreationCollisionOption.replaceExisting).done(function (newFile) {
                            //not tracking because files are so small
                            var downloader = new Windows.Networking.BackgroundTransfer.BackgroundDownloader();
                            var download = downloader.createDownload(uri, newFile);
                            download.startAsync();
                        })
                    });

                    //add to download list and remove from tracking list
                    downloadedVideos.unshift({ videoId: trackInfo.videoId, dateDownloaded: new Date() });
                    trackedDownloads.splice(index, 1);
                    app.queueEvent({ type: "downloadComplete", videoId: trackInfo.videoId });
                }
            });
        },

        recordNewDownload: function (videoId, guid) {
            trackedDownloads.push({ videoId: videoId, g: guid });
            app.queueEvent({ type: "newDownloadStarted", videoId: videoId });
        },

        recordProgress: function (guid, bytes, total) {
            trackedDownloads.forEach(function (trackInfo, index) {
                if (trackInfo.g == guid) {
                    app.queueEvent({ type: "downloadProgress", videoId: trackInfo.videoId, bytes: bytes, total: total });
                }
            });
        },

        save: function(){
            return new WinJS.Promise(function (c, e) {
                //save data
                var content = JSON.stringify({ trackedDownloads: trackedDownloads });
                app.local.writeText(savedDateFileName, content).done(c, e);
            });
        }
    });

    // Class associated with each download.
    function DownloadOperation() {
        var download = null;
        var promise = null;
        var videoStream = null;

        this.start = function (uri, videoId) {
            app.local.folder.getFolderAsync('videos').done(function (folder) {
               folder.createFileAsync(videoId + '.mp4', Windows.Storage.CreationCollisionOption.replaceExisting).done(function (newFile) {
                    var downloader = new Windows.Networking.BackgroundTransfer.BackgroundDownloader();                    

                    // Create a new download operation.
                    download = downloader.createDownload(uri, newFile);
                    KA.Downloads.recordNewDownload(videoId, download.guid);

                    console.log("Using URI: " + uri.absoluteUri + ', download guid: ' + download.guid);

                    // Start the download and persist the promise to be able to cancel the download
                    promise = download.startAsync().done(complete, error, progress);
                }, error);
            });
        };

        // On application activation, reassign callbacks for a download
        // operation persisted from previous application state.
        this.load = function (loadedDownload) {
            download = loadedDownload;
            console.log("Found download: " + download.guid + " from previous application run.");
            promise = download.attachAsync().then(complete, error, progress);
        };

        // Cancel download.
        this.cancel = function () {
            if (promise) {
                promise.cancel();
                promise = null;
                console.log("Canceling download: " + download.guid);
                if (videoStream) {
                    videoStream.close();
                    videoStream = null;
                }
            }
            else {
                console.log("Download " + download.guid + " already canceled.");
            }
        };

        // Resume download - download will restart if server does not allow range-requests.
        this.resume = function () {
            if (download) {
                if (download.progress.status === Windows.Networking.BackgroundTransfer.BackgroundTransferStatus.pausedByApplication) {
                    download.resume();
                    console.log("Resuming download: " + download.guid);
                }
                else {
                    console.log("Download " + download.guid + " is not paused, it may be running, completed, canceled or in error.");
                }
            }
        };

        // Pause download.
        this.pause = function () {
            if (download) {
                if (download.progress.status === Windows.Networking.BackgroundTransfer.BackgroundTransferStatus.running) {
                    download.pause();
                    console.log("Pausing download: " + download.guid);
                }
                else {
                    console.log("Download " + download.guid + " is not running, it may be paused, completed, canceled or in error.");
                }
            }
        };

        // Returns true if this is the download identified by the guid.
        this.hasGuid = function (guid) {
            return download.guid === guid;
        };

        // Removes download operation from global array.
        function removeDownload(guid) {
            downloadOperations.forEach(function (operation, index) {
                if (operation.hasGuid(guid)) {
                    downloadOperations.splice(index, 1);
                }
            });
        }

        // Progress callback.
        function progress() {
            console.log('progress, download guid: ' + download.guid);
            var currentProgress = download.progress;
            if (currentProgress.bytesReceived != undefined && currentProgress.totalBytesToReceive != undefined) {
                console.log('progress:: bytes: ' + currentProgress.bytesReceived + ' / total: ' + currentProgress.totalBytesToReceive);
                KA.Downloads.recordProgress(download.guid, currentProgress.bytesReceived, currentProgress.totalBytesToReceive);
            }

            // Handle various pause status conditions.
            if (currentProgress.status === Windows.Networking.BackgroundTransfer.BackgroundTransferStatus.pausedByApplication) {
                console.log("Download " + download.guid + " paused by application");
            } else if (currentProgress.status === Windows.Networking.BackgroundTransfer.BackgroundTransferStatus.pausedCostedNetwork) {
                console.log("Download " + download.guid + " paused because of costed network");
            } else if (currentProgress.status === Windows.Networking.BackgroundTransfer.BackgroundTransferStatus.pausedNoNetwork) {
                console.log("Download " + download.guid + " paused because network is unavailable.");
            }
        }

        // Completion callback.
        function complete() {
            removeDownload(download.guid);

            try {
                //var responseInfo = download.getResponseInformation();
                //console.log(download.guid + " - download complete. Status code: " + responseInfo.statusCode);
                KA.Downloads.recordDownloadSuccess(download.guid);
            } catch (err) {
                console.log(err);
            }
        }

        // Error callback.
        function error(err) {
            if (download) {
                removeDownload(download.guid);
                console.log(download.guid + " - download completed with error.");
            }
            console.log(err);
        }
    }
})();