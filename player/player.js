/*
TODO:
    prevent default clicks on buttons
    create quality switcher controls for player
    remove ids from controls so that multiple videos can be loaded with working controls
    look into BufferStallErrors (more likely Akamai related)
*/

(function(){ // create enclosed code to prevent collision with other js code

var config = {
          autoStartLoad: true, // (default true)
  	      startPosition : -1, // start at live point (default -1)
          capLevelToPlayerSize: false, // limits renditions based on max frame size (false default)
          debug: false, // set to debug mode (default false)
          initialLiveManifestSize: 1, // number of segments needed to start playback for live (default 1)
              maxBufferHole: 2, // 'Maximum' inter-fragment buffer hole tolerance that hls.js can cope with when searching for the next fragment to load. When switching between quality level, fragments might not be perfectly aligned. This could result in small overlapping or hole in media buffer. This tolerance factor helps cope with this. (default: 0.5 seconds)
          maxSeekHole: 2, // In case playback is stalled, and a buffered range is available upfront, less than maxSeekHole seconds from current media position, hls.js will jump over this buffer hole to reach the beginning of this following buffered range. maxSeekHole allows to configure this jumpable threshold. (default: 2 seconds)
          liveSyncDurationCount: 3, // how many segments back to start from Live (default 3)
          startLevel: undefined, // override start level (rendition) for starting
          startFragPrefetch: false, // Start prefetching start fragment although media not attached yet. (default: false)
          enableWebVTT: true, // enable VTT captions if available
          enableCEA708Captions: true, // enable embedded captions if available
          minAutoBitrate: 0 // Return the capping/min bandwidth value that could be used by automatic level selection algorithm. Useful when browser or tab of the browser is not in the focus and bandwidth drops
  };

function hlsvideo(video) {
    var video = document.getElementById(video);

    // Create Controlbar and insert it before the video element
    // TODO: find a way to automatically wrap the video element.
    video.insertAdjacentHTML('afterend',
        '<div class="controlbar">'+
            '<a href="#" id="play-pause" class="left fa fa-play"></a>'+
            '<a href="#" id="fullscreen" class="right fa fa-arrows-alt"></a>'+
            '<a href="#" id="cc" class="right fa fa-cc" aria-hidden="true"></a>'+
            '<input id="vol-control" type="range" min="0" max="100" step="1" class="right volume" />'+
            '<a href="#" id="sound" class="right fa fa-volume-up" aria-hidden="true"></a>'+
            '<div class="middle">'+
                '<input id="dvr" type="range" min="0" max="100" step="1" value="0" class="dvr" />'+
            '</div>'+
        '</div>'
    );

    if(Hls.isSupported()) {
        var hls = new Hls(config);
        hls.loadSource(video.getAttribute('src'));
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED,function(event, data) {
            console.log(Hls.Events); // log possible events
            console.log(data.levels); // log level / rendition details
            console.log(video.textTracks); // log caption and subtitle tracks
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, function(event, data) {
            // display stats on page
            document.getElementById("current_name").innerHTML = qualityLevels[hls.currentLevel].name;
            document.getElementById("current_bitrate").innerHTML = qualityLevels[hls.currentLevel].bitrate;
            document.getElementById("current_resolution").innerHTML = qualityLevels[hls.currentLevel].width+'x'+qualityLevels[hls.currentLevel].height;
            document.getElementById("current_video_codec").innerHTML = qualityLevels[hls.currentLevel].videoCodec;
            document.getElementById("current_audio_codec").innerHTML = qualityLevels[hls.currentLevel].audioCodec;
            document.getElementById("current_url").innerHTML = qualityLevels[hls.currentLevel].url;
            document.getElementById("current_error").innerHTML = qualityLevels[hls.currentLevel].error;
        });

        hls.on(Hls.Events.FRAG_LOADED,function(event, data) {
            console.log(data); // log frag events
        });

        // not working.  not displaying anything
        hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH,function(event, data) {
            console.log('subtitle =>');
            console.log(data); // log subtitle events
        });

        hls.on(Hls.Events.ERROR, function (event, data) {
            console.log(data);
            if (data.fatal) {
                switch(data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        // try to recover network error
                        console.log("fatal network error encountered, try to recover");
                        hls.startLoad();
                        if(playState == 1){
                            video.play();
                        }
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.log("fatal media error encountered, try to recover");
                        hls.recoverMediaError();
                        if(playState == 1){
                            video.play();
                        }
                        break;
                    default:
                        // cannot recover
                        console.log('this is beyond repair. EJECT!');
                        hls.destroy();
                        break;
                }
            }
        });

    }

    //Create MSE objects
    var qualityLevels;
    var loadonce = 0; // prevent items loading more than once
    video.addEventListener('loadedmetadata', function() {
        document.getElementById("dvr").setAttribute("max", video.duration); // set max attribute for dvr slider
        console.log('video duration: '+video.duration);
        qualityLevels = hls.levels; // HLS Quality Levels
        if(loadonce == 0){
            // create auto quality button TODO: remove after buttons added to player
            var autobtn = document.createElement("button");
            var autotext = document.createTextNode("auto");
            autobtn.appendChild(autotext);
            autobtn.setAttribute("class", "quality");
            autobtn.setAttribute("data-quality-level", -1);
            var autoParentDiv = document.getElementById("external_buttons");
            autoParentDiv.appendChild(autobtn);
            autobtn.addEventListener('click', function(){
                hls.currentLevel = -1;
                console.log("setting quality level to: "+this.getAttribute("data-quality-level"));
            });

            // buttons for each quality level
            var btn_index = 0;
            for (let value of qualityLevels) {
                var btn = document.createElement("button");
                if (typeof value.name != 'undefined'){
                    var text = document.createTextNode(value.name);
                } else {
                    var bitrate_text_calc = value.bitrate / 1000;
                    var bitrate_text = bitrate_text_calc+' kbps';
                    var text = document.createTextNode(bitrate_text);
                }
                btn.appendChild(text);
                btn.setAttribute("class", "quality");
                btn.setAttribute("data-quality-level", btn_index);
                var parentDiv = document.getElementById("external_buttons");
                parentDiv.appendChild(btn);
                btn.addEventListener('click', function(){
                    hls.currentLevel = this.getAttribute("data-quality-level");
                    console.log("setting quality level to: "+this.getAttribute("data-quality-level"));
                });
                btn_index++;
            }
            loadonce = 1;
            console.log('loadonce =  '+loadonce);
        }
    });

    //Play Pause Button toggle and operation
    var playState = 0; // default paused state
    document.getElementById("play-pause").addEventListener("click", function(e){
        if(playState == 0){
            playState = 1;
            e.target.classList.remove('fa-play');
            e.target.classList.add('fa-pause');
            video.play();
        } else {
            playState = 0;
            e.target.classList.remove('fa-pause');
            e.target.classList.add('fa-play');
            video.pause();
        }
    });

    //Sound Button toggle and operation
    var volState = 1; // default sound on
    document.getElementById("sound").addEventListener("click", function(e){
        if(volState == 0){
            volState = 1;
            e.target.classList.remove('fa-volume-off');
            e.target.classList.add('fa-volume-up');
            video.muted = false;
        } else {
            volState = 0;
            e.target.classList.remove('fa-volume-up');
            e.target.classList.add('fa-volume-off');
            video.muted = true;
        }
    });

    //Caption Button toggle and operation
    var capState = 0; // default captions off by default
    document.getElementById("cc").addEventListener("click", function(e){
        if(capState == 0){
            capState = 1;
            e.target.classList.add('selected');
            video.textTracks[0].mode = 'showing';
        } else {
            capState = 0;
            e.target.classList.remove('selected');
            video.textTracks[0].mode = 'hidden';
        }
    });

    // fullscreen button
    document.getElementById("fullscreen").addEventListener("click", function(e){
        // TODO: create controls for other browsers.  Full screen only works in Webkit below
        if (!document.webkitFullscreenElement) {
            video.webkitRequestFullscreen();
        } else {
            document.webkitExitFullscreen();
        }
    });

    // Update the seek bar as the video plays
    video.addEventListener('timeupdate', function() {
        var value = video.currentTime;
        document.getElementById('dvr').value = value;
    });

    document.getElementById('vol-control').addEventListener('input', function(){
        video.volume = this.value / 100;
    });

    document.getElementById('dvr').addEventListener('input', function(){
        video.currentTime = this.value;
    });

} // end hlsvideo


//create players for each video object
var videos = document.getElementsByTagName('video');
for (var i = 0, len = videos.length; i < len; i++) {
      hlsvideo(videos[i].id);
}

}()); // end closure
