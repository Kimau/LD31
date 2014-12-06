// Ludum Dare 31: Entire Game on One Screen by Claire Blackshaw (Kimau)
//                         
// [^ \n][ ]*\{[ ]*$
//------------------------------------------------------------------------
/*jshint multistr:true */
/*jshint sub:true */
/*jshint browser:true */

var m = new MersenneTwister();

// Game Resources
var NEW_GAME_STATE = {
    playerName: "Player1"
}; 
var gameState = {};
var gameResources = {};
var gameCanvas;

var WIDTH = 400;
var HEIGHT = 300;

//------------------------------------------------------------------------
// Helper Functions
var makeMask = function(bits,shift) { x = ((Math.pow(2,bits)-1)<<shift); return x + ": " + x.toString(2)}
var $ = function(id) { return document.getElementById(id); }
var clearLive = function() { $("liveOutput").innerHTML = ""; }
var numberWithCommas = function(x) { return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
var stopEv = function(e) { e.stopPropagation(); }
var shuffle = function(v){
    for(var j, x, i = v.length; i; j = parseInt(Math.random() * i), x = v[--i], v[i] = v[j], v[j] = x);
    return v;
};
var live = function(label, val, longLabel) 
{
    if(typeof(val) == "number")
    {
        val = val.toFixed(2);
    }

    if($("lo_" + label) === undefined)
    {
        if(longLabel === undefined) { longLabel = label; }
        $("liveOutput").innerHTML += "<dt>" + longLabel + '</dt><dd id="lo_' + label + '">' + val + '</dd>';
    }

    $("lo_" + label).innerHTML = val;
}

//---------------------------------------------------------------------
// Core
var createPopup = function(head,body)
{
    var x = "";

    x += '<div class="blackPopup" id="popup"><h1 id="popHead">';
    x += head;
    x += '</h1><div id="popBody">';
    x += body;
    x += '</div></div>';

    $("gameBox").innerHTML += x;
}

var setPopup = function(head,body)
{
    var x = $("popup");

    if(x)
    {
        if(head !== undefined)
            $("popHead").innerHTML = head;

        if(body !== undefined)
            $("popBody").innerHTML = body;
    }
    else
    {
        createPopup(head,body);
    }
}

function initGame()
{
    gameCanvasDom = $("canvas");
    gameCanvas = gameCanvasDom.getContext("2d");

    gameResources["house"] = $("imgHouse");
    
    createNewGame();
    console.log("Game Started"); 
    gameCanvasDom.onclick = spawnSnowAtMouse;
    draw();
}

function createNewGame(playerName)
{
    gameState = NEW_GAME_STATE; 
    gameState.snowArray = new Uint16Array(WIDTH*HEIGHT);
    gameState.oldSnowArray = gameState.snowArray;

    gameCanvas.fillStyle = "#000";
    gameCanvas.fillRect(0,0,WIDTH,HEIGHT);
    gameCanvas.drawImage(gameResources["house"],0,0,WIDTH,HEIGHT);
    gameState.imageLevel = gameCanvas.getImageData(0,0,WIDTH,HEIGHT);

    for(var i=0; i<gameState.snowArray.length; ++i) {
        if((gameState.imageLevel.data[i*4+0]+
            gameState.imageLevel.data[i*4+1]+
            gameState.imageLevel.data[i*4+2]) > 0)
            gameState.snowArray[i] = SNOW_SOLID;
    }

    gameState.imageFinal = gameCanvas.createImageData(WIDTH,HEIGHT);
} 

var timeSinceLast = 0;
var intFrameID = 0;
function gameUpdate(dt) {
    ++intFrameID;
    if((dt+timeSinceLast) < 30)
    { 
        timeSinceLast += dt;
        return;
    }
    timeSinceLast = timeSinceLast + dt - 30;

    // Spawn Snow
    for(x=0;x<WIDTH;x++) 
    { 
        if(Math.random() > 0.99)  
            spawnSnow(x,1);
    }

    // Move Snow 
    gameState.oldSnowArray.set(gameState.snowArray);
    gameState.snowArray = new Uint16Array(WIDTH*HEIGHT);
    for(var i=0; i<gameState.snowArray.length; ++i) { 
        if(gameState.oldSnowArray[i] & BIT_SOLID)
        {
            gameState.snowArray[i] = gameState.oldSnowArray[i];
        }
        else if(gameState.oldSnowArray[i] & BIT_REST)
        {
            gameState.snowArray[i] = gameState.oldSnowArray[i];
        }
        else if(gameState.oldSnowArray[i] & BIT_SNOW)
        {
            var x = i % WIDTH;
            var y = HEIGHT - Math.floor(i / WIDTH);
            var sf = getSnowFlake(gameState.oldSnowArray[i]);

            var oldY = sf[1];
            sf[1] -= (Math.random() * 5); 
            sf[0] += (Math.random()*4.0);
  
            var res = makeSnowFlake(sf); 
            if(res[1]) // is Snowflake moving this frame
            {
                var p = getSnowFlake(res[0]);
                if(Math.abs(sf[0]/sf[1]) > Math.random())
                    x += (sf[0]>0.1) -(sf[0]<-0.1);
                if(Math.abs(sf[1]/sf[0]) > Math.random())
                    y += (sf[1]>0.1) -(sf[1]<-0.1);

                if((x<0) || (x>WIDTH) || (y<0) || (y>HEIGHT))
                    continue;

                var di = x+(HEIGHT-y)*WIDTH;

                if(gameState.oldSnowArray[di] & BIT_SOLID)
                {
                    gameState.snowArray[i] = res[0];
                }
                else if(gameState.oldSnowArray[di] & BIT_SNOW)
                {
                    gameState.snowArray[i] = res[0];
                }
                else
                {
                    gameState.snowArray[di] = res[0];
                }
            }
            else
            {
                gameState.snowArray[i] = res[0];   
            }
        }
    }

    // Make Image Data
    gameState.imageFinal.data.set(gameState.imageLevel.data);
    for(var i=0; i<gameState.snowArray.length; ++i) {
        if(gameState.snowArray[i] & BIT_SNOW)
        {
            gameState.imageFinal.data[i*4+0] = 255;
            gameState.imageFinal.data[i*4+1] = 255;
            gameState.imageFinal.data[i*4+2] = 255;
            gameState.imageFinal.data[i*4+3] = 255;
        }

        if(gameState.snowArray[i] & BIT_SOLID)
        { 
            gameState.imageFinal.data[i*4+0] = 255;
        }
    }
}

var continueUpdate = true;
var prevTime; 
function draw() {
    if(continueUpdate)
        requestAnimationFrame(draw);
    var now = new Date().getTime();
    var dt = now - (prevTime || now);
    prevTime = now;

    // Game Update
    gameUpdate(dt);

    // Drawing code goes here
    gameCanvas.putImageData(gameState.imageFinal,0,0); 
}


//------------------------------------------------------------------------
// Snow

// Snow
var BIT_SNOW = 1;      //                   1
var BIT_SOLID = 2;     //                  10
var MASK_DIR = 124;    //            111 1100
var MASK_SPEED = 896;  //        11 1000 0000
var MASK_FRAME = 7168; //    1 1100 0000 0000
var BIT_REST = 32768;  // 1000 0000 0000 0000
var SHIFT_DIR = 2;
var SHIFT_SPEED = 7;
var SHIFT_FRAME = 10;
var MAX_DEG = 31;
var DIR_TO_DEG = ((Math.PI * 2.0) / MAX_DEG);
var DEG_TO_DIR = (MAX_DEG / (Math.PI * 2.0));
var DEFAULT_DIR = 8; // DOWN
var MAX_SPEED = 7;
var SNOW_EMPTY = 0; 
var SNOW_REST = BIT_SNOW | BIT_REST;
var SNOW_SOLID = BIT_SOLID;

function getSnowFlake(s)
{
    if((s & BIT_SNOW) == 0)
        return null;
    if(s & BIT_REST)
        return [0,0,-1];
    
    var deg = ((s & MASK_DIR) >> SHIFT_DIR) * DIR_TO_DEG - Math.PI;
    deg = deg % Math.PI; 
    var speed = (s & MASK_SPEED) >> SHIFT_SPEED;
    var frame = (s & MASK_FRAME) >> SHIFT_FRAME;

    var x = (Math.cos(deg)*speed);
    var y = (Math.sin(deg)*speed);

    return [x,y,frame,false,speed]; 
}

function makeSnowFlake(sf)
{
    var x = sf[0] | 0;
    var y = sf[1] | 0;
    var f = sf[2] | 0;
    var isRest = sf[3] | false;

    if(isRest)
        return [SNOW_REST,false];
              
    var deg = Math.atan2(y,x) + Math.PI;
    deg = (deg * DEG_TO_DIR);
     
    var speed = Math.sqrt(x*x+y*y);
    if(speed < 1)
    {
        speed = 1; 
        deg = DEFAULT_DIR;  // fall down
    }
    else
    {
        speed = Math.round(Math.min(MAX_SPEED, speed));
    } 

    f += speed;
    var updateThisFrame = (f >= MAX_SPEED);
    f = Math.floor(f%MAX_SPEED);

    // Bit Pack & Return
    var s = BIT_SNOW;
    s |= deg << SHIFT_DIR;
    s |= speed << SHIFT_SPEED;
    s |= f << SHIFT_FRAME;
    return [s,updateThisFrame]; 
}

function spawnSnowAtMouse(e)
{
    spawnSnow(e.layerX / 2.0, (e.layerY / 2.0));
}

function spawnSnow(x,y)
{
    x = parseInt(x);
    y = parseInt(y); 
    if(gameState.snowArray[x+y*WIDTH] & BIT_SOLID)
        return;
    
    gameState.snowArray[x+y*WIDTH] = makeSnowFlake([0,0])[0];
    //console.log("Made Snow at " + x + ":" + y);
}