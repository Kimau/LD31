// Ludum Dare 31: Entire Game on One Screen by Claire Blackshaw (Kimau)
//                         
// [^ \n][ ]*\{[ ]*$
//------------------------------------------------------------------------
/*jshint multistr:true */
/*jshint sub:true */
/*jshint browser:true */

/* ;( function() { OPTIMIZE */

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
    gameResources["back"] = $("imgBack");
    gameResources["grad"] = $("imgGrad"); 
    
    createNewGame();
    console.log("Game Started"); 
    gameCanvasDom.onclick = spawnSnowAtMouse;
    draw();
}

function createNewGame(playerName)
{
    gameState = NEW_GAME_STATE; 
    gameState.snowArray = new Uint16Array(WIDTH*HEIGHT);
    gameState.backSnowArray = new Uint16Array(WIDTH*HEIGHT);

    // Create Background
    gameCanvas.fillStyle = "#000";
    gameCanvas.fillRect(0,0,WIDTH,HEIGHT);
    gameCanvas.drawImage(gameResources["back"],0,0,WIDTH,HEIGHT);
    gameState.imageLevel = gameCanvas.getImageData(0,0,WIDTH,HEIGHT);

    for(var i=0; i<gameState.snowArray.length; ++i) {
        if((gameState.imageLevel.data[i*4+0]+
            gameState.imageLevel.data[i*4+1]+
            gameState.imageLevel.data[i*4+2]) > 0)
            gameState.backSnowArray[i] = SNOW_SOLID;
    }

    // Create Foreground
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

    // Create Real Image Background
    gameCanvas.drawImage(gameResources["grad"],0,0,WIDTH,HEIGHT);
    gameCanvas.drawImage(gameResources["back"],0,0,WIDTH,HEIGHT);
    gameState.imageLevel = gameCanvas.getImageData(0,0,WIDTH,HEIGHT);

    gameCanvas.clearRect(0,0,WIDTH,HEIGHT);
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
    timeSinceLast = (timeSinceLast + dt) % 30;

    updateSnow(gameState.snowArray);
    updateSnow(gameState.backSnowArray);
}

var continueUpdate = true;
var prevTime = performance.now(); 
function draw() {
    if(continueUpdate)
        requestAnimationFrame(draw);
    var now = performance.now();
    var dt = now - prevTime;
    prevTime = now;

    // Game Update
    gameUpdate(dt);

    // Drawing code goes here
    gameState.imageFinal.data.set(gameState.imageLevel.data);
    
    for(var i=0; i<gameState.snowArray.length; ++i) {
        if(gameState.backSnowArray[i] & BIT_SNOW)
        {            
            gameState.imageFinal.data[i*4+0] = 200;
            gameState.imageFinal.data[i*4+1] = 200;
            gameState.imageFinal.data[i*4+2] = 200;
            gameState.imageFinal.data[i*4+3] = 255;
        }
    }
    gameCanvas.putImageData(gameState.imageFinal,0,0);
    gameCanvas.drawImage(gameResources["house"],0,0,WIDTH,HEIGHT);
    gameState.imageFinal = gameCanvas.getImageData(0,0,WIDTH,HEIGHT);

    for(var i=0; i<gameState.snowArray.length; ++i) {
        if(gameState.snowArray[i] & BIT_SNOW)
        {
            gameState.imageFinal.data[i*4+0] = 255;
            gameState.imageFinal.data[i*4+1] = 255;
            gameState.imageFinal.data[i*4+2] = 255;
            gameState.imageFinal.data[i*4+3] = 255;
        }
    }
    
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
var MASK_COL = 24576;  //  110 0000 0000 0000
var BIT_REST = 32768;  // 1000 0000 0000 0000
var MASK_MVINV = 57347 // 1110 0000 0000 0011
var MASK_SUPPOT = BIT_REST | BIT_SOLID | BIT_SNOW;
var SHIFT_DIR = 2;
var SHIFT_SPEED = 7;
var SHIFT_FRAME = 10;
var SHIFT_COL = 13;
var MAX_DEG = 31;
var DIR_TO_DEG = ((Math.PI * 2.0) / MAX_DEG);
var DEG_TO_DIR = (MAX_DEG / (Math.PI * 2.0));
var DEFAULT_DIR = 8; // DOWN
var MAX_SPEED = 7;
var SNOW_EMPTY = 0; 
var SNOW_REST = BIT_SNOW | BIT_REST;
var SNOW_SOLID = BIT_SOLID;

var SNOW_MELT_CHANCE = 0.0001;
var SNOWFALL_CHANCE_INVERT = 0.99;
var SNOW_SPAWN_SIZE = 30;

function getSnowFlake(s)
{
    if((s & BIT_SNOW) == 0)
        return null;
    if(s & BIT_REST)
        return [0,0,-1];
    
    var deg = ((s & MASK_DIR) >> SHIFT_DIR) * DIR_TO_DEG - Math.PI;
    deg = deg % Math.PI; 
    var speed = (s & MASK_SPEED) >> SHIFT_SPEED;
    
    var x = (Math.cos(deg)*speed);
    var y = (Math.sin(deg)*speed);

    return [x,y]; 
}

function makeSnowFlake()
{
    return 1185;
}

function updateSnowFlake(s, sf)
{
    var x = sf[0] | 0;
    var y = sf[1] | 0;
    var frame = (s & MASK_FRAME) >> SHIFT_FRAME;
              
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

    frame += speed;
    var updateThisFrame = (frame >= MAX_SPEED);
    frame = Math.floor(frame%MAX_SPEED);

    // Bit Pack & Return
    s &= MASK_MVINV;
    s |= deg << SHIFT_DIR;
    s |= speed << SHIFT_SPEED; 
    s |= frame << SHIFT_FRAME;
    return [s,updateThisFrame]; 
}

function spawnSnowAtMouse(e)
{
    var x = e.layerX / 2.0;
    var y = e.layerY / 2.0;

    for(var sx=-SNOW_SPAWN_SIZE; sx < SNOW_SPAWN_SIZE; ++sx)
    for(var sy=-SNOW_SPAWN_SIZE; sy < SNOW_SPAWN_SIZE; ++sy)
    {
        var c = 1 + Math.log2((sx*sx+sy*sy) / SNOW_SPAWN_SIZE);
        if(c < Math.random())
            spawnSnow(x + sx, y + sy, gameState.backSnowArray);
        if(c < Math.random())
            spawnSnow(x + sx, y + sy, gameState.snowArray);
    }
}

function spawnSnow(x,y,buff)
{
    x = parseInt(x)|0;
    y = parseInt(y)|0;

    if(buff[x+y*WIDTH] & BIT_SOLID)
        return;
    
    buff[x+y*WIDTH] = makeSnowFlake();
}

var newBuf = new Uint16Array(WIDTH*HEIGHT);
function updateSnow(oldBuf)
{
    for (var i = 0; i < newBuf.length; i++) {
        newBuf[i] = 0;
    };

    // Spawn Snow
    for(x=0;x<WIDTH;x++) 
    { 
        if(Math.random() > SNOWFALL_CHANCE_INVERT)  
            spawnSnow(x,1,oldBuf);
    }

    // Move Snow 
    for(var i=0; i<newBuf.length; ++i) { 
        if(oldBuf[i] & BIT_SOLID)
        {
            newBuf[i] = oldBuf[i];
        }
        else if(oldBuf[i] & BIT_REST)
        {
            var x = i % WIDTH;
            var y = HEIGHT - Math.floor(i / WIDTH);

            if(Math.random() < SNOW_MELT_CHANCE)
            {
                newBuf[i] = oldBuf[i];  // Random Melt
                var upI = i;
                while((upI > WIDTH) && (newBuf[upI-WIDTH] & BIT_REST)) { upI -= WIDTH; }
                newBuf[upI] = 0; 
            }
            else if( (x>1) && 
                (x<(WIDTH-2)) && 
                (y<(HEIGHT-1)) &&
                (oldBuf[i+WIDTH] & MASK_SUPPOT) && 
                (oldBuf[i-1] & MASK_SUPPOT) &&
                (oldBuf[i+1] & MASK_SUPPOT))
            {
                newBuf[i] = oldBuf[i];
            }
            else
            { 
                newBuf[i] = makeSnowFlake();
                var upI = i;
                while((upI > WIDTH) && (newBuf[upI] & BIT_REST))
                {
                    newBuf[upI] |= BIT_REST;
                    upI -= WIDTH;
                }
            }
        }
        else if(oldBuf[i] & BIT_SNOW)
        {
            var x = i % WIDTH;
            var y = HEIGHT - Math.floor(i / WIDTH);
            var sf = getSnowFlake(oldBuf[i]);

            var oldY = sf[1];
            sf[1] -= (Math.random() * 5); 
            sf[0] += (Math.random()*2.0) - 0.5*Math.sin(intFrameID / 100.0); 
  
            var res = updateSnowFlake(oldBuf[i], sf); 
            if(res[1]) // is Snowflake moving this frame
            {
                if(Math.abs(sf[0]/sf[1]) > Math.random())
                    x += (sf[0]>0.1) -(sf[0]<-0.1);
                if(Math.abs(sf[1]/sf[0]) > Math.random())
                    y += (sf[1]>0.1) -(sf[1]<-0.1);

                if((x<0) || (x>WIDTH) || (y<0) || (y>HEIGHT))
                    continue;

                var di = x+(HEIGHT-y)*WIDTH;

                if(oldBuf[di] != 0)
                {
                    if((x>0) && (oldBuf[di-1] == 0))
                    {
                        newBuf[di-1] = res[0];
                    }
                    else if((x<(WIDTH-1)) && (oldBuf[di+1] == 0))
                    {
                        newBuf[di-1] = res[0];
                    }
                    else
                    {
                        if((x>1) && (oldBuf[di-2] != 0) && (x<(WIDTH-2)) && (oldBuf[di+2] != 0))
                            newBuf[i] = SNOW_REST;
                        else
                            newBuf[i] = res[0];
                    }
                }
                else
                {
                    newBuf[di] = res[0];
                }
            }
            else
            {
                newBuf[i] = res[0];   
            }
        }
    }

    oldBuf.set(newBuf);
}

window.onload = initGame;

/*})(); OPTIMIZE */