
    // safe references to DOM nodes in variables for easy access
    const messageInput = document.querySelector('#message');
    const messageButton = document.querySelector('#submit-message');
    const messageArea = document.querySelector('#output');

    // init function
    async function init() {

    // get information about the current location from the browser
    const host = window.location.host;
    // get a random id
    const clientId = getRandomId();

    // request all messages from the server
    const messagesResult = await fetch('/messages', { method: 'GET' });
    // format the messages as JSON and store them in the messages array
    const messages = await messagesResult.json();

    // add all messages to the message area
    messages.forEach(addMessage);

    // create a new websocket connection
    const websocket = new WebSocket(`ws://${host}/ws`);

    // register an event listener if a connection is established
    websocket.addEventListener('open', () => {
    // send a "client connected message"
    websocket.send(`Client client${clientId} connected`);
    // enable the input controls
    messageInput.disabled = false;
    messageButton.disabled = false;
});
    // add an event listener if a message from the server is received
    websocket.addEventListener('message', (messageEvent) => {
    addMessage(messageEvent.data);
});

    // add a click listener to the button to send a new message
    messageButton.addEventListener('click', () => {
    // send the value of the text-area to the server
    websocket.send(`client${clientId}: ${messageInput.value}`);
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
    // call init function
    init();

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

    // get a random ID for connected clients
    function getRandomId() {
    return parseInt(Math.random() * 1000);
}