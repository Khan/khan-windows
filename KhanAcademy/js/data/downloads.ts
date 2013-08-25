module KA {
    'use strict';
    var app = WinJS.Application;

    var service: Downloads;
    var downloadedVideos: VideoDownload[] = [];
    var trackedDownloads: TrackedDownload[] = [];
    var downloadOperations: DownloadOperation[] = [];
    var savedDateFileName = 'tracked.json';

    export class Downloads {
        deleteVideo(videoId) {
            return new WinJS.Promise(function (complete, error) {
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
                                complete();
                            }, error);
                        } else {
                            complete();
                        }
                    });
                });
            });
        }

        downloadVideo(videoId, videoUrl) {
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
                videoFound = this.isVideoDownloaded(videoId);
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
        }

        getDownloadedVideoCount() {
            return downloadedVideos.length;
        }

        getDownloadedVideoList(maxCount?) {
            if (maxCount && downloadedVideos.length > maxCount) {
                return downloadedVideos.slice(0, maxCount);
            } else {
                return downloadedVideos;
            }
        }

        getTranscript(video, isVideoDownloaded) {
            return new WinJS.Promise(function (complete, error) {
                if (KA.Settings.isInDesigner) {
                    var url = new Windows.Foundation.Uri("ms-appx:///transcript.json");
                    Windows.Storage.StorageFile.getFileFromApplicationUriAsync(url).then(function (file) {
                        Windows.Storage.FileIO.readTextAsync(file).then(function (text) {
                            complete(JSON.parse(text));
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
                                        complete(JSON.parse(text));
                                    } else {
                                        complete();
                                    }
                                });
                            }, function (err) {
                                //as a backup, grab it from the web
                                service.getTranscriptFromWeb(video).done(complete, error);
                            });
                        });
                    } else {
                        service.getTranscriptFromWeb(video).done(complete, error);
                    }
                }
            });
        }

        getTranscriptFromWeb(video) {
            return new WinJS.Promise(function (complete, error) {
                //check to see if transcript has been cached in temporary
                var scriptFileName = video.id + '.script';

                app.temp.folder.getFileAsync(scriptFileName).done(
                    function (file) {
                        //file exists in cache
                        Windows.Storage.FileIO.readTextAsync(file).then(function (text) {
                            if (text != '') {
                                complete(JSON.parse(text));
                            } else {
                                complete();
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
                                    complete(JSON.parse(result.responseText));
                                } else {
                                    complete();
                                }
                            }
                        }, function (err2) {
                            KA.logError(err2);
                            if (error) {
                                error();
                            }
                        });
                    });
            });
        }

        static init() {
            service = new Downloads();
            return new WinJS.Promise(function (complete, error) {
                //load tracked video downloads
                app.local.exists(savedDateFileName).done(function (fileExists) {
                    if (fileExists) {
                        app.local.readText(savedDateFileName).done(function (text) {
                            //rehydrate data
                            var savedData = JSON.parse(text);
                            trackedDownloads = savedData.trackedDownloads;
                            service.loadDownloadedVideos().done(complete, error);
                        });
                    } else {
                        service.loadDownloadedVideos().done(complete, error);
                    }
                });
            });
        }

        static recordNewDownload(videoId, guid) {
            service.recordNewDownload(videoId, guid);
        }

        static recordProgress(guid, bytes, total) {
            service.recordProgress(guid, bytes, total);
        }

        static recordDownloadSuccess(guid) {
            service.recordDownloadSuccess(guid);
        }

        static save() {
            return service.save();
        }

        static getDownloadedVideoCount() {
            return service.getDownloadedVideoCount();
        }

        static getDownloadedVideoList(maxCount?: number) {
            return service.getDownloadedVideoList(maxCount);
        }

        static isVideoDownloaded(videoId: string) {
            return service.isVideoDownloaded(videoId);
        }

        static deleteVideo(videoId) {
            return service.deleteVideo(videoId);
        }

        static downloadVideo(videoId, videoUrl) {
            service.downloadVideo(videoId, videoUrl);
        }

        static isVideoDownloadInProgress(videoId) {
            return service.isVideoDownloadInProgress(videoId);
        }

        static getTranscript(video, isVideoDownloaded) {
            return service.getTranscript(video, isVideoDownloaded);
        }

        isVideoDownloaded(videoId) {
            var result = false;

            for (var i = 0; i < downloadedVideos.length; i++) {
                if (downloadedVideos[i].videoId == videoId) {
                    result = true;
                    break;
                }
            }

            return result;
        }

        isVideoDownloadInProgress(videoId) {
            var result = false;

            for (var i = 0; i < trackedDownloads.length; i++) {
                if (trackedDownloads[i].videoId == videoId) {
                    result = true;
                    break;
                }
            }

            return result;
        }

        loadDownloadedVideos() {
            return new WinJS.Promise(function (complete, error) {
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
                            { return +(b.dateDownloaded) - +(a.dateDownloaded) }
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

                        complete();
                    });
                }, function (err) {
                    console.log('downloads.init: error creating videos folder');
                    complete();
                });
            });
        }

        recordDownloadSuccess(guid) {
            trackedDownloads.forEach(function (trackInfo, index) {
                if (trackInfo.guid == guid) {

                    //grab accompanying image
                    var video = KA.Data.getVideo(trackInfo.videoId);
                    var imgUri = new Windows.Foundation.Uri(video.imgUrl);
                    app.local.folder.getFolderAsync('photos').done(function (folder) {
                        folder.createFileAsync(video.id + '.jpg', Windows.Storage.CreationCollisionOption.replaceExisting).done(function (newFile) {
                            //not tracking because files are so small
                            var downloader = new Windows.Networking.BackgroundTransfer.BackgroundDownloader();
                            var download = downloader.createDownload(imgUri, newFile);
                            download.startAsync();
                        })
                    });

                    //grab accompanying transcript
                    var uri = new Windows.Foundation.Uri('http://khanacademy.org/api/v1/videos/' + video.youTubeId + '/transcript');
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
        }

        recordNewDownload(videoId, guid) {
            trackedDownloads.push({ videoId: videoId, guid: guid });
            app.queueEvent({ type: "newDownloadStarted", videoId: videoId });
        }

        recordProgress(guid, bytes, total) {
            trackedDownloads.forEach(function (trackInfo, index) {
                if (trackInfo.guid == guid) {
                    app.queueEvent({ type: "downloadProgress", videoId: trackInfo.videoId, bytes: bytes, total: total });
                }
            });
        }

        save() {
            return new WinJS.Promise(function (c, e) {
                //save data
                var content = JSON.stringify({ trackedDownloads: trackedDownloads });
                app.local.writeText(savedDateFileName, content).done(c, e);
            });
        }
    }

    // Class associated with each download.
    class DownloadOperation {
        private download: Windows.Networking.BackgroundTransfer.DownloadOperation = null;
        private promise = null;
        private videoStream = null;

        start(uri, videoId) {
            app.local.folder.getFolderAsync('videos').done(folder => {
                folder.createFileAsync(videoId + '.mp4', Windows.Storage.CreationCollisionOption.replaceExisting).done(newFile => {
                    var downloader = new Windows.Networking.BackgroundTransfer.BackgroundDownloader();

                    // Create a new download operation.
                    this.download = downloader.createDownload(uri, newFile);
                    KA.Downloads.recordNewDownload(videoId, this.download.guid);

                    console.log("Using URI: " + uri.absoluteUri + ', download guid: ' + this.download.guid);

                    // Start the download and persist the promise to be able to cancel the download
                    this.promise = this.download.startAsync().done(() => { this.complete(); }, error => { this.error(error); }, () => { this.progress(); });
                }, this.error);
            });
        }

        // On application activation, reassign callbacks for a download
        // operation persisted from previous application state.
        load(loadedDownload) {
            this.download = loadedDownload;
            console.log("Found download: " + this.download.guid + " from previous application run.");
            this.promise = this.download.attachAsync().then(() => { this.complete(); }, error => { this.error(error); }, () => { this.progress(); });
        }

            // Cancel download.
        cancel() {
            if (this.promise) {
                this.promise.cancel();
                this.promise = null;
                console.log("Canceling download: " + this.download.guid);
                if (this.videoStream) {
                    this.videoStream.close();
                    this.videoStream = null;
                }
            }
            else {
                console.log("Download " + this.download.guid + " already canceled.");
            }
        }

            // Resume download - download will restart if server does not allow range-requests.
        resume() {
            if (this.download) {
                if (this.download.progress.status === Windows.Networking.BackgroundTransfer.BackgroundTransferStatus.pausedByApplication) {
                    this.download.resume();
                    console.log("Resuming download: " + this.download.guid);
                }
                else {
                    console.log("Download " + this.download.guid + " is not paused, it may be running, completed, canceled or in error.");
                }
            }
        }

            // Pause download.
        pause() {
            if (this.download) {
                if (this.download.progress.status === Windows.Networking.BackgroundTransfer.BackgroundTransferStatus.running) {
                    this.download.pause();
                    console.log("Pausing download: " + this.download.guid);
                }
                else {
                    console.log("Download " + this.download.guid + " is not running, it may be paused, completed, canceled or in error.");
                }
            }
        }

        // Returns true if this is the download identified by the guid.
        hasGuid(guid) {
            return this.download.guid === guid;
        }

        // Removes download operation from global array.
        removeDownload(guid) {
            downloadOperations.forEach(function (operation, index) {
                if (operation.hasGuid(guid)) {
                    downloadOperations.splice(index, 1);
                }
            });
        }

        // Progress callback.
        progress() {
            console.log('progress, download guid: ' + this.download.guid);
            var currentProgress = this.download.progress;
            if (currentProgress.bytesReceived != undefined && currentProgress.totalBytesToReceive != undefined) {
                console.log('progress:: bytes: ' + currentProgress.bytesReceived + ' / total: ' + currentProgress.totalBytesToReceive);
                KA.Downloads.recordProgress(this.download.guid, currentProgress.bytesReceived, currentProgress.totalBytesToReceive);
            }

            // Handle various pause status conditions.
            if (currentProgress.status === Windows.Networking.BackgroundTransfer.BackgroundTransferStatus.pausedByApplication) {
                console.log("Download " + this.download.guid + " paused by application");
            } else if (currentProgress.status === Windows.Networking.BackgroundTransfer.BackgroundTransferStatus.pausedCostedNetwork) {
                console.log("Download " + this.download.guid + " paused because of costed network");
            } else if (currentProgress.status === Windows.Networking.BackgroundTransfer.BackgroundTransferStatus.pausedNoNetwork) {
                console.log("Download " + this.download.guid + " paused because network is unavailable.");
            }
        }

        // Completion callback.
        complete() {
            this.removeDownload(this.download.guid);

            try {
                //var responseInfo = download.getResponseInformation();
                //console.log(download.guid + " - download complete. Status code: " + responseInfo.statusCode);
                KA.Downloads.recordDownloadSuccess(this.download.guid);
            } catch (err) {
                console.log(err);
            }
        }

        // Error callback.
        error(err) {
            if (this.download) {
                this.removeDownload(this.download.guid);
                console.log(this.download.guid + " - download completed with error.");
            }
            console.log(err);
        }
    }
}