var App = {
	audio: new Audio(),
	chunks: [],
	classes: {
		faPlay: "fa-play",
		faPause: "fa-pause",
		recording: "recording"
	},
	props: {
		disabled: "disabled"
	},
	recorder: null,
	selectors: {
		downloadButton: ".playback-button-download",
		playback: ".playback",
		playbackSlider: ".playback-slider",
		playbackTimeCurrent: ".playback-time-current",
		playbackTimeTotal: ".playback-time-total",
		playPauseButton: ".playback-button-play-pause",
		get playPauseButtonIcon() {
			return `${this.playPauseButton} i`;
		},
		recordButton: ".record-button",
		recorder: ".recorder",
		recorderErrorMsg: ".recorder-error-msg",
		returnButton: ".playback-button-return",
		stopButton: ".playback-button-stop"
	}
};

$(document).ready(function() {
	App.audio.addEventListener("timeupdate", handleAudioTimeUpdate);
	App.audio.addEventListener("durationchange", handleAudioDurationChange);
	App.audio.addEventListener("ended", handleAudioEnded);

	$(App.selectors.recordButton).on("click tap", handleRecordClick);
	$(App.selectors.playPauseButton).on("click tap", handlePlayPauseClick);
	$(App.selectors.stopButton).on("click tap", handleStopClick);
	$(App.selectors.downloadButton).on("click tap", handleDownloadClick);
	$(App.selectors.returnButton).on("click tap", handleReturnClick);
	$(App.selectors.playbackSlider).on("input", handlePlaybackSliderInput);
});

function addDataToChunks(event) {
	App.chunks.push(event.data);
}

function beginRecording(recorder) {
	$(App.selectors.recordButton).addClass(App.classes.recording);
	recorder.start();
}

function getMediaRecorder(success, error) {
	console.log("retrieving media recorder");
	navigator.mediaDevices
		.getUserMedia({ audio: true })
		.then(stream => {
			console.log("retrieved media recorder");
			if (success) {
				success(new MediaRecorder(stream));
			}
		})
		.catch(err => {
			console.log("failed to retrieve media recorder", err);
			if (error) {
				error(err);
			}
		});
}

function getTimestampString(minutes, seconds) {
	return `${minutes
		.toString()
		.padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function handleAudioDurationChange() {
	if (isFinite(App.audio.duration)) {
		const timespan = TimeSpan.FromSeconds(App.audio.duration);
		$(App.selectors.playbackTimeTotal).text(
			getTimestampString(timespan.minutes(), timespan.seconds())
		);
		$(App.selectors.playbackSlider).prop(App.props.disabled, false);
	} else {
		$(App.selectors.playbackTimeTotal).text("--:--");
		$(App.selectors.playbackSlider).prop(App.props.disabled, true);
	}
}

function handleAudioEnded() {
	console.log("audio playback ended");
	$(App.selectors.playPauseButtonIcon)
		.removeClass(App.classes.faPause)
		.addClass(App.classes.faPlay);
}

function handleAudioTimeUpdate() {
	console.log(`current time is ${App.audio.currentTime}s`);
	const timespan = TimeSpan.FromSeconds(App.audio.currentTime);
	$(App.selectors.playbackTimeCurrent).text(
		getTimestampString(timespan.minutes(), timespan.seconds())
	);
	if (isFinite(App.audio.duration)) {
		$(App.selectors.playbackSlider).val(
			App.audio.currentTime / App.audio.duration * 100
		);
	} else {
		$(App.selectors.playbackSlider).val(0);
	}
}

function handleDownloadClick() {
	const a = document.createElement("a");
	document.body.appendChild(a);
	a.style = "display: none";
	a.href = App.audio.src;
	a.download = "recording.webm";
	a.click();
	document.body.removeChild(a);
}

function handlePlaybackSliderInput() {
	const value = $(App.selectors.playbackSlider).val();
	const seekTime = value / 100 * App.audio.duration;
	App.audio.currentTime = seekTime;
	console.log(`seeking to ${seekTime}`);
}

function handlePlayPauseClick() {
	if (isPlaying(App.audio)) {
		console.log("pausing audio");
		App.audio.pause();
		$(App.selectors.playPauseButtonIcon)
			.removeClass(App.classes.faPause)
			.addClass(App.classes.faPlay);
	} else {
		console.log("playing audio");
		App.audio
			.play()
			.then(() => {
				console.log("audio play was successful");
				$(App.selectors.playPauseButtonIcon)
					.removeClass(App.classes.faPlay)
					.addClass(App.classes.faPause);
			})
			.catch(err => console.log(err));
	}
}

function handleRecordClick() {
	if (App.recorder) {
		if (App.recorder.state === "recording") {
			stopRecording(App.recorder);
		} else {
			App.chunks.splice(0, App.chunks.length);
			beginRecording(App.recorder);
		}
	} else {
		if (navigator.mediaDevices) {
			getMediaRecorder(
				recorder => {
					App.recorder = recorder;
					App.recorder.addEventListener(
						"dataavailable",
						addDataToChunks
					);
					App.recorder.addEventListener("stop", handleRecorderStop);
					beginRecording(App.recorder);
				},
				err => {
					$(App.selectors.recorderErrorMsg).text(
						"Sorry, we couldn't access your microphone!"
					);
					$(App.selectors.recordButton).fadeOut(400, () =>
						$(App.selectors.recorderErrorMsg).fadeIn(400)
					);
				}
			);
		} else {
			$(App.selectors.recorderErrorMsg).text(
				"Sorry, your browser doesn't appear to support recording!"
			);
			$(App.selectors.recordButton).fadeOut(400, () => {
				$(App.selectors.recorderErrorMsg).fadeIn(400);
			});
		}
	}
}

function handleRecorderStop() {
	loadAudio(App.audio, App.chunks);
	$(App.selectors.recorder).fadeOut(400, () => {
		$(App.selectors.playback).fadeIn(400);
	});
	$(App.selectors.playbackSlider).val(0);
}

function handleReturnClick() {
	App.audio.pause();
	$(App.selectors.playPauseButtonIcon)
		.removeClass(App.classes.faPause)
		.addClass(App.classes.faPlay);
	$(App.selectors.playback).fadeOut(400, () => {
		$(App.selectors.recorder).fadeIn(400);
	});
}

function handleStopClick() {
	console.log("stopping audio");
	App.audio.pause();
	App.audio.currentTime = 0;
	$(App.selectors.playPauseButtonIcon)
		.removeClass(App.classes.faPause)
		.addClass(App.classes.faPlay);
}

function isPlaying(audio) {
	return !audio.paused && !audio.ended && 0 < audio.currentTime;
}

function loadAudio(audio, chunks) {
	const oldUrl = audio.src;
	const audioBlob = new Blob(chunks);
	const audioUrl = URL.createObjectURL(audioBlob);
	console.log(`loading audio from ${audioUrl}`);
	audio.src = audioUrl;
	audio.load();
	if (oldUrl) {
		console.log(`revoking audio url ${oldUrl}`);
		URL.revokeObjectURL(oldUrl);
	}
}

function stopRecording(recorder) {
	$(App.selectors.recordButton).removeClass(App.classes.recording);
	recorder.stop();
}
