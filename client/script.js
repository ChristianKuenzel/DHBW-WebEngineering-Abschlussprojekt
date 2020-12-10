/*

Copyright 2020
DHBW Lörrach, WebEngineering Abschlussprojekt: Server-Client based WebChatApplication
David Schüler, Matr.Nr.: ?, <david.schueler97@gmail.com>, https://github.com/AranguZ
Christian Künzel, Matr.Nr.: 3889521, <kunibertgames@web.de>, https://github.com/ChristianKuenzel

Application got created based on IP & work of Mathis Zeiher <GitHub: mzeiher>

Content undergoes the terms of chosen licenses. See GitHub for more:
https://github.com/ChristianKuenzel/DHBW-WebEngineering-Abschlussprojekt

*/
// __________________________________________________________________________________________
// safe references to DOM nodes in variables for easy access
const messageInput = document.querySelector('#message');
const messageButton = document.querySelector('#submit-message');
const messageArea = document.querySelector('#output');

// __________________________________________________________________________________________
// Execute main function init()

// Create client object.
let client = {};
// Create object to store id to whisper to
let whisperId = "";
init();

// __________________________________________________________________________________________
// Define main function init()
async function init() {
    
    

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
    messages.forEach(handleMessage);



    // create a new websocket connection
    const websocket = new WebSocket(`ws://${host}/ws?clientId=${client.clientId}&userName=${client.userName}`);

    // add an event listener if a message from the server is received
    websocket.addEventListener('message', (messageEvent) => {
        //call handleMessage
       handleMessage(messageEvent.data);
    });



    // add a click listener to the button to send a new message
    messageButton.addEventListener('click', () => {
        // send the value of the text-area to the server
        // get date hour and minute
        let date = new Date();
        let minutes = date.getMinutes().toString();
        let hours = date.getHours().toString();

        //add leading zero (7 -> 07)
        if (minutes.lenght === 1) {
            minutes = "0" + minutes;
        }

        if (hours.lenght === 1) {
            hours = "0" + hours;
        }

        let timeStamp = hours + ":" + minutes;
        
        //create message object
        let message = {
            "clientID": clientId,
            "userName": userName,
            "message": messageInput.value,
            "type": "normal",
            "time": timeStamp
        }
        
        //check if message is a whisper message and add data
        if(whisperId !== "") {
            message.type = "whisper";
            message.toClientId = whisperId;
        }

        //send data
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
            // send the value of the text-area to the server
        // get date hour and minute
        let date = new Date();
        let minutes = date.getMinutes().toString();
        let hours = date.getHours().toString();

        //add leading zero (7 -> 07)
        if (minutes.lenght === 1) {
            minutes = "0" + minutes;
        }

        if (hours.lenght === 1) {
            hours = "0" + hours;
        }

        let timeStamp = hours + ":" + minutes;
        
        //create message object
        let message = {
            "clientID": clientId,
            "userName": userName,
            "message": messageInput.value,
            "type": "normal",
            "time": timeStamp
        }
        
        //check if message is a whisper message and add data
        if(whisperId !== "") {
            message.type = "whisper";
            message.toClientId = whisperId;
        }

        //send data
        websocket.send(JSON.stringify(message));

        // clear the text area
        messageInput.value = '';
            // refocus input
            messageInput.focus();
        }
    });

}

//handle message -> checks type of message and calls proper function
function handleMessage(jsonString) {
    let content = JSON.parse(jsonString);

    //if type is userlist call changeUserList, else call addMessage
    if (content.type === "userList") {
        changeUserList(jsonString);
    }

    else {
        addMessage(jsonString);
    }
}

//change userList HTML
function changeUserList(jsonString) {
    let content = JSON.parse(jsonString); 

    //change count of current online users
    let usercount = document.getElementById("usercount");
    usercount.textContent = "Online: " + content.usercount;

    //get onlineUser div and clear it
    let onlineUser = document.getElementById("onlineUser");
    onlineUser.innerHTML = "";

    //for each client in content.Clients add an HTML Element
    for(let i = 0; i < content.clients.length; i++){
        //create div
        let divElement = document.createElement("div");
        
        //set class
        divElement.className = "user";

        //get user data and set textContent to name, id to clientId
        let userName = content.clients[i].userName;
        let clientId = content.clients[i].clientId;
        divElement.textContent = userName;
        divElement.id = clientId;

        //add click event to div
        divElement.addEventListener("click" , ()=> {
            //if whisperId === "" set style, set whisperId
            if (whisperId === "") {
                divElement.className = "user selected";
                whisperId = clientId;

            }
            // if whisperId is my own clientId unset all
            else if(whisperId === clientId) {
                divElement.className = "user";
                whisperId = "";

            }
            //if whisperId is other clientId unset other, set me
            else {
                let current = document.getElementById(whisperId);
                current.className = "user";
                divElement.className = "user selected";
                whisperId = clientId;
            }
        });
        //append to list
        onlineUser.appendChild(divElement);
    }
}


// __________________________________________________________________________________________
// add a message to the message area
function addMessage(jsonString) {
   
    let content = JSON.parse(jsonString);

    //create messageContainer, author, textarea and time
    const messagecontainer = document.createElement('div');

    const author = document.createElement('div');

    const textarea = document.createElement('div');

    const time = document.createElement('span');

     // set content and class of author 
    author.textContent = content.userName;
    author.className = "author";

    //set class of messagecontainer
    messagecontainer.className = "messagecontainer";

    //check if senderId is my own id (my own message) and set style if yes
    if (client.clientId === content.clientID) {
        messagecontainer.className = "messagecontainer me";    
    }

    //check if type of message is whisper and set style if yes
    if(content.type === "whisper") {
        messagecontainer.className = "messagecontainer whisper";
    }

    // Add text of message object.
    textarea.innerHTML = content.message;

    // Add time of the message and set style
    time.textContent = content.time;
    time.className = "time";

    //append child to create html structure
    textarea.appendChild(time);
    messagecontainer.appendChild(author);
    messagecontainer.appendChild(textarea);

    // Append the messagecontainer element to the message area
    messageArea.appendChild(messagecontainer);

    // Scroll the element into view
    messagecontainer.scrollIntoView();
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