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

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, parse as parsePath } from 'path';
import { createServer } from 'http';
import ws from 'ws';
import { parse as parseURL, fileURLToPath } from 'url';
import { contentType } from 'mime-types';


// get path relative to current file
// importent later to resolve and serve the static content (index.html)
//
// import.meta.url returns a file url representing the full path of the current file
// fileURLToPath will transform the file url (file:///<path>) to an actual path string (/home/..., c:\path (for windows))
// parsePath takes the path and creates an object describiing the path, with a "dir" property pointing to the directory, "ext" for the file extension, etc...
const modulePath = parsePath(fileURLToPath(import.meta.url)).dir;

// create an absolute path for storing message
// resolve() will take care of OS specific paths for example backslashes in windows, etc....
const MESSAGE_PATH = resolve(modulePath, 'messages.json');

// create an absolute path from where static content is served (index.html for example)
const STATIC_CONTENT = resolve(modulePath, '../../client');

// __________________________________________________________________________________________
// Execute main function init()
init();


// top level await not yet support for all nodejs runtimes
async function init() {

    // Check if a 'messages.json' file exists, if so, read the file and parse the file to get a JSON Object back, otherwise initialize the messages with an empty array
    const messages = existsSync(MESSAGE_PATH) ? JSON.parse(await readFile(MESSAGE_PATH, { encoding: 'utf-8' })) : [];

    // variable to save connected clients
    const connectedClients = new Set();

    // create websocket server
    // noServer must be set because we create our own http server and just relay websocket requests to the websocket server
    const webSocketServer = new ws.Server({ noServer: true });

    // create a http server
    // the createServer methods takes a function with two parameters as an argument to process the request
    // req will point to a request object with all information about the http request
    // res will point to a response object to respond to the request
    const httpServer = createServer(async (req, res) => {

        // we use the parseURL helper function to parse the url passed in the http request
        // this will help us to access query parameters and the URL
        const url = parseURL(req.url, true);

        // if no path is given in the http request we rewrite the path to "/index.html" to serve the index page, otherwise we use the requested path
        const path = url.path === '/' ? '/index.html' : url.path;

        // if the request is a HTTP GET request and the path is /messages we serve a list of all previouse messages
        if (req.method === 'GET' && path.startsWith('/messages')) {
            // since we are servig a JSON, we set the approproate content type in the response object ...
            res.setHeader('Content-Type', 'application/json');
            // ...we signal the response that everything is ok, with a HTTP 200...
            res.writeHead(200);
            // ...and write the stringified content of the "messages" variable in the request object
            res.end(JSON.stringify(messages));

        // else if the request method is GET and we find the requested paht in the STATIC_CONTENT folder we serve the requested file
        // the path.substr(1) must be done to remove the leading "/" from path because we want to look up the file
        // relative to the content path and / will indicate look at root level
        } else if (req.method === 'GET' && existsSync(resolve(STATIC_CONTENT, path.substr(1)))) {
            // parse path (get extension, file name and base dir)
            const fileInfo = parsePath(resolve(STATIC_CONTENT, path.substr(1)));
            // set the content type according to the file extension, otherwise set it to a generic "application/octet-stream"
            res.setHeader('Content-Type', contentType(fileInfo.ext) || 'application/octet-stream');
            // signal everything is ok with http 200
            res.writeHead(200);
            // write the content of the file into the response object
            res.end(await readFile(resolve(fileInfo.dir, fileInfo.base)));
        //for every other request return 404 "Not Found"
        } else {
            res.writeHead(404, 'Not Found');
            res.end();
        }
    });

    // websocket connections must be handled in a spcial way so we listen to an "upgrade" request from the client
    httpServer.on('upgrade', (req, socket, header) => {
        // if a client sends an upgrade request with http GET to the /ws path we'll handle this request and pass it to the websocket server
        if (req.method === 'GET' && req.url.startsWith('/ws')) {
            // let the websocket server handle the request and stablish a connection
            webSocketServer.handleUpgrade(req, socket, header, (client) => {
                // notify the websocket server that a new client is connected
                webSocketServer.emit('connection', client, req);

                // Get information clientId and username from request url
                // /ws?clientId=123&username=david
                client.clientId = req.url.split("&")[0].split("=")[1];
                client.userName = req.url.split("&")[1].split("=")[1];

                // Add client to list of connected clients.
                connectedClients.add(client);

                // Create/"Update" clientList by creating new one.
                // Generate object with list of clients
                let clientList = {
                    clients:[],
                    type: "userList",
                    usercount: connectedClients.size
                }

                // Add all clients as object with clientId and username to client list
                for (const connectedClient of connectedClients.keys()) {
                    let tmpObj = {
                        clientId: connectedClient.clientId,
                        userName: connectedClient.userName
                    }
                    clientList.clients.push(tmpObj);
                }

                // Change format
                let tmp = JSON.stringify(clientList);

                // Send client list to every client
                for (const connectedClient of connectedClients.keys()) {
                    connectedClient.send(tmp);
                }

                // Event handler if new client message is received.
                client.on('message', (data) => {
                    // Generate message object.
                    let messageObj = JSON.parse(data);

                    // Check if message is empty.
                    if (messageObj.message !== "") {
                        if(messageObj.message.length > 300){
                            messageObj.message = messageObj.message.substr(0,300);
                            data = JSON.stringify(messageObj);
                        }
                        // Check type of message.
                        if (messageObj.type === "whisper") {
                            for (const connectedClient of connectedClients.keys()) {
                                // Check if client is target client for private message
                                if (connectedClient.clientId === messageObj.toClientId) {
                                    connectedClient.send(data);
                                }
                            }
                        // Send data to all clients.
                        } else {
                            // Push only if normal type message.
                            messages.push(data);
                            for (const connectedClient of connectedClients.keys()) {
                                try {
                                    connectedClient.send(data);
                                } catch (e) {
                                }
                            }
                        }
                    // Message Empty.
                    } else {
                        // Do nothing. No message content to send.
                    }
                });

                // add an event listener to be notified if a client disonnectes
                client.on('close', () => {
                    // remove the client from the connected clients list
                    connectedClients.delete(client);

                    // "Update" clientList by creating new one.
                    // Generate object with list of clients
                    let clientList = {
                        clients:[],
                        type: "userList",
                        usercount: connectedClients.size
                    }

                    // Add all clients as object with clientId and username to client list
                    for (const connectedClient of connectedClients.keys()) {
                        let tmpObj = {
                            clientId: connectedClient.clientId,
                            userName: connectedClient.userName
                        }
                        clientList.clients.push(tmpObj);
                    }

                    // Change format
                    let tmp = JSON.stringify(clientList);

                    // Send client list to every client
                    for (const connectedClient of connectedClients.keys()) {
                        connectedClient.send(tmp);
                    }
                });

                // add an event listener if an errors happens during the connection
                client.on('error', () => {
                    console.log('client error - disconnected');
                    // also remove the client from the connected client list if an erro appears
                    connectedClients.delete(client);

                    // "Update" clientList by creating new one.
                    // Generate object with list of clients
                    let clientList = {
                        clients:[],
                        type: "userList",
                        usercount: connectedClients.size
                    }

                    // Add all clients as object with clientId and username to client list
                    for (const connectedClient of connectedClients.keys()) {
                        let tmpObj = {
                            clientId: connectedClient.clientId,
                            userName: connectedClient.userName
                        }
                        clientList.clients.push(tmpObj);
                    }

                    // Change format
                    let tmp = JSON.stringify(clientList);

                    // Send client list to every client
                    for (const connectedClient of connectedClients.keys()) {
                        connectedClient.send(tmp);
                    }
                });
            })

        // if the path to handle websocket connections is wrong just destroy the second to abbort the connection attempt
        } else {
            socket.destroy();
        }
    });

    // start the http server and listen to port 8081 on all interfaces (0.0.0.0)
    httpServer.listen(8081, '0.0.0.0', () => {
        console.log(`Server started...`);
    });

    // attach an event listener to store all messages if the user stops the server with CTRL+C
    process.on('SIGINT', async () => {
        // write the messages array to the filesystem to persist the messages so that they can be loaded on next server start
        await writeFile(MESSAGE_PATH, JSON.stringify(messages), { encoding: 'utf8' });
        process.exit(0);
    })
}
