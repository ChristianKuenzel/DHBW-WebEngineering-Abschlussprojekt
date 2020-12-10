
Haeder


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
    client.userName = getUserName();



    // Request all messages that had already been written from the server.
    // Convert into JSON and add them to the message area.
    const messagesResult = await fetch('/messages', {method: 'GET'});
    const messages = await messagesResult.json();
    messages.forEach(addMessage);



    // create a new websocket connection
    const websocket = new WebSocket(`ws://${host}/ws`);


    /*// register an event listener if a connection is established
    websocket.addEventListener('open', () => {
        // send a "client connected message"
        websocket.send(`Client client${clientId} connected`);
        // enable the input controls
        messageInput.disabled = false;
        messageButton.disabled = false;
    });*/

    // add an event listener if a message from the server is received
    websocket.addEventListener('message', (messageEvent) => {
        addMessage(messageEvent.data);
    });



    // add a click listener to the button to send a new message
    messageButton.addEventListener('click', () => {
        // send the value of the text-area to the server
        let time = Date.now();
        let timeStamp = JSON.stringify(time);
        websocket.send(`client${client.userName}: ${messageInput.value} ${timeStamp}`);
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
function addMessage(message) {
    // create a p element
    const pElement = document.createElement('p');
    // add the message as textContent to prevent XSS
    pElement.textContent = message;
    // append the p element to the message area
    messageArea.appendChild(pElement);
    // scroll the element into view
    pElement.scrollIntoView();
}

// Create a random id based on present time. Due to unique date-time values and the measurement of
// milliseconds and no user will get the same id.
// Also: It is not possible to create new id's older than today.
function getRandomId() {
    return Date.now();
}

// Ask user for his temporary name by using a text window.
function getUserName() {
    var userName = "StandardUser";
    let output = prompt("Please enter your name:", "");
    if (output != null) {
        userName = output
    }
    return userName
}