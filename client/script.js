/*

Copyright 2020
DHBW Lörrach, WebEngineering Abschlussprojekt: Server-Client based WebChatApplication
David Schüler, Matr.Nr.: ?, <david.schueler97@gmail.com>, https://github.com/AranguZ
Christian Künzel, Matr.Nr.: 3889521, <kunibertgames@web.de>, https://github.com/ChristianKuenzel

Application got created based on IP & work of Mathis Zeiher <GitHub: mzeiher>

Content undergoes the terms of chosen licenses. See GitHub for more:
https://github.com/ChristianKuenzel/DHBW-WebEngineering-Abschlussprojekt

HTML Skript

*/
// __________________________________________________________________________________________
// safe references to DOM nodes in variables for easy access
const messageInput = document.querySelector('#message');
const messageButton = document.querySelector('#submit-message');
const messageArea = document.querySelector('#output');

// __________________________________________________________________________________________
// Execute main function init()
init();

// __________________________________________________________________________________________
// Define main function init()
async function init() {
    // Create client object.
    let client = {};

    // Get the user's location and add it to client object.
    const host = window.location.host;
    client.host = host;

    // Create a unique id and add it to the current client.
    const clientId = getRandomId();
    client.clientId = clientId;

    // Let user choose his userName.
    const userName = getUserName();
    client.userName = userName;

    // Request all messages that had already been written from the server.
    // Convert into JSON and add them to the message area.
    const messagesResult = await fetch('/messages', {method: 'GET'});
    const messages = await messagesResult.json();
    messages.forEach(addMessage);

    // create a new websocket connection
    const websocket = new WebSocket(`ws://${host}/ws`);

    // add an event listener if a message from the server is received
    websocket.addEventListener('message', (messageEvent) => {
        addMessage(messageEvent.data);
    });

    // add a click listener to the button to send a new message
    messageButton.addEventListener('click', () => {
        // send the value of the text-area to the server
        let date = new Date();
        let minutes = date.getMinutes().toString();
        let hours = date.getHours().toString();
        let timeStamp = hours + ":" + minutes;

        let message = {
            "clientID": clientId,
            "userName": userName,
            "message": messageInput.value,
            "type": "normal",
            "time": timeStamp
        }

        websocket.send(JSON.stringify(message));

        // clear the text area
        messageInput.value = '';
    });

    // add an event listener to the text-area to be able to send messages with a shift+enter
    messageInput.addEventListener('keydown', (evt) => {
        // if shift or ctrl + enter is typed send a new message
        if ((evt.ctrlKey || evt.shiftKey) && evt.key === 'Enter') {
            evt.preventDefault(); // prevent default action
            evt.stopPropagation(); // stop keydown propagation (stop event bubbling)
            // send message
            websocket.send(`client${clientId}: ${messageInput.value}`);
            // clear input
            messageInput.value = '';
            // refocus input
            messageInput.focus();
        }
    });

}

// __________________________________________________________________________________________
// add a message to the message area
function addMessage(jsonString) {
    let content = JSON.parse(jsonString);

    const pElement = document.createElement('p');

    // Add text of message object.
    pElement.innerHTML = content.message;

    // Append the p element to the message area
    messageArea.appendChild(pElement);

    // Scroll the element into view
    pElement.scrollIntoView();
}

// Create a random id based on present time. Due to unique date-time values and the measurement of
// milliseconds and no user will get the same id.
// Also: It is not possible to create new id's older than today.
function getRandomId() {
    let id = Date.now();
    console.log(JSON.stringify(id));
    return JSON.stringify(id);
}

// Ask user for his temporary name by using a text window.
function getUserName() {
    var userName = "StandardUser";
    let output = prompt("Please enter your name:", "");
    if (output != null && output !== '') {
        userName = output
    }
    return userName
}