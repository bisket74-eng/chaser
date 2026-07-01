/* CHASER TEXAS HOLDEM */
;(function () {
"use strict";

const STARTING_CHIPS = 1000;
const SMALL_BLIND    = 10;
const BIG_BLIND      = 20;
const MAX_PLAYERS    = 6;
const DEALER_BOT_ID  = "texas-holdem-dealer-bot";

const SUITS = ["♠","♥","♦","♣"];
const RANKS = [
    {r:"2",v:2},{r:"3",v:3},{r:"4",v:4},{r:"5",v:5},{r:"6",v:6},{r:"7",v:7},
    {r:"8",v:8},{r:"9",v:9},{r:"10",v:10},{r:"J",v:11},{r:"Q",v:12},{r:"K",v:13},{r:"A",v:14}
];

/* ── Utilities ── */

function getMyId() {
    if (typeof window.myId === "function") return window.myId();
    if (typeof window.myId === "string")   return window.myId;
    return localStorage.getItem("rider_id") || "local-player";
}
function myName() {
    const input = document.getElementById("username");
    return (input && input.value.trim()) || localStorage.getItem("rider_saved_name") || "Player";
}
function canvas()    { return document.getElementById("gameCanvasContainer"); }
function escapeHtml(v) {
    return String(v||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
function openStage() { const s=document.getElementById("activeGameStage"); if(s)s.classList.add("open"); }
function setHeader() {
    const rd=document.getElementById("roomDisplayCode");
    const hb=document.getElementById("headerActionButtonsContainer");
    const ch=document.getElementById("chatHeader");
    if(rd)rd.innerText="♠️ Texas Hold'em";
    if(hb)hb.style.display="none";
    if(ch)ch.classList.add("game-active-mode");
}
function syncTexas() {
    if(typeof channel!=="undefined"&&channel&&window.texasHoldemState){
        channel.send({type:"broadcast",event:"texasholdem-sync-state",payload:{
            state:window.texasHoldemState,
            roomGameId:window.chaserGame&&window.chaserGame.activeGameId?window.chaserGame.activeGameId:null
        }});
    }
}

/* ── Deck ── */

function shuffleDeck(deck) {
    for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=deck[i];deck[i]=deck[j];deck[j]=t;}
    return deck;
}
function makeDeck() {
    const deck=[];
    SUITS.forEach(function(s){RANKS.forEach(function(r){deck.push({suit:s,rank:r.r,value:r.v});});});
    return shuffleDeck(deck);
}

/* ── Players / State ── */

function makePlayers() {
    const lobby=window.chaserGame&&window.chaserGame.players&&window.chaserGame.players.length
        ?window.chaserGame.players:[{id:getMyId(),name:myName(),seat:0}];
    const players=lobby.slice(0,MAX_PLAYERS).map(function(p,idx){
        return {id:p.id,name:p.name||"Player "+(idx+1),isComputer:false,
            chips:STARTING_CHIPS,hand:[],folded:false,allIn:false,bet:0,acted:false,lastAction:""};
    });
    if(players.length===1){
        players.push({id:DEALER_BOT_ID,name:"Computer",isComputer:true,
            chips:STARTING_CHIPS,hand:[],folded:false,allIn:false,bet:0,acted:false,lastAction:""});
    }
    return players;
}
function createState() {
    return {phase:"table",handNumber:0,deck:[],community:[],players:makePlayers(),
        dealerIndex:0,turnIndex:0,round:"waiting",pot:0,currentBet:0,minRaise:BIG_BLIND,
        message:"Tap Deal Hand to start.",lastResult:"",winners:[]};
}

/* ── Player queries ── */

function playersInHand() {
    const st=window.texasHoldemState; if(!st)return[];
    return st.players.filter(function(p){return p.hand&&p.hand.length;});
}
function livePlayers()  { return playersInHand().filter(function(p){return !p.folded;}); }
function myPlayer()     { const st=window.texasHoldemState;if(!st)return null;return st.players.find(function(p){return p.id===getMyId();})||null; }
function currentPlayer(){ const st=window.texasHoldemState;if(!st)return null;return st.players[st.turnIndex]||null; }
function isMyTurn()     { const p=currentPlayer();return p&&p.id===getMyId(); }

/* ── Index helpers ── */

function nextIndexFrom(start,fn) {
    const st=window.texasHoldemState;if(!st||!st.players.length)return 0;
    for(let step=1;step<=st.players.length;step++){
        const idx=(start+step)%st.players.length;
        if(fn(st.players[idx],idx))return idx;
    }
    return start;
}
function firstActiveIndexAfter(start) {
    return nextIndexFrom(start,function(p){return p.hand.length&&!p.folded&&!p.allIn&&p.chips>0;});
}

/* Returns {sb, bb} as player-array indices for the current hand */
function getBlindIndices() {
    const st=window.texasHoldemState;
    if(!st||st.phase==="table")return{sb:-1,bb:-1};
    const hand=playersInHand();
    if(hand.length<2)return{sb:-1,bb:-1};
    let sbIdx,bbIdx;
    if(hand.length===2){
        sbIdx=st.dealerIndex;
        bbIdx=nextIndexFrom(sbIdx,function(p){return p.hand.length;});
    } else {
        sbIdx=nextIndexFrom(st.dealerIndex,function(p){return p.hand.length;});
        bbIdx=nextIndexFrom(sbIdx,function(p){return p.hand.length;});
    }
    return{sb:sbIdx,bb:bbIdx};
}

/* ── Betting primitives ── */

function resetBetsForNewRound() {
    const st=window.texasHoldemState;
    st.currentBet=0;st.minRaise=BIG_BLIND;
    st.players.forEach(function(p){p.bet=0;p.acted=false;});
}
function commitBet(player,amount) {
    const paid=Math.max(0,Math.min(player.chips,amount));
    player.chips-=paid;player.bet+=paid;window.texasHoldemState.pot+=paid;
    if(player.chips<=0){player.chips=0;player.allIn=true;}
    return paid;
}
function postBlind(index,amount,label) {
    const st=window.texasHoldemState;const p=st.players[index];
    commitBet(p,amount);p.acted=false;p.lastAction=label+" "+amount;
    if(p.bet>st.currentBet)st.currentBet=p.bet;
}

/* ── Deal ── */

function dealHand() {
    const st=window.texasHoldemState;if(!st)return;
    window.texasPendingBet=0;
    let seated=st.players.filter(function(p){return p.chips>0;});
    if(seated.length<2){st.players=makePlayers();seated=st.players;}
    st.phase="playing";st.round="preflop";st.handNumber++;
    st.deck=makeDeck();st.community=[];st.pot=0;st.currentBet=0;st.minRaise=BIG_BLIND;st.winners=[];st.lastResult="";
    st.players.forEach(function(p){p.hand=[];p.folded=false;p.allIn=false;p.bet=0;p.acted=false;p.lastAction="";});
    st.players.forEach(function(p){if(p.chips>0){p.hand.push(st.deck.pop());p.hand.push(st.deck.pop());}});
    const hand=playersInHand();
    if(hand.length<2){st.message="Need at least two players with chips.";st.phase="table";return;}
    st.dealerIndex=nextIndexFrom(st.dealerIndex-1+st.players.length,function(p){return p.hand.length&&p.chips>=0;});
    let sbIdx,bbIdx;
    if(hand.length===2){sbIdx=st.dealerIndex;bbIdx=nextIndexFrom(sbIdx,function(p){return p.hand.length;});}
    else{sbIdx=nextIndexFrom(st.dealerIndex,function(p){return p.hand.length;});bbIdx=nextIndexFrom(sbIdx,function(p){return p.hand.length;});}
    postBlind(sbIdx,SMALL_BLIND,"SB");
    postBlind(bbIdx,BIG_BLIND,"BB");
    st.turnIndex=nextIndexFrom(bbIdx,function(p){return p.hand.length&&!p.folded&&!p.allIn&&p.chips>0;});
    st.message=st.players[st.turnIndex].name+" to act.";
    renderTexas();syncTexas();maybeComputerAction();
}

/* ── Round management ── */

function bettingRoundComplete() {
    const st=window.texasHoldemState;const live=livePlayers();
    if(live.length<=1)return true;
    return live.every(function(p){if(p.allIn||p.chips<=0)return true;return p.acted&&p.bet===st.currentBet;});
}
function advanceRound() {
    const st=window.texasHoldemState;
    window.texasPendingBet=0;
    if(livePlayers().length<=1){finishHand();return;}
    if(st.round==="preflop"){resetBetsForNewRound();st.community.push(st.deck.pop());st.community.push(st.deck.pop());st.community.push(st.deck.pop());st.round="flop";}
    else if(st.round==="flop"){resetBetsForNewRound();st.community.push(st.deck.pop());st.round="turn";}
    else if(st.round==="turn"){resetBetsForNewRound();st.community.push(st.deck.pop());st.round="river";}
    else if(st.round==="river"){finishHand();return;}
    st.turnIndex=firstActiveIndexAfter(st.dealerIndex);
    st.message=st.players[st.turnIndex].name+" to act.";
}
function advanceTurn() {
    const st=window.texasHoldemState;
    if(bettingRoundComplete()){advanceRound();return;}
    st.turnIndex=nextIndexFrom(st.turnIndex,function(p){return p.hand.length&&!p.folded&&!p.allIn&&p.chips>0;});
    st.message=st.players[st.turnIndex].name+" to act.";
}

/* ── Player actions ── */

function playerFold() {
    const st=window.texasHoldemState;const p=myPlayer();
    if(!st||!p||!isMyTurn()||st.phase!=="playing")return;
    window.texasPendingBet=0;
    p.folded=true;p.acted=true;p.lastAction="Fold";st.message=p.name+" folded.";
    advanceTurn();renderTexas();syncTexas();maybeComputerAction();
}
function playerCheckCall() {
    const st=window.texasHoldemState;const p=myPlayer();
    if(!st||!p||!isMyTurn()||st.phase!=="playing")return;
    window.texasPendingBet=0;
    const toCall=Math.max(0,st.currentBet-p.bet);
    if(toCall>0){const paid=commitBet(p,toCall);p.lastAction="Call "+paid;st.message=p.name+" called.";}
    else{p.lastAction="Check";st.message=p.name+" checked.";}
    p.acted=true;
    advanceTurn();renderTexas();syncTexas();maybeComputerAction();
}
function playerBetRaise() {
    const st=window.texasHoldemState;const p=myPlayer();
    if(!st||!p||!isMyTurn()||st.phase!=="playing")return;
    const pending=window.texasPendingBet||0;
    window.texasPendingBet=0;
    if(pending<=0)return; // require chip selection
    let targetBet;
    if(st.currentBet<=0){targetBet=pending;}
    else{targetBet=st.currentBet+Math.max(pending,st.minRaise);}
    const needed=Math.max(0,Math.min(targetBet-p.bet,p.chips));
    if(needed<=0)return;
    const paid=commitBet(p,needed);
    if(p.bet>st.currentBet){
        st.currentBet=p.bet;
        st.players.forEach(function(other){
            if(other.id!==p.id&&other.hand.length&&!other.folded&&!other.allIn)other.acted=false;
        });
        p.lastAction=p.allIn?"All-in":"Raise "+p.bet;
        st.message=p.name+(p.allIn?" is all-in!":" raised to "+p.bet+".");
    } else {
        p.lastAction="All-in "+paid;st.message=p.name+" is all-in for "+paid+".";
    }
    p.acted=true;
    advanceTurn();renderTexas();syncTexas();maybeComputerAction();
}

/* ── Computer ── */

function computerAction() {
    const st=window.texasHoldemState;const p=currentPlayer();
    if(!st||!p||!p.isComputer||st.phase!=="playing")return;
    const toCall=Math.max(0,st.currentBet-p.bet);
    const strength=roughComputerStrength(p);
    if(toCall>0&&strength<24&&Math.random()<0.35){
        p.folded=true;p.acted=true;p.lastAction="Fold";st.message=p.name+" folded.";
    } else if(strength>62&&p.chips>toCall+st.minRaise&&Math.random()<0.25){
        const targetBet=st.currentBet+st.minRaise;
        const needed=Math.max(0,targetBet-p.bet);
        commitBet(p,needed);st.currentBet=p.bet;
        st.players.forEach(function(other){if(other.id!==p.id&&other.hand.length&&!other.folded&&!other.allIn)other.acted=false;});
        p.acted=true;p.lastAction="Raise";st.message=p.name+" raised.";
    } else {
        if(toCall>0){const paid=commitBet(p,toCall);p.lastAction="Call "+paid;st.message=p.name+" called.";}
        else{p.lastAction="Check";st.message=p.name+" checked.";}
        p.acted=true;
    }
    advanceTurn();renderTexas();syncTexas();maybeComputerAction();
}
function maybeComputerAction() {
    const st=window.texasHoldemState;if(!st||st.phase!=="playing")return;
    const p=currentPlayer();if(!p||!p.isComputer)return;
    if(window.__texasComputerThinking)return;
    window.__texasComputerThinking=true;
    setTimeout(function(){window.__texasComputerThinking=false;computerAction();},700);
}
function roughComputerStrength(player) {
    const cards=player.hand.concat(window.texasHoldemState.community||[]);if(!cards.length)return 0;
    const values=cards.map(function(c){return c.value;}).sort(function(a,b){return b-a;});
    const counts={};values.forEach(function(v){counts[v]=(counts[v]||0)+1;});
    let score=values[0]*2;
    Object.keys(counts).forEach(function(k){if(counts[k]===2)score+=25;if(counts[k]===3)score+=45;if(counts[k]>=4)score+=70;});
    if(player.hand.length===2&&player.hand[0].suit===player.hand[1].suit)score+=8;
    if(player.hand.length===2&&player.hand[0].value===player.hand[1].value)score+=30;
    return score;
}

/* ── Hand evaluation ── */

function finishHand() {
    const st=window.texasHoldemState;const live=livePlayers();
    if(live.length===1){
        live[0].chips+=st.pot;st.winners=[live[0].id];
        st.lastResult=live[0].name+" wins "+st.pot+" chips.";st.message=st.lastResult;
        st.pot=0;st.phase="handOver";st.round="showdown";return;
    }
    const scored=live.map(function(p){return{player:p,score:bestHand(p.hand.concat(st.community))};});
    scored.sort(function(a,b){return compareScores(b.score,a.score);});
    const best=scored[0].score;
    const winners=scored.filter(function(item){return compareScores(item.score,best)===0;});
    const share=Math.floor(st.pot/winners.length);
    winners.forEach(function(item){item.player.chips+=share;});
    st.winners=winners.map(function(item){return item.player.id;});
    st.lastResult=winners.map(function(item){return item.player.name;}).join(" & ")+" win "+st.pot+" chips with "+best.name+".";
    st.message=st.lastResult;st.pot=0;st.phase="handOver";st.round="showdown";
}
function combinations(cards,choose) {
    const result=[];
    function walk(start,combo){
        if(combo.length===choose){result.push(combo.slice());return;}
        for(let i=start;i<cards.length;i++){combo.push(cards[i]);walk(i+1,combo);combo.pop();}
    }
    walk(0,[]);return result;
}
function bestHand(cards) {
    const all=combinations(cards,5);let best=evaluateFive(all[0]);
    for(let i=1;i<all.length;i++){const s=evaluateFive(all[i]);if(compareScores(s,best)>0)best=s;}
    return best;
}
function evaluateFive(cards) {
    const values=cards.map(function(c){return c.value;}).sort(function(a,b){return b-a;});
    const suits=cards.map(function(c){return c.suit;});
    const flush=suits.every(function(s){return s===suits[0];});
    const uv=Array.from(new Set(values)).sort(function(a,b){return b-a;});
    const sh=getStraightHigh(uv);
    const counts={};values.forEach(function(v){counts[v]=(counts[v]||0)+1;});
    const groups=Object.keys(counts).map(function(v){return{value:Number(v),count:counts[v]};})
        .sort(function(a,b){if(b.count!==a.count)return b.count-a.count;return b.value-a.value;});
    if(flush&&sh)return{rank:8,name:sh===14?"Royal Flush":"Straight Flush",kickers:[sh]};
    if(groups[0].count===4)return{rank:7,name:"Four of a Kind",kickers:[groups[0].value,groups[1].value]};
    if(groups[0].count===3&&groups[1].count===2)return{rank:6,name:"Full House",kickers:[groups[0].value,groups[1].value]};
    if(flush)return{rank:5,name:"Flush",kickers:values};
    if(sh)return{rank:4,name:"Straight",kickers:[sh]};
    if(groups[0].count===3)return{rank:3,name:"Three of a Kind",kickers:[groups[0].value].concat(groups.slice(1).map(function(g){return g.value;}))};
    if(groups[0].count===2&&groups[1].count===2)return{rank:2,name:"Two Pair",kickers:[groups[0].value,groups[1].value,groups[2].value]};
    if(groups[0].count===2)return{rank:1,name:"Pair",kickers:[groups[0].value].concat(groups.slice(1).map(function(g){return g.value;}))};
    return{rank:0,name:"High Card",kickers:values};
}
function getStraightHigh(uv) {
    const vals=uv.slice();if(vals.indexOf(14)!==-1)vals.push(1);
    for(let i=0;i<=vals.length-5;i++){
        let ok=true;
        for(let j=1;j<5;j++){if(vals[i+j]!==vals[i]-j){ok=false;break;}}
        if(ok)return vals[i];
    }
    return 0;
}
function compareScores(a,b) {
    if(a.rank!==b.rank)return a.rank-b.rank;
    const len=Math.max(a.kickers.length,b.kickers.length);
    for(let i=0;i<len;i++){const av=a.kickers[i]||0,bv=b.kickers[i]||0;if(av!==bv)return av-bv;}
    return 0;
}

/* ══════════════════════════════
   RENDERING
══════════════════════════════ */

function cardHtml(card,size) {
    const red=card.suit==="♥"||card.suit==="♦";
    const cls=size==="big"?"th-card-big":size==="comm"?"th-card-comm":"th-card-sm";
    return "<div class=\"th-card "+cls+" "+(red?"red":"black")+"\"><span>"+escapeHtml(card.rank)+"</span><b>"+escapeHtml(card.suit)+"</b></div>";
}

function buildSeatTagHtml(p) {
    const st=window.texasHoldemState;
    const current=currentPlayer();
    const idx=st.players.indexOf(p);
    const isTurn=current&&current.id===p.id&&st.phase==="playing";
    const isWinner=st.winners.indexOf(p.id)!==-1;
    const blinds=getBlindIndices();
    const isSB=blinds.sb===idx;
    const isBB=blinds.bb===idx;
    const inHand=p.hand&&p.hand.length>0&&!p.folded;

    let action=p.lastAction||"";
    if(p.folded)action="Folded";
    else if(isTurn)action="Thinking…";
    else if(!action&&st.phase==="playing")action="Waiting";

    let cls="th-seat";
    if(isTurn)cls+=" turn";
    if(p.folded)cls+=" folded";
    if(isWinner)cls+=" winner";

    const blindBadge=isSB?"<span class=\"th-badge-sb\">SB</span>"
                    :isBB?"<span class=\"th-badge-bb\">BB</span>":"";
    const minis=inHand?"<span class=\"th-mcw\"><i class=\"th-mc\"></i><i class=\"th-mc\"></i></span>"
               :p.folded?"<span class=\"th-mcw\"><i class=\"th-mc mc-f\"></i><i class=\"th-mc mc-f\"></i></span>":"";

    return "<div class=\""+cls+"\">"+
        "<span class=\"th-sdot\"></span>"+
        "<span class=\"th-sn\">"+escapeHtml(p.name)+"</span>"+
        minis+
        "<span class=\"th-sc\">"+Number(p.chips||0)+"</span>"+
        blindBadge+
        (action?"<span class=\"th-sa\">"+escapeHtml(action)+"</span>":"")+
    "</div>";
}

function buildCommunityHtml() {
    const st=window.texasHoldemState;
    let html="";
    for(let i=0;i<5;i++){
        html+=st.community[i]?cardHtml(st.community[i],"comm"):"<div class=\"th-card th-card-comm th-empty\"></div>";
    }
    return html;
}

function buildShowdownHtml() {
    const st=window.texasHoldemState;
    const live=livePlayers().length?livePlayers():playersInHand();
    return live.map(function(p){
        const win=st.winners.indexOf(p.id)!==-1;
        const cards=p.hand.length?cardHtml(p.hand[0],"sm")+cardHtml(p.hand[1],"sm"):"";
        return "<div class=\"th-show-p "+(win?"winner":"")+"\">"
            +"<div class=\"th-show-n\">"+(win?"★ ":"")+escapeHtml(p.name)+"</div>"
            +"<div class=\"th-show-c\">"+cards+"</div>"
            +"</div>";
    }).join("");
}

const SEAT_SLOT_ORDER=["across","across-left","across-right","left","right"];

function buildSeatWrapHtml() {
    const st=window.texasHoldemState;
    const me=myPlayer();
    const myIdx=me?st.players.indexOf(me):-1;
    const order=myIdx===-1?st.players.slice():(function(){
        const arr=[];for(let s=1;s<=st.players.length;s++)arr.push(st.players[(myIdx+s)%st.players.length]);return arr;
    })();
    const others=order.filter(function(p){return !me||p.id!==me.id;});
    if(!others.length)return"";
    const slots={across:[],["across-left"]:[],["across-right"]:[],left:[],right:[]};
    others.forEach(function(p,i){slots[SEAT_SLOT_ORDER[Math.min(i,SEAT_SLOT_ORDER.length-1)]].push(p);});
    function rs(name){
        if(!slots[name].length)return"";
        return"<div class=\"th-ssl th-ssl-"+name+"\">"+slots[name].map(buildSeatTagHtml).join("")+"</div>";
    }
    return"<div class=\"th-sw\">"+rs("left")+
        "<div class=\"th-swc\">"+rs("across-left")+rs("across")+rs("across-right")+"</div>"+
        rs("right")+"</div>";
}

/* Right column: chips + action buttons, shown only when it's my turn */
function buildMyRightHtml(canAct) {
    const st=window.texasHoldemState;
    if(!canAct){
        if(st.phase!=="playing")return"";
        const cur=currentPlayer();
        return"<div class=\"th-waiting\">Waiting for<br>"
            +escapeHtml(cur?cur.name:"opponent")+"…</div>";
    }
    const me=myPlayer();
    const toCall=me?Math.max(0,st.currentBet-me.bet):0;
    const pending=window.texasPendingBet||0;

    let pendLabel;
    if(pending>0){
        pendLabel=(st.currentBet>0?"Raise <b>+"+pending+"</b>":"Bet <b>"+pending+"</b>");
    } else {
        pendLabel="<span class=\"th-pltip\">tap chips to "+(st.currentBet>0?"raise":"bet")+"</span>";
    }

    const clearBtn=pending>0
        ?"<button class=\"th-chip-clear\" onclick=\"texasClearPendingBet()\" type=\"button\">✕</button>"
        :"";

    const callText=toCall>0?"Call "+toCall:"Check";
    const canBet=pending>0;
    const betLabel=pending>0?(st.currentBet>0?"+"+pending:" "+pending):(st.currentBet>0?"Raise":"Bet");

    return"<div class=\"th-myright\">"+
        "<div class=\"th-pend-lbl\">"+pendLabel+"</div>"+
        "<div class=\"th-chips-row\">"+
            "<button class=\"th-chip th-cw\" onclick=\"texasAddChip(10)\"  type=\"button\"><span>10</span></button>"+
            "<button class=\"th-chip th-cr\" onclick=\"texasAddChip(50)\"  type=\"button\"><span>50</span></button>"+
            "<button class=\"th-chip th-cb\" onclick=\"texasAddChip(100)\" type=\"button\"><span>100</span></button>"+
            clearBtn+
        "</div>"+
        "<div class=\"th-act-btns\">"+
            "<button onclick=\"texasFold()\"      class=\"th-btn-d\" type=\"button\">Fold</button>"+
            "<button onclick=\"texasCheckCall()\" class=\"th-btn-n\" type=\"button\">"+callText+"</button>"+
            "<button onclick=\"texasBetRaise()\"  class=\"th-btn-g"+(canBet?"":" th-btn-dim")+"\" "+(canBet?"":"disabled")+" type=\"button\">"+betLabel+"</button>"+
        "</div>"+
    "</div>";
}

/* ── Main render ── */

function renderTexas() {
    const el=canvas();const st=window.texasHoldemState;
    if(!el||!st)return;

    const me=myPlayer();
    const canAct=st.phase==="playing"&&isMyTurn()&&me&&!me.folded&&!me.allIn&&me.chips>0;
    const isShowdown=st.phase==="handOver"&&st.round==="showdown";
    const current=currentPlayer();

    const titleLine=st.phase==="playing"&&current?current.name+" to act.":(st.message||"");

    const myCardsHtml=me&&me.hand.length
        ?cardHtml(me.hand[0],"big")+cardHtml(me.hand[1],"big")
        :"<div class=\"th-card th-card-big th-empty\"></div><div class=\"th-card th-card-big th-empty\"></div>";

    // Community cards always shown; showdown adds player hands below
    const tableMiddle=
        "<div class=\"th-pot-badge\">POT&nbsp;&nbsp;"+Number(st.pot||0)+"</div>"+
        "<div class=\"th-sub-title\">Community Cards</div>"+
        "<div class=\"th-community\">"+buildCommunityHtml()+"</div>"+
        (isShowdown
            ?"<div class=\"th-sub-title th-sub-mt\">Showdown</div>"+
              "<div class=\"th-show-row\">"+buildShowdownHtml()+"</div>"
            :"");

    const dealButton=st.phase!=="playing"
        ?"<div class=\"th-deal-row\">"+
            "<button onclick=\"texasDealHand()\"   class=\"th-btn-g\"  type=\"button\">Deal Hand</button>"+
            "<button onclick=\"texasResetTable()\" class=\"th-btn-n\"  type=\"button\">Reset Table</button>"+
          "</div>"
        :"";

    /* ── CSS ── */
    const css=[
        /* Wrapper */
        ".th-wrap{height:100%;overflow:auto;padding:7px 8px 80px;box-sizing:border-box;font-family:Arial,sans-serif;color:#e2f0d9;background:radial-gradient(ellipse at 50% 25%,#14302a 0%,#07150e 100%);}",

        /* Top blind pills — two thin horizontal pills */
        ".th-top{display:flex;gap:8px;max-width:540px;margin:0 auto 7px;}",
        ".th-bpill{flex:1;display:flex;align-items:center;gap:6px;",
            "background:rgba(0,0,0,.38);border:1px solid rgba(255,255,255,.13);",
            "border-radius:20px;padding:5px 12px;font-size:12px;font-weight:700;color:#e2f0d9;}",
        ".th-bpill b{color:#ffd700;margin-left:auto;font-size:13px;}",
        ".th-bdot{width:9px;height:9px;border-radius:50%;flex-shrink:0;}",
        ".th-bdot-bb{background:#e53935;box-shadow:0 0 4px rgba(229,57,53,.6);}",
        ".th-bdot-sb{background:#43a047;box-shadow:0 0 4px rgba(67,160,71,.6);}",

        /* Status */
        ".th-message{text-align:center;color:#ffd700;font-weight:900;font-size:14px;line-height:1.25;max-width:540px;margin:3px auto 3px;text-shadow:0 1px 5px rgba(0,0,0,.6);}",
        ".th-last{text-align:center;color:#a8e6cf;font-size:12px;font-weight:700;max-width:540px;margin:0 auto 5px;}",

        /* Poker table oval */
        ".th-table{max-width:540px;margin:0 auto 8px;",
            "background:radial-gradient(ellipse 92% 80% at 50% 50%,#2e7d52 0%,#1d5c39 50%,#113d26 100%);",
            "border-radius:100px;border:15px solid #5c3319;",
            "box-shadow:inset 0 3px 10px rgba(255,255,255,.08),inset 0 -4px 14px rgba(0,0,0,.55),",
                "0 0 0 3px #3c2110,0 0 0 5px #8a5030,0 0 0 7px #3c2110,0 10px 36px rgba(0,0,0,.75);",
            "padding:14px 14px 12px;position:relative;}",
        ".th-table::before{content:'';position:absolute;inset:4px;border-radius:85px;border:1.5px solid rgba(255,255,255,.1);pointer-events:none;}",

        /* Inside table */
        ".th-pot-badge{text-align:center;color:#ffd700;font-weight:900;font-size:13px;letter-spacing:.8px;margin:0 0 5px;text-shadow:0 1px 6px rgba(0,0,0,.7);}",
        ".th-sub-title{text-align:center;color:rgba(255,255,255,.42);font-size:9px;text-transform:uppercase;letter-spacing:1.2px;font-weight:700;margin:0 0 5px;}",
        ".th-sub-mt{margin-top:10px;}",
        ".th-community{display:flex;gap:5px;justify-content:center;margin:0 auto;}",

        /* Community cards — larger */
        ".th-card-comm{width:52px;height:72px;}",
        ".th-card-comm span{font-size:16px;} .th-card-comm b{font-size:20px;margin-top:3px;}",

        /* Opponent seat wrap */
        ".th-sw{display:flex;align-items:flex-start;justify-content:space-between;gap:5px;margin:0 0 12px;min-height:28px;}",
        ".th-swc{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;flex:1 1 auto;}",
        ".th-ssl{display:flex;flex-direction:column;gap:4px;}",
        ".th-ssl-left,.th-ssl-right{justify-content:center;}",

        /* Compact horizontal seat pill */
        ".th-seat{display:inline-flex;align-items:center;gap:4px;",
            "background:rgba(8,26,16,.93);border:1.5px solid rgba(255,255,255,.12);",
            "border-radius:20px;padding:3px 8px;white-space:nowrap;font-size:10px;color:#e2f0d9;}",
        ".th-seat.turn  {border-color:#ff4444;box-shadow:0 0 0 1.5px #ff4444,0 0 8px rgba(255,68,68,.4);}",
        ".th-seat.folded{opacity:.4;}",
        ".th-seat.winner{border-color:#ffd700;box-shadow:0 0 0 1.5px #ffd700,0 0 8px rgba(255,215,0,.35);}",
        ".th-sdot{width:6px;height:6px;border-radius:50%;background:#4caf50;flex-shrink:0;}",
        ".th-seat.turn   .th-sdot{background:#ff4444;}",
        ".th-seat.winner .th-sdot{background:#ffd700;}",
        ".th-seat.folded .th-sdot{background:#444;}",
        ".th-sn{font-weight:900;font-size:10px;max-width:60px;overflow:hidden;text-overflow:ellipsis;}",
        ".th-mcw{display:inline-flex;gap:2px;margin:0 2px;}",
        ".th-mc{display:inline-block;width:10px;height:14px;border-radius:1.5px;background:linear-gradient(145deg,#1976d2,#0d47a1);border:1px solid rgba(255,255,255,.25);}",
        ".th-mc.mc-f{background:#2a2a2a;opacity:.45;}",
        ".th-sc{font-size:9px;color:rgba(226,240,217,.7);font-weight:700;}",
        ".th-sa{font-size:9px;font-weight:900;color:#ff8a80;}",
        ".th-seat.winner .th-sa{color:#ffd700;} .th-seat.folded .th-sa{color:#666;}",
        ".th-badge-sb{font-size:7px;font-weight:900;background:#2e7d32;color:#fff;padding:1px 3px;border-radius:3px;}",
        ".th-badge-bb{font-size:7px;font-weight:900;background:#c62828;color:#fff;padding:1px 3px;border-radius:3px;}",

        /* Showdown strip */
        ".th-show-row{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;}",
        ".th-show-p{background:rgba(8,22,14,.95);border:1.5px solid rgba(255,255,255,.12);border-radius:9px;padding:5px 7px;text-align:center;}",
        ".th-show-p.winner{border-color:#ffd700;box-shadow:0 0 0 1.5px #ffd700;}",
        ".th-show-n{font-size:10px;font-weight:900;color:#e2f0d9;margin-bottom:4px;white-space:nowrap;}",
        ".th-show-c{display:flex;gap:3px;justify-content:center;}",

        /* Cards */
        ".th-card{background:#fff;border-radius:6px;border:2px solid #ddd;box-shadow:0 2px 6px rgba(0,0,0,.45);display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:900;line-height:1;}",
        /* Small (showdown) */
        ".th-card-sm{width:32px;height:44px;}",
        ".th-card-sm span{font-size:12px;} .th-card-sm b{font-size:14px;margin-top:1px;}",
        /* Big (my hole cards) */
        ".th-card-big{width:62px;height:88px;border-width:3px;}",
        ".th-card-big span{font-size:20px;} .th-card-big b{font-size:28px;margin-top:3px;}",
        ".th-card.red{color:#c41c1c;} .th-card.black{color:#111;}",
        ".th-card.th-empty{background:rgba(255,255,255,.07);border:2px dashed rgba(255,255,255,.2);box-shadow:none;}",

        /* My player area */
        ".th-myarea{max-width:540px;margin:0 auto 6px;background:rgba(0,0,0,.28);border-radius:13px;padding:9px 11px;}",
        ".th-myinfo{display:flex;align-items:center;gap:7px;margin-bottom:7px;flex-wrap:wrap;}",
        ".th-myname{font-weight:900;font-size:14px;color:#e2f0d9;}",
        ".th-mychips{font-size:12px;font-weight:900;color:#ffd700;background:rgba(0,0,0,.35);border-radius:8px;padding:2px 9px;}",
        ".th-mybet-b{font-size:10px;color:rgba(226,240,217,.5);margin-left:auto;font-weight:700;}",

        /* My row: cards left, right column (chips+buttons) flush to top */
        ".th-myrow{display:flex;align-items:flex-start;gap:10px;}",
        ".th-mycards{display:flex;gap:7px;flex-shrink:0;}",

        /* Right column */
        ".th-myright{flex:1;display:flex;flex-direction:column;gap:5px;}",
        ".th-waiting{flex:1;font-size:12px;color:rgba(226,240,217,.5);font-weight:700;padding-top:10px;line-height:1.5;}",
        ".th-pend-lbl{font-size:12px;font-weight:700;color:#ffd700;line-height:1.3;}",
        ".th-pend-lbl b{font-size:14px;}",
        ".th-pltip{font-size:11px;color:rgba(226,240,217,.45);font-weight:400;}",

        /* Chip tray row */
        ".th-chips-row{display:flex;gap:6px;align-items:center;flex-wrap:nowrap;}",

        /* Poker chip — 40px, triple-ring via box-shadow */
        ".th-chip{width:40px;height:40px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:11px;-webkit-tap-highlight-color:transparent;transition:transform .08s;}",
        ".th-chip:active{transform:scale(.87);}",
        ".th-chip span{pointer-events:none;}",
        ".th-cw{background:#f0ead8;color:#2a2a2a;box-shadow:0 0 0 2px #b8ae98,0 0 0 5px #f0ead8,0 0 0 7px #b8ae98,0 2px 7px rgba(0,0,0,.55);}",
        ".th-cr{background:#c0392b;color:#fff;box-shadow:0 0 0 2px #8b1a10,0 0 0 5px #c0392b,0 0 0 7px #8b1a10,0 2px 7px rgba(0,0,0,.55);}",
        ".th-cb{background:#1a1a2e;color:#ffd700;box-shadow:0 0 0 2px #c9a84c,0 0 0 5px #1a1a2e,0 0 0 7px #c9a84c,0 2px 7px rgba(0,0,0,.55);}",
        ".th-chip-clear{width:26px;height:26px;border-radius:50%;border:1.5px solid rgba(255,255,255,.3);background:rgba(255,255,255,.1);color:#fff;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;}",

        /* Action buttons row (inside right column) */
        ".th-act-btns{display:flex;gap:5px;}",
        ".th-act-btns button{flex:1;border:none;border-radius:10px;padding:8px 4px;font-size:11px;font-weight:900;cursor:pointer;-webkit-tap-highlight-color:transparent;box-shadow:0 2px 6px rgba(0,0,0,.4);}",
        ".th-btn-d{background:#c0392b;color:#fff;}",
        ".th-btn-n{background:#dde8d5;color:#1a2e1a;}",
        ".th-btn-g{background:#ffd700;color:#1a1a1a;}",
        ".th-btn-dim{opacity:.4;cursor:default;}",
        ".th-act-btns button:disabled{opacity:.35 !important;cursor:default;}",

        /* Deal row (between hands) */
        ".th-deal-row{display:flex;gap:8px;justify-content:center;margin:6px auto;max-width:340px;}",
        ".th-deal-row button{flex:1;border:none;border-radius:12px;padding:10px 12px;font-size:14px;font-weight:900;cursor:pointer;-webkit-tap-highlight-color:transparent;box-shadow:0 3px 9px rgba(0,0,0,.4);}",

        /* Rules */
        ".th-rules{font-size:10px;text-align:center;color:rgba(226,240,217,.35);max-width:540px;margin:4px auto 0;line-height:1.4;}",

        /* Responsive */
        "@media(max-width:390px){",
            ".th-wrap{padding:5px 6px 80px;}",
            ".th-card-comm{width:44px;height:62px;}",
            ".th-card-comm span{font-size:13px;} .th-card-comm b{font-size:17px;}",
            ".th-card-big{width:54px;height:76px;}",
            ".th-card-big span{font-size:17px;} .th-card-big b{font-size:24px;}",
            ".th-chip{width:36px;height:36px;font-size:10px;}",
        "}"
    ].join("");

    el.innerHTML=[
        "<style>",css,"</style>",
        "<div class=\"th-wrap\">",

        /* Two thin blind pills */
        "<div class=\"th-top\">",
            "<div class=\"th-bpill\"><span class=\"th-bdot th-bdot-bb\"></span>Big Blind<b>",BIG_BLIND,"</b></div>",
            "<div class=\"th-bpill\"><span class=\"th-bdot th-bdot-sb\"></span>Small Blind<b>",SMALL_BLIND,"</b></div>",
        "</div>",

        /* Status */
        "<div class=\"th-message\">",escapeHtml(titleLine),"</div>",
        st.lastResult?"<div class=\"th-last\">"+escapeHtml(st.lastResult)+"</div>":"",

        /* Table */
        "<div class=\"th-table\">",
            buildSeatWrapHtml(),
            tableMiddle,
        "</div>",

        /* My area */
        "<div class=\"th-myarea\">",
            "<div class=\"th-myinfo\">",
                "<span class=\"th-myname\">",escapeHtml(me?me.name:"You"),"</span>",
                "<span class=\"th-mychips\">&#9672; ",Number(me?me.chips:0),"</span>",
                me&&me.bet?"<span class=\"th-mybet-b\">"+me.bet+" in pot</span>":"",
            "</div>",
            "<div class=\"th-myrow\">",
                "<div class=\"th-mycards\">",myCardsHtml,"</div>",
                buildMyRightHtml(canAct),
            "</div>",
        "</div>",

        dealButton,
        "<div class=\"th-rules\">Fake chips only &middot; Texas Hold'em &middot; Best five-card hand wins the pot.</div>",
        "</div>"
    ].join("");

    maybeComputerAction();
}

/* ── Chip tap API ── */

window.texasPendingBet=0;

window.texasAddChip=function(amount){
    const p=myPlayer();
    if(!window.texasHoldemState||!p||!isMyTurn()||window.texasHoldemState.phase!=="playing")return;
    window.texasPendingBet=Math.min((window.texasPendingBet||0)+amount,p.chips);
    renderTexas();
};
window.texasClearPendingBet=function(){
    window.texasPendingBet=0;renderTexas();
};

/* ── Public game API ── */

window.texasDealHand   =dealHand;
window.texasFold       =playerFold;
window.texasCheckCall  =playerCheckCall;
window.texasBetRaise   =playerBetRaise;

window.texasResetTable=function(){
    window.texasHoldemState=createState();window.texasPendingBet=0;renderTexas();syncTexas();
};

window.initTexasHoldemGame=function(){
    window.chaserGame=window.chaserGame||{};
    window.chaserGame.activeGame="TexasHoldem";
    openStage();setHeader();
    const amHost=window.chaserGame&&window.chaserGame.hostId===getMyId();
    if(amHost||!window.texasHoldemState){
        window.texasHoldemState=createState();window.texasPendingBet=0;syncTexas();
    }
    renderTexas();
};

window.handleIncomingTexasHoldemSync=function(payload){
    if(!payload||!payload.state)return;
    if(payload.roomGameId&&window.chaserGame&&window.chaserGame.activeGameId&&
        payload.roomGameId!==window.chaserGame.activeGameId)return;
    window.texasHoldemState=payload.state;
    if(window.chaserGame)window.chaserGame.activeGame="TexasHoldem";
    renderTexas();
};

window.startTexasHoldemFromLobby=window.initTexasHoldemGame;
window.startTexasHoldemGame     =window.initTexasHoldemGame;
window.initTexasHoldem          =window.initTexasHoldemGame;
window.initTexasHoldEmGame      =window.initTexasHoldemGame;
window.startTexasHoldEmGame     =window.initTexasHoldemGame;

})();
