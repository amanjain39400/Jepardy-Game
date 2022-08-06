let cid = null;                      
let isCorrect = null;
let turnOfPlayer = null;
let gameStated = false;

class TriviaGameShow {
   constructor(element) {
     
      this.categories = [];  //*
      this.clues = {};   
     
      this.currentClue = null;
     

      this.boardElement = element.querySelector(".board"); 
      this.formElement = element.querySelector("form");
      this.inputElement = element.querySelector("input[name=user-answer]");
      this.modalElement = element.querySelector(".card-modal"); 
      this.clueTextElement = element.querySelector(".clue-text");
      this.resultElement = element.querySelector(".result");
      this.resultTextElement = element.querySelector(".result_correct-answer-text");
      this.successTextElement = element.querySelector(".result_success");
      this.failTextElement = element.querySelector(".result_fail");
   }

   initGame(trivObjFromServer) {

      
      this.boardElement.addEventListener("click", event => {
         if (event.target.dataset.clueId) {
            this.handleClueClick(event);
         }
      });
      this.formElement.addEventListener("submit", event => {
         this.handleFormSubmit(event);
      });
      
      this.updateScore(0);
      
      this.trivobj = trivObjFromServer;
      this.fetchCategories();
   }

   fetchCategories() {
      for (let i in this.trivobj.categories) {
         
         var category = {
            title: this.trivobj.categories[i].title,   
            clues: []            
         }

         for (let j = 0; j < 5; j++) {
           
            var clueId = i + "-" + j;
            category.clues.push(clueId);
           
            this.clues[clueId] = {
               value: (j + 1) * 100
            };
         }
         
         this.categories.push(category);
      };
      
      this.categories.forEach((c) => {
         this.renderCategory(c);
      });
   }

   renderCategory(category) {
      let column = document.createElement("div");
      column.classList.add("column");
      column.innerHTML = (
         `<header>${category.title}</header>
          <ul>
          </ul>`
      ).trim();

      var ul = column.querySelector("ul");
      category.clues.forEach(clueId => {
         var clue = this.clues[clueId];
         ul.innerHTML += `<li><button id="${clueId}" data-clue-id=${clueId}> $${clue.value}</button></li>`
      })

      
      this.boardElement.appendChild(column);
   }

   updateScore(change) {
      score += change;   
      console.log(score);
   }

   handleClueClick(event) {
      var clue = this.clues[event.target.dataset.clueId];
      cid = event.target.dataset.clueId;

      const payLoad = {
         "method": "getQuestion",
         "clientId": clientId,
         "clueId": cid,
         "gameId": gameId
      }

      console.log("payload clueId", cid);

      ws.send(JSON.stringify(payLoad));

     
      event.target.classList.add("used");

     
      this.inputElement.value = "";

     
      this.currentClue = clue;

     
      this.clueTextElement.textContent = this.currentClue.question;

     

      console.log("Inside", this.currentClue.answer);

     
      this.modalElement.classList.remove("showing-result");

     
      this.modalElement.classList.add("visible");
      this.inputElement.focus();
   }

   
   handleFormSubmit(event) {
      event.preventDefault();

   
      const payLoad = {
         "method": "getAnswer",
         "clientId": clientId,
         "clueId": cid,
         "gameId": gameId,
         "ans": this.inputElement.value
      }

      ws.send(JSON.stringify(payLoad));
      console.log("My ans", payLoad);

   
   }

 
   cleanseAnswer(input = "") {
      var friendlyAnswer = input.toLowerCase();
      friendlyAnswer = friendlyAnswer.replace("<i>", "");
      friendlyAnswer = friendlyAnswer.replace("</i>", "");
      friendlyAnswer = friendlyAnswer.replace(/ /g, "");
      friendlyAnswer = friendlyAnswer.replace(/"/g, "");
      friendlyAnswer = friendlyAnswer.replace(/^a /, "");
      friendlyAnswer = friendlyAnswer.replace(/^an /, "");
      return friendlyAnswer.trim();
   }

   revealAnswer(isCorrect) {
 
      this.successTextElement.style.display = isCorrect ? "block" : "none";
      this.failTextElement.style.display = !isCorrect ? "block" : "none";

      
      this.modalElement.classList.add("showing-result");

      
      setTimeout(() => {
         this.modalElement.classList.remove("visible");
      }, 3000);
   }
}



const trivgame = new TriviaGameShow(document.querySelector(".app"));
let curr_question = null;


let clientId = null;
let gameId = null;
let myNo = null;
let clients = {}
let score = 0;
let scorech = score; 
let trivObjFromServer = null;
let ws = new WebSocket("ws://localhost:9000")  




const btnCreate = document.getElementById("btnCreate"); 
const btnJoin = document.getElementById("btnJoin");
const txtGameId = document.getElementById("txtGameId"); 
const divPlayers = document.getElementById("divPlayers");
const score1 = document.getElementById("score1");
const score2 = document.getElementById("score2");
const score0 = document.getElementById("score0");

btnJoin.addEventListener("click", e => {
   if (gameId === null)  
      gameId = txtGameId.value;

   const payLoad = {
      "method": "join",
      "clientId": clientId,
      "gameId": gameId
   }
   ws.send(JSON.stringify(payLoad));
})

btnCreate.addEventListener("click", e => {
   const payLoad = {
      "method": "create",
      "clientId": clientId
   }
   ws.send(JSON.stringify(payLoad));
})

ws.onmessage = message => {
   const response = JSON.parse(message.data);
   //connect
   console.log(response);
   if (response.method === "connect") { 
      clientId = response.clientId;
      console.log("Client id ---> " + clientId + " <--- Set successfully ")
      trivObjFromServer = response.trivobj;
   }

   //create
   if (response.method === "create") {
      gameId = response.game.id; 
      var ele = document.getElementById("share");
      ele.innerHTML = response.game.id;
   }

   //update
   if (response.method === "update") {  
      if (!response.game.state) return; 

      if (gameStated == false) {
         gameStated = true;
         trivgame.initGame(trivObjFromServer);
      }

      const usedQues = response.game.usedQues;

      turnOfPlayer = response.game.turnOfPlayer;
      const htmlBody = document.querySelector("body");
      const turnNotify = document.getElementById("turn-notify");
      if (turnOfPlayer != myNo) {
         htmlBody.style.pointerEvents = "none";
         turnNotify.innerText = `Player ${turnOfPlayer + 1}'s turn!`;
      }
      else {
         htmlBody.style.pointerEvents = "auto";
         turnNotify.innerText = `Your Turn!`;
      }

      if (usedQues) {
         const butt = document.getElementById(usedQues);
         if (butt)
            butt.classList.add("used");
      }
      for (const b of Object.keys(response.game.state)) {
         let scorech = response.game.state[b];
         const ballObject = document.getElementById("score" + b);
         ballObject.innerHTML = scorech;
      }
   }

   // Method : getQuestion -> Recieve the question from the server
   if (response.method === "getQuestion") {
      curr_question = response.question;
      trivgame.clueTextElement.textContent = curr_question;
      console.log(response.question);
   }

   // Method getAnswer -> Recieve evaluated answer from the server
   if (response.method === "getAnswer") {
      isCorrect = response.result;
      correctAns = response.answer;
      trivgame.resultTextElement.textContent = correctAns;

      if (isCorrect) {
         trivgame.updateScore(trivgame.clues[cid].value);
         const payLoad = {
            "method": "updateScore",
            "gameId": gameId,
            "clientId": clientId,
            "scoreId": myNo,
            "newScore": score
         }
         ws.send(JSON.stringify(payLoad));
      }

     
      trivgame.revealAnswer(isCorrect);
      console.log("isCorrect", isCorrect);
      console.log("Right ans", correctAns);
   }

   
   if (response.method === "join") {
      let game = response.game;
      clients = game.clients;

      while (divPlayers.firstChild) 
         divPlayers.removeChild(divPlayers.firstChild)

      game.clients.forEach(c => {  
         const d = document.createElement("div"); 
         d.style.width = "500px";
         d.textContent = c.clientId;   
         divPlayers.appendChild(d);
         
         if (c.clientId === clientId) myNo = c.clientNo; 
         console.log("clientNo :" + myNo);
         console.log("score :" + score);
         const payLoad = {
            "method": "updateScore",
            "gameId": gameId,
            "clientId": clientId,
            "scoreId": myNo,
            "newScore": score
         }
         ws.send(JSON.stringify(payLoad));
      })
   }

} 
