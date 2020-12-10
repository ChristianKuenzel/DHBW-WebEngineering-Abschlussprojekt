
// Haeder


// __________________________________________________________________________________________
// safe references to DOM nodes in variables for easy access
const messageInput = document.querySelector('#message');
const messageButton = document.querySelector('#submit-message');
const messageArea = document.querySelector('#output');

// __________________________________________________________________________________________
// Execute main function init()

// Create client object.
let client = {};
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
       handleMessage(messageEvent.data);
    });



    // add a click listener to the button to send a new message
    messageButton.addEventListener('click', () => {
        // send the value of the text-area to the server
        let date = new Date();
        let minutes = date.getMinutes().toString();
        let hours = date.getHours().toString();
        if (minutes.lenght === 1) {
            minutes = "0" + minutes;
        }

        if (hours.lenght === 1) {
            hours = "0" + hours;
        }

        let timeStamp = hours + ":" + minutes;
        
        let message = {
            "clientID": clientId,
            "userName": userName,
            "message": messageInput.value,
            "type": "normal",
            "time": timeStamp
        }
        
        if(whisperId !== "") {
            message.type = "whisper";
            message.toClientId = whisperId;
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
            let date = new Date();
            let minutes = date.getMinutes().toString();
            let hours = date.getHours().toString();
            if (minutes.lenght === 1) {
                minutes = "0" + minutes;
            }
    
            if (hours.lenght === 1) {
                hours = "0" + hours;
            }
    
            let timeStamp = hours + ":" + minutes;
            
            let message = {
                "clientID": clientId,
                "userName": userName,
                "message": messageInput.value,
                "type": "normal",
                "time": timeStamp
            }
            
            if(whisperId !== "") {
                message.type = "whisper";
                message.toClientId = whisperId;
            }
    
            websocket.send(JSON.stringify(message));
    
            // clear the text area
            messageInput.value = '';
            // refocus input
            messageInput.focus();
        }
    });

}

function handleMessage(jsonString) {
    let content = JSON.parse(jsonString);

    if (content.type === "userList") {
        changeUserList(jsonString);
    }

    else {
        addMessage(jsonString);
    }
}
/*{
    clients:[{
        "clientID": 123545, 
        "userName": "asfdsa",
    },
    {
        "clientID": 2354514, 
        "userName": "asfds",
    }
    ]
    "type": "userList",
    "usercount": 5 
}

<div id="userlist">
            <div id="usercount">
                Online: 3
            </div>
            <div id="onlineUser">
                <div class="user">
                    David
                </div>
                <div class="user selected">
                    Gionny
                </div>
                <div class="user ">
                    Chris
                </div>
            </div>
            

        </div>
*/
function changeUserList(jsonString) {
    let content = JSON.parse(jsonString); 

    console.log(content);

    let usercount = document.getElementById("usercount");
    usercount.textContent = "Online: " + content.usercount;
    let onlineUser = document.getElementById("onlineUser");
    onlineUser.innerHTML = "";
    for(let i = 0; i < content.clients.length; i++){
        let divElement = document.createElement("div");
        divElement.className = "user";
        let userName = content.clients[i].userName;
        let clientId = content.clients[i].clientId;
        divElement.textContent = userName;
        divElement.id = clientId;
        divElement.addEventListener("click" , ()=> {
            if (whisperId === "") {
                divElement.className = "user selected";
                whisperId = clientId;

            }
            else if(whisperId === clientId) {
                divElement.className = "user";
                whisperId = "";

            }
            else {
                let current = document.getElementById(whisperId);
                current.className = "user";
                divElement.className = "user selected";
                whisperId = clientId; 
                

            }
        });
        onlineUser.appendChild(divElement);
        
        

    }
}


// __________________________________________________________________________________________
// add a message to the message area
function addMessage(jsonString) {
   
    let content = JSON.parse(jsonString);

    const messagecontainer = document.createElement('div');

    const author = document.createElement('div');

    const textarea = document.createElement('div');

    const time = document.createElement('span');

     // add username    
    author.textContent = content.userName;

    author.className = "author";

    messagecontainer.className = "messagecontainer";

    if (client.clientId === content.clientID) {
        messagecontainer.className = "messagecontainer me";
    
    }

    if(content.type === "whisper") {
        messagecontainer.className = "messagecontainer whisper";
    }

    // Add text of message object.
    textarea.innerHTML = content.message;

    time.textContent = content.time;

    time.className = "time";

    textarea.appendChild(time);

    messagecontainer.appendChild(author);

    messagecontainer.appendChild(textarea);

    // Append the p element to the message area
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