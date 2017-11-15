/*
TODO:
    clean-up code (convert vars to const, remove duplicates, es6 function syntax, backtics for logging, possibly move to class
    remove ids from controls so that multiple videos can be loaded with working controls {double check to ensure this is done}
    look into BufferStallErrors (more likely Akamai related)
    set DVR slider off with text as "Live" if duration is <= 30 seconds (number may need to be tested
    work on compatibility wtih Firefox, IE, and Safari
*/

// create enclosed code to prevent collision with other js code
(function () {
const config = {
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
          enableCEA708Captions: true, // enable embedded captions if available (seems its pulling in 608 however)
          minAutoBitrate: 0 // Return the capping/min bandwidth value that could be used by automatic level selection algorithm. Useful when browser or tab of the browser is not in the focus and bandwidth drops
    };

    function createDependencies() { // function created so that it can be moved if necessary
        // TODO: check if already loaded (not needed to load multiple times if multiple players are used)
        let buttoncss = document.createElement("link");
        buttoncss.setAttribute("rel", "stylesheet");
        buttoncss.setAttribute("type", "text/css");
        buttoncss.setAttribute("href", "//maxcdn.bootstrapcdn.com/font-awesome/4.3.0/css/font-awesome.min.css");
        document.getElementsByTagName("head")[0].appendChild(buttoncss);
        let playercss = document.createElement("link");
        playercss.setAttribute("rel", "stylesheet");
        playercss.setAttribute("type", "text/css");
        playercss.setAttribute("href", "player/player.css");
        document.getElementsByTagName("head")[0].appendChild(playercss);
        // document.write('<script src="http://cdn.jsdelivr.net/npm/hls.js@latest" type="text/javascript"></script>');
        // Doesn't work. seems to want to load after the Hls object is required.
        // let hlsjsscript = document.createElement('script');
        // hlsjsscript.setAttribute("type","text/javascript");
        // hlsjsscript.setAttribute("rel","subresource");
        // hlsjsscript.setAttribute("src", "//cdn.jsdelivr.net/npm/hls.js@latest");
        // document.getElementsByTagName("head")[0].appendChild(hlsjsscript);
    } createDependencies(); // create on load

function hlsvideo(v) {
    const video = document.getElementById(v);
    const autoParentDiv = document.getElementById("external_buttons"); // TODO: remove when stats not needed

    // Create Controlbar and insert it before the video element
    // TODO: find a way to automatically wrap the video element in div
    video.insertAdjacentHTML('afterend',
        `<div class="player-settings">
            <div class="container"><h3>Select Quality</h3><ul class="quality-listing"></ul></div>
            <div class="container"><h3>Captions</h3><ul class="caption-listing"></ul></div>
        </div>
        <div class="controlbar">
            <a href="#" class="left fa fa-play play-pause"></a>
            <a href="#" class="right fa fa-arrows-alt fullscreen"></a>
            <a href="#" class="right fa fa-cogs quality"></a>
            <!-- <a href="#" class="right fa fa-cc cc" aria-hidden="true"></a> -->
            <input type="range" min="0" max="100" step="1" class="right volume vol-control" />
            <a href="#" class="right fa fa-volume-up sound" aria-hidden="true"></a>
            <div class="middle">
                <input type="range" min="0" max="100" step="1" value="0" class="dvr" />
            </div>
        </div>`
    );

    // div elements
    const player_div = document.getElementById(video.id).parentNode;
    // quality switcher panel
    const playersettings_div = player_div.getElementsByClassName('player-settings')[0];
    const playersettings_container = playersettings_div.getElementsByClassName('quality-listing')[0];
    const ccsettings_listing = playersettings_div.getElementsByClassName('caption-listing')[0];
    // control elements
    const controlbar = player_div.getElementsByClassName('controlbar')[0];
    const pauseplay_btn = player_div.getElementsByClassName("play-pause")[0];
    const quality_btn = player_div.getElementsByClassName("quality")[0];
    const cc_btn = player_div.getElementsByClassName("cc")[0];
    const sound_btn = player_div.getElementsByClassName("sound")[0];
    const fullscreen_btn = player_div.getElementsByClassName("fullscreen")[0];
    const dvr_slider = player_div.getElementsByClassName("dvr")[0];
    const volume_slider = player_div.getElementsByClassName('vol-control')[0];

    if(Hls.isSupported()) {

        var hls = new Hls(config);
        hls.loadSource(video.getAttribute('src'));
        hls.attachMedia(video); // uncomment if issues arise loading media -> currently set to load on play button click

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            console.log("MANIFEST_PARSED =>");
            console.log(Hls.Events); // log possible events
            console.log(data.levels); // log level / rendition details
            console.log(video.textTracks); // log caption and subtitle tracks
            // console.log(video.textTracks[0].getAttribute('src'));
        });

        // TODO: remove this sectoin eventually
        hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
            // display stats on page
            console.log("LEVEL_SWITCHED =>");
            console.log(qualityLevels[hls.currentLevel]);
        });

        hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
            console.log("FRAG_LOADED =>");
            console.log(data); // log frag events
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
            console.log("ERROR =>");
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
    // TODO: simplify this to work like CC Panel
    var qualityLevels;
    video.addEventListener('loadedmetadata', () => {
        dvr_slider.setAttribute("max", video.duration); // set max attribute for dvr slider
        console.log('video duration: '+video.duration);
        console.log("currentLevel => "+hls.currentLevel); // -1 means auto

        // quality switch panel
        qualityLevels = hls.levels; // HLS Quality Levels
        console.log('loadedmetadata');
        var qautobtn = document.createElement("div"); // TODO: convert to UL LI
        var autotext = document.createTextNode("auto");
        qautobtn.innerHTML = '<a href="#">auto</a>';
        qautobtn.setAttribute("class", "quality");
        qautobtn.setAttribute("data-quality-level", -1);
        playersettings_container.appendChild(qautobtn); // TODO: broken
        qautobtn.addEventListener('click', () => {
            hls.currentLevel = -1;
            console.log("setting quality level to: "+this.getAttribute("data-quality-level"));
            quality_btn.classList.remove('selected');
            playersettings_div.classList.remove('show'); // TODO:  get parent then child of class
            qualityState = 0;
        });
        // buttons for each quality level
        let btn_index = 0;
        for (let value of qualityLevels) {
            var qbtn = document.createElement("div"); // TODO: convert to UL LI
            if (typeof value.name != 'undefined'){
                var text = document.createTextNode(value.name);
            } else {
                var bitrate_text_calc = value.bitrate / 1000;
                var bitrate_text = bitrate_text_calc+' kbps';
                // var text = document.createTextNode(bitrate_text); // TODO: fix this  not being called
            }
            qbtn.innerHTML = '<a href="#">'+bitrate_text+'</a>';
            qbtn.setAttribute("class", "quality");
            qbtn.setAttribute("href", "#");
            qbtn.setAttribute("data-quality-level", btn_index);
            playersettings_container.appendChild(qbtn);
            qbtn.addEventListener('click', () => {
                hls.currentLevel = this.getAttribute("data-quality-level");
                console.log("setting quality level to: "+this.getAttribute("data-quality-level"));
                quality_btn.classList.add('selected');
                playersettings_div.classList.remove('show'); // TODO:  get parent then child of class
                qualityState = 0;
            });
            btn_index++;
        }
    }); // end loaded metadata

    // Create CC Panel
    //TODO: set an CC off button selection
    video.addEventListener('loadeddata', () => { // CC wont display correctly until all data loaded, so this wont work on loadedmetadata
        let cc_index = 0;
        for (let track of video.textTracks) {
            let cctext;
            let ccbtn = document.createElement("div"); // TODO: convert to UL LI
            if (typeof track.label != 'undefined' && track.label != ''){
                cctext = track.label;
            } else if (typeof track.language != 'undefined' && track.language != '') {
                cctext = track.language;
            } else {
                cctext = `unlabled ${track.kind} track`;
            }
            let currLI = document.createElement("li");
            currLI.innerHTML = `<a href="#" data-cc-options="${cc_index}" class="cc-item">${cctext}</a>`;
            ccsettings_listing.appendChild(currLI);
            currLI.addEventListener('click', (e) => {
                let cc_enabledTrack = e.target.getAttribute("data-cc-options");
                video.textTracks[cc_enabledTrack].mode = 'showing';
                console.log(`turning on track: ${cc_enabledTrack}`);
                // cc_btn.classList.add('selected');
                playersettings_div.classList.remove('show'); // TODO:  get parent then child of class
                qualityState = 0;
            });
            cc_index++;
        }
    });


    //Play Pause Button toggle and operation
    var playState = 0; // default paused state
    pauseplay_btn.addEventListener("click", (e) => {
        e.preventDefault();
        if(!hls.media){ //used if you want to keep poster frame up longer
            hls.attachMedia(video);
        }
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
    sound_btn.addEventListener("click", (e) => {
        e.preventDefault();
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

    // //Caption Button toggle and operation
    // var capState = 0; // default captions off by default
    // cc_btn.addEventListener("click", (e) => {
    //     e.preventDefault();
    //     if(capState == 0){
    //         if(video.textTracks.length > 1){ // multiple subtitle tracks
    //             e.target.classList.add('selected');
    //             playersettings_div.classList.add('show');
    //         } else if (video.textTracks.length == 1){ // only one subtitle track
    //             capState = 1;
    //             e.target.classList.add('selected');
    //             video.textTracks[0].mode = 'showing';
    //             console.log('cues =====>');
    //             console.log(video.textTracks[0].cues);
    //         } else { // try to turn on 608 CC tracks if available
    //             console.log("NO CC or subtitles available");
    //         }
    //     } else {
    //         capState = 0;
    //         e.target.classList.remove('selected');
    //         video.textTracks[0].mode = 'hidden';
    //     }
    // });

    //Quality Button toggle and operation
    var qualityState = 0; // default captions off by default
    quality_btn.addEventListener("click", (e) => {
        e.preventDefault();
        if(qualityState == 0){
            qualityState = 1;
            // e.target.classList.add('selected');
            playersettings_div.classList.add('show'); // TODO:  get parent then child of class
            // video.textTracks[0].mode = 'showing';
        } else {
            qualityState = 0;
            // e.target.classList.remove('selected');
            playersettings_div.classList.remove('show'); // TODO:  get parent then child of class
            // video.textTracks[0].mode = 'hidden';
        }
    });

    // fullscreen button
    fullscreen_btn.addEventListener("click", (e) => {
        e.preventDefault();
        // TODO: create controls for other browsers.  Full screen only works in Webkit below
        if (!document.webkitFullscreenElement) {
            video.webkitRequestFullscreen();
            controlbar.setAttribute('style', 'display: none;');

            // video.classList.add('hide-mouse');

            video.addEventListener('mousemove', fullscreenMouse, false);

            function fullscreenMouse (){
                controlbar.setAttribute('style', 'display: block;');
                video.classList.add('show-mouse');
                setTimeout(function() {
                    video.classList.remove('show-mouse');
                    video.classList.add('hide-mouse');
                    controlbar.setAttribute('style', 'display: none;');
                    console.log('still listening');
                }, 3000);
            }
        } else {
            document.webkitExitFullscreen();
            console.log('we should be done now');
            video.removeEventListener('mousemove', fullscreenMouse, false);
        }
    });


    // Update the seek bar as the video plays
    video.addEventListener('timeupdate', () => {
        var value = video.currentTime;
        dvr_slider.value = value;
        // var str = 'U+313x';
        // var uni_str = '"'+str.replace(/([0-9a-z]{4})/g, '\\u$1')+'"';
        // video.textTracks[0].activeCues[0].text = JSON.parse(uni_str);
        // video.textTracks[0].activeCues[0].text = 'ㅄㅄㅄㅄㅄ';
        // video.textTracks[0].activeCues[1].text = '\ufeff ㅄㅄㅄㅄㅄ';
        // video.textTracks[0].activeCues[2].text = '\ufeff ㅄㅄㅄㅄㅄ';
        // function encode_utf8(s) {
        //     return unescape( encodeURIComponent( s ));
        // }
        // var parseme = encode_utf8(video.textTracks[0].activeCues[0].text);
        // console.log(parseme);


    });

    volume_slider.addEventListener('input', () => {
        video.volume = this.value / 100;
    });

    dvr_slider.addEventListener('input', () => {
        video.currentTime = this.value;
    });



} // end hlsvideo


//create players for each video object
var videos = document.getElementsByTagName('video');
for (var i = 0, len = videos.length; i < len; i++) {
      hlsvideo(videos[i].id);
}

}()); // end closure
