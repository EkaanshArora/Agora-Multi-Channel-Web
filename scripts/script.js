// Function to start the call for channel one
document.getElementById("start1").onclick = async function () {
    // Defines a client for RTC using "live" profile for live-streaming
    const clientOne = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
    // Set role as host: in channel one we'll both receive and transmit feeds
    clientOne.setClientRole("host");
    // Get credentials from the form
    let appId = document.getElementById("app-id").value;
    if (appId === '') {
        document.getElementById('error').innerHTML = 'Please enter app ID';
        return 1;
    } else document.getElementById('error').innerHTML = '';
    let channelId = document.getElementById("channel1").value;
    let token = document.getElementById("token1").value || null;
    // Create local tracks
    const [localAudioTrack, localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();

    // Initialize the stop button
    initStopOne(clientOne, localAudioTrack, localVideoTrack);
    document.getElementById("start1").disabled = true; // Disable the start button
    // Play the local track
    localVideoTrack.play('me');

    // Set up event listeners for remote users publishing or unpublishing tracks
    clientOne.on("user-published", async (user, mediaType) => {
        await clientOne.subscribe(user, mediaType); // subscribe when a user publishes
        if (mediaType === "video") {
            let remoteContainer = document.getElementById("remote-container1");
            addVideoContainer(String(user.uid), remoteContainer) // uses helper method to add a container for the videoTrack
            console.log('clientone: uid, container', user.uid, remoteContainer);
            user.videoTrack.play(String(user.uid));
        }
        if (mediaType === "audio") {
            user.audioTrack.play(); // audio does not need a DOM element
        }
    });
    clientOne.on("user-unpublished", async (user, mediaType) => {
        if (mediaType === "video") {
            removeVideoContainer(user.uid) // removes the injected container
        }
    });
    // Join a channnel and retrieve the uid for local user
    const _uid = await clientOne.join(appId, channelId, token, null);
    await clientOne.publish([localAudioTrack, localVideoTrack]);
};

// Function to start the call for channel two
document.getElementById("start2").onclick = async function () {
    // Defines a second client for joining channel two
    const clientTwo = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
    // Set role as audience: in channel two we'll only receive remote feeds
    clientTwo.setClientRole("audience");
    let appId = document.getElementById("app-id").value;
    if (appId === '') {
        document.getElementById('error').innerHTML = 'Please enter app ID';
        return 1;
    } else document.getElementById('error').innerHTML = '';
    let channelId2 = document.getElementById("channel2").value;
    let token2 = document.getElementById("token2").value || null;

    // Initialize the stop button
    initStopTwo(clientTwo);
    document.getElementById("start2").disabled = true;

    // Set up event listeners just like before
    clientTwo.on("user-published", async (user, mediaType) => {
        await clientTwo.subscribe(user, mediaType); 
        if (mediaType === "video") {
            let remoteContainer2 = document.getElementById("remote-container2");
            // Append '-c2' to the div to avoid possible id conflict when joining the same channel
            addVideoContainer(String(user.uid + '-c2'), remoteContainer2)
            console.log('clienttwo: uid, container', user.uid, remoteContainer2);
            user.videoTrack.play(String(user.uid + '-c2'));
        }
        if (mediaType === "audio") {
            user.audioTrack.play(); // audio does not need a DOM element
        }
    });
    clientTwo.on("user-unpublished", async (user, mediaType) => {
        if (mediaType === "video") {
            removeVideoContainer(user.uid+ '-c2') // removes the injected container
        }
    });
    // Join a channnel and retrieve the uid for local user
    const _uid2 = await clientTwo.join(appId, channelId2, token2, null);
};

function initStopOne(client, localAudioTrack, localVideoTrack) {
    const stopBtn = document.getElementById('stop1');
    stopBtn.disabled = false; // Enable the stop button
    stopBtn.onclick = function () {
        client.unpublish(); // stops sending audio & video to agora
        localVideoTrack.stop(); // stops video track and removes the player from DOM
        localVideoTrack.close(); // Releases the resource
        localAudioTrack.stop();  // stops audio track
        localAudioTrack.close(); // Releases the resource
        client.remoteUsers.forEach(user => {
            if (user.hasVideo) {
                removeVideoContainer(user.uid) // Clean up DOM
            }
            client.unsubscribe(user); // unsubscribe from the user
        });
        client.removeAllListeners(); // Clean up the client object to avoid memory leaks
        stopBtn.disabled = true;
        document.getElementById("start1").disabled = false;
    }
}

function initStopTwo(client) {
    const stopBtn = document.getElementById('stop2');
    stopBtn.disabled = false;
    stopBtn.onclick = function () {
        client.remoteUsers.forEach(user => {
            if (user.hasVideo) {
                removeVideoContainer(user.uid + '-c2')
            }
            client.unsubscribe(user);
        });
        client.removeAllListeners();
        stopBtn.disabled = true;
        document.getElementById("start2").disabled = false;
    }
}

/* Helper functions */

/**
 * @name addVideoContainer
 * @param uid - uid of the user
 * @param container - HTML container for the video
 * @description Helper function to add the video stream to "remote-container"
 */
function addVideoContainer(uid, container) {
    let streamDiv = document.createElement("div"); // Create a new div for every stream
    streamDiv.id = uid;                       // Assigning id to div
    streamDiv.style.transform = "rotateY(180deg)"; // Takes care of lateral inversion (mirror image)
    container.appendChild(streamDiv);      // Add new div to container
}

/**
 * @name removeVideoContainer
 * @param uid - uid of the user
 * @description Helper function to remove the video stream from "remote-container"
 */
function removeVideoContainer(uid) {
    let remDiv = document.getElementById(uid);
    remDiv && remDiv.parentNode.removeChild(remDiv);
}