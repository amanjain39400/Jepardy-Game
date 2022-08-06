const http = require("http");
const express = require("express");
const app = express();

app.use(express.static(__dirname));                                         
app.get("/", (req, res) => res.sendFile(__dirname + "index.html")) //*9001 hosts client on express
app.listen(9001, () => console.log("Listening on http port 9001"))

const httpServer = http.createServer();
const websocketServer = require("websocket").server
httpServer.listen(9000, () => console.log("Listening.. on 9000"))



const db = require("./data.json");


let trivobj = db;
var i;
let categories_t = [];
let clues_t = {};

for (i in trivobj.categories) {
    
    var category = {
        title: trivobj.categories[i].title,   
        clues: []             
    }
    
    var clues = shuffle(trivobj.categories[i].clues).splice(0, 5).forEach((clue, index) => {
        //Create unique ID for this clue
        let clueId = i + "-" + index;
        category.clues.push(clueId);
        //Add clue to DB
        clues_t[clueId] = {
            question: clue.question,
            answer: clue.answer,
            value: (index + 1) * 100
        };
    })
    
    categories_t.push(category);
};

// console.log("clues_t", clues_t);
console.log("categories_t", categories_t);

//hashmap clients
const clients = {};
let games = {};

const wsServer = new websocketServer({
    "httpServer": httpServer
})

wsServer.on("request", request => {

    const connection = request.accept(null, request.origin);
    connection.on("open", () => console.log("opened!"));
    connection.on("close", () => console.log("closed!"));

    //generate a new clientId
    const clientId = guid();
    trivobj = {
        "categories": [
            { "title": "Sports" },
            { "title": "Technology" },
            { "title": "Movies" },
            { "title": "Editorial" },
        ]
    }
    clients[clientId] = {  
        "connection": connection  
    }

    const payLoad = {
        "method": "connect",
        "clientId": clientId,
        "trivobj": trivobj
    }
    
    connection.send(JSON.stringify(payLoad))

    connection.on("message", message => {
        const result = JSON.parse(message.utf8Data) 
        if (result.method === "create") {
            const clientId = result.clientId;
            const gameId = guid();
            games[gameId] = {
                "id": gameId,
                "client-count": 3,   
                "clients": [],
                "usedQues": null,
                "turnOfPlayer": 0
            }

            const payLoad = {
                "method": "create",
                "game": games[gameId]
            }

            const con = clients[clientId].connection;
            con.send(JSON.stringify(payLoad));
        }

        //a client want to join
        if (result.method === "join") {
            const clientId = result.clientId;
            const gameId = result.gameId;
            let game = games[gameId];
            if (game.clients.length >= 3) {
                return;
            }
            let clientNo = game.clients.length  //initialise each player score to zero
            game.clients.push({
                "clientId": clientId,
                "clientNo": clientNo, 
                "score": 0  
            })
            //start the game
            if (game.clients.length === 3) updateGameState(); 

            const payLoad = {
                "method": "join",
                "game": game
            }
           
            game.clients.forEach(c => {
                clients[c.clientId].connection.send(JSON.stringify(payLoad))
            })
        }

        // A player send the updated score state
        if (result.method === "updateScore") {
            const gameId = result.gameId;
            const scoreId = result.scoreId;
            const newScore = result.newScore;
            let state = games[gameId].state;
            if (!state)  
                state = {}

            state[scoreId] = newScore;
            console.log("backend pe update chala") // -----------------------------------------------------
            games[gameId].state = state;
        }


        // Client sends clueID to retrieve question
        if (result.method === "getQuestion") {
            const clientId = result.clientId;
            const clueId = result.clueId;
            const gameId = result.gameId;
            games[gameId].usedQues = clueId;

            // Server sends the question to the client
            const payLoad = {
                "method": "getQuestion",
                "question": clues_t[clueId].question
            }

            console.log("question", payLoad.question);
            clients[clientId].connection.send(JSON.stringify(payLoad));
        }

        // Get the clients answer and check
        if (result.method === "getAnswer") {
            const clientId = result.clientId;
            const clients_answer = result.ans;
            const clueId = result.clueId;
            const gameId = result.gameId;

            let isCorrect = clues_t[clueId].answer === clients_answer;

            console.log("iScorrect", isCorrect);
            const payload = {
                "method": "getAnswer",
                "result": isCorrect,
                "answer": clues_t[clueId].answer
            }

            clients[clientId].connection.send(JSON.stringify(payload));
            games[gameId].turnOfPlayer = (games[gameId].turnOfPlayer + 1) % 3;

            console.log(payload);
            console.log("cliennts ans", clients_answer);
            console.log(clues_t[clueId].answer)

            setTimeout(updateGameState, 500);
        }

    })

})


function updateGameState() {  
    for (const g of Object.keys(games)) {
        let game = games[g]
        const payLoad = {
            "method": "update",
            "game": game
        }

        game.clients.forEach(c => { 
            clients[c.clientId].connection.send(JSON.stringify(payLoad))  
        })
        games[g].usedQues = null;
    }
    
}



function S4() {   //*randomise function to create unique guid for new client connections
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

// then to call it, plus stitch in '4' in the third group
const guid = () => (S4() + S4() + "-" + S4() + "-4" + S4().substr(0, 3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();


//Utils -----------------------------------
function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        // j = Math.floor(Math.random() * (i + 1));
        j = Math.floor(Math.random() * (a.length));
        console.log("shuffle", i, j);
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}
