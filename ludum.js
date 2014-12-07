// Ludum Dare 31: Entire Game on One Screen by Claire Blackshaw (Kimau)
//                         
// [^ \n][ ]*\{[ ]*$
//------------------------------------------------------------------------
/*jshint multistr:true */
/*jshint sub:true */
/*jshint browser:true */
"use strict";

/* ;( function() { OPTIMIZE */

var m = new MersenneTwister();

// Game Resources
var NEW_GAME_STATE = {
    playerName: "Player1",
    MousePos:[0,0],
    keySLeft: 0,
    keySRight: 0,
    blastSnow: 0 
}; 
var gameState = {};
var gameResources = {};
var gameCanvas;
var gameCanvasDom;

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

    window.onkeydown = handleKeyDown;
    window.onkeyup   = handleKeyUp;
    gameCanvasDom.onmousemove = updateMousePos; 
    gameCanvasDom.onmousedown = blastSnowOn;
    gameCanvasDom.onmouseup = blastSnowOff;
    
    createNewGame();
    console.log("Game Started"); 
    // gameCanvasDom.onclick = spawnSnowAtMouse;
    draw(); 
} 

function blastSnowOn(e)  { gameState.blastSnow = 1; }
function blastSnowOff(e) { gameState.blastSnow = 0; }

function updateMousePos(e)
{
    gameState.MousePos = [ 
        Math.floor(e.layerX / 2.0),
        Math.floor(e.layerY / 2.0)];
}

var keymap = {
    65:"keySLeft",
    68:"keySRight",
    81:"shootLeft",
    69:"shootRight"
}
function handleKey(e,a)
{
    if(e.which in keymap)
        gameState[keymap[e.which]] = a;
    else
        console.log([e.type, e.which]);
}

function handleKeyDown(e) {handleKey(e,1);}
function handleKeyUp(e) {handleKey(e,0);}

function createNewGame(playerName)
{
    gameState = NEW_GAME_STATE; 
    gameState.snowArray = new Uint16Array(WIDTH*HEIGHT);
    gameState.backSnowArray = new Uint16Array(WIDTH*HEIGHT);

    gameState.snowMan = [200,1,0,0];

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
    gameState.imageFore = gameCanvas.getImageData(0,0,WIDTH,HEIGHT);

    for(var i=0; i<gameState.snowArray.length; ++i) {
        if((gameState.imageFore.data[i*4+0]+
            gameState.imageFore.data[i*4+1]+
            gameState.imageFore.data[i*4+2]) > 0)
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

    // Snow Man Logic
    var x = gameState.snowMan[0];
    var y = Math.floor(gameState.snowMan[1]);
    var onSolid = 0;
    
    for(var sx=-3; sx < 3; ++sx)
    {
        var s = gameState.snowArray[x+sx+(HEIGHT-y)*WIDTH];
        if((s & BIT_SOLID) || (s & BIT_REST))
        {
            onSolid = 1;
            y += 1;
            sx=-4;

            if(y>HEIGHT)
                return;
        }
    }
    for(var sx=-3; sx < 3; ++sx)
    {
        var s = gameState.snowArray[x+sx+(HEIGHT-y+1)*WIDTH];
        if(s & MASK_SUPPOT)
        {
            onSolid = 1;
            sx = 5;
        }
    }

    if(onSolid)
    {
        gameState.snowMan[3] = 0;
        gameState.snowMan[1] = y;

        var xDir = gameState["keySRight"] - gameState["keySLeft"];
        if(xDir > 0)
        {
            // Right
            var isPassable = 1;
            var tx = x + 4;
            for(var ty = y+2; isPassable && (ty < (y+8)); ++ty)
                if(gameState.snowArray[tx+(HEIGHT-ty)*WIDTH] & MASK_SUPPOT)
                    isPassable = 0;
            
            if(isPassable)
                gameState.snowMan[0] += 1;
        }
        else if(xDir < 0)
        {
            // Left
            var isPassable = 1;
            var tx = x - 4;
            for(var ty = y+2; isPassable && (ty < (y+8)); ++ty)
                if(gameState.snowArray[tx+(HEIGHT-ty)*WIDTH] & MASK_SUPPOT)
                    isPassable = 0;
            
            if(isPassable)
                gameState.snowMan[0] -= 1;
        }
    }
    else
    {
        gameState.snowMan[3] -= 0.1;
        gameState.snowMan[1] += gameState.snowMan[3];
    }

    if(gameState["blastSnow"])
    {
        var m = 0;

        for(var sx = -2; sx <= +2; ++sx)
        for(var sy = -2; sy <= +2; ++sy)
        {
            var i = x+sx+(HEIGHT-(y+sy))*WIDTH;
            if(gameState.snowArray[i] | BIT_SNOW)
            {
                gameState.snowArray[i] = 0;
                m += 1;
            }
        } 

        for(var sx = -2; sx <= +2; ++sx)
        for(var sy = -2; (m>0) && (sy <= +2); ++sy)
        {
            gameState.snowArray[x+sx+(HEIGHT-(y+8+sy))*WIDTH] = makeSnowFlake([0,8]);
            m -= 1;
        }
    }  
 
    if(gameState["shootLeft"])
    {
       for(var sx=-20; sx < 1; ++sx)
       for(var sy=-1; sy < 20; ++sy)
       {
        if(gameState.backSnowArray[x+sx+(HEIGHT-(y+sy))*WIDTH] & BIT_SNOW)
            gameState.backSnowArray[x+sx+(HEIGHT-(y+sy))*WIDTH] = makeSnowFlake([-2,6]);
        if(gameState.snowArray[x+sx+(HEIGHT-(y+sy))*WIDTH] & BIT_SNOW)
            gameState.snowArray[x+sx+(HEIGHT-(y+sy))*WIDTH] = makeSnowFlake([-2,6]);
       }
    }

    if(gameState["shootRight"])
    {
       for(var sx=-1; sx < 20; ++sx)
       for(var sy=-1; sy < 20; ++sy)
       {
        if(gameState.backSnowArray[x+sx+(HEIGHT-(y+sy))*WIDTH] & BIT_SNOW)
            gameState.backSnowArray[x+sx+(HEIGHT-(y+sy))*WIDTH] = makeSnowFlake([2,6]);
        if(gameState.snowArray[x+sx+(HEIGHT-(y+sy))*WIDTH] & BIT_SNOW)
            gameState.snowArray[x+sx+(HEIGHT-(y+sy))*WIDTH] = makeSnowFlake([2,6]);
       
       }
    }
}

var reqFrame;
var continueUpdate = true;
var prevTime = performance.now(); 
function draw() {
    if(continueUpdate)
        reqFrame = requestAnimationFrame(draw); 
    var now = performance.now();
    var dt = now - prevTime;
    prevTime = now;

    // Game Update
    gameUpdate(dt);

    // Drawing code goes here
    gameState.imageFinal.data.set(gameState.imageLevel.data);
    
    for(var i=0; i<gameState.snowArray.length; ++i) {
        if(gameState.snowArray[i] & BIT_SNOW)
        {
            if(gameState.snowArray[i] & BIT_REST)
            {
                gameState.imageFinal.data[i*4+0] = COL_SNOW_FRONT_REST; 
                gameState.imageFinal.data[i*4+1] = COL_SNOW_FRONT_REST;
                gameState.imageFinal.data[i*4+2] = COL_SNOW_FRONT_REST;
            }
            else
            {
                gameState.imageFinal.data[i*4+0] = COL_SNOW_FRONT;
                gameState.imageFinal.data[i*4+1] = COL_SNOW_FRONT;
                gameState.imageFinal.data[i*4+2] = COL_SNOW_FRONT;

/* COLOR SPEED 
                var speedCol = [
                [10,10,10],
                [0,255,0],
                [0,0,255],
                [255,0,0],
                [255,255,0],
                [255,0,255],
                [255,255,255],
                [10,10,10],
                ];

                var z = speedCol[getSnowFlakePolar(gameState.snowArray[i])[1]];
                gameState.imageFinal.data[i*4+0] = z[0];
                gameState.imageFinal.data[i*4+1] = z[1];
                gameState.imageFinal.data[i*4+2] = z[2];
                /**/
            }
        }
        else if((gameState.imageFore.data[i*4+0] + 
                 gameState.imageFore.data[i*4+1] +
                 gameState.imageFore.data[i*4+2]) > 0)
        {
            gameState.imageFinal.data[i*4+0] = gameState.imageFore.data[i*4+0];
            gameState.imageFinal.data[i*4+1] = gameState.imageFore.data[i*4+1];
            gameState.imageFinal.data[i*4+2] = gameState.imageFore.data[i*4+2];
        }
        else if(gameState.backSnowArray[i] & BIT_SNOW)
        {            
            if(gameState.backSnowArray[i] & BIT_REST)
            {
                gameState.imageFinal.data[i*4+0] = COL_SNOW_BACK_REST;
                gameState.imageFinal.data[i*4+1] = COL_SNOW_BACK_REST;
                gameState.imageFinal.data[i*4+2] = COL_SNOW_BACK_REST;
            }
            else
            {
                gameState.imageFinal.data[i*4+0] = COL_SNOW_BACK;
                gameState.imageFinal.data[i*4+1] = COL_SNOW_BACK;
                gameState.imageFinal.data[i*4+2] = COL_SNOW_BACK;
            }
        }
    }
    
    gameCanvas.putImageData(gameState.imageFinal,0,0);
    var xDir = gameState["keySRight"] - gameState["keySLeft"];

    // Draw Snowman
    var armDir = [gameState.MousePos[0] - gameState.snowMan[0],
                  gameState.MousePos[1] - (HEIGHT-(gameState.snowMan[1]+7))];
    var al = Math.sqrt(armDir[0]*armDir[0]+armDir[1]*armDir[1]);
    armDir = [gameState.snowMan[0] + armDir[0]/al*10,
              (HEIGHT-(gameState.snowMan[1]+7)) + armDir[1]/al*10];

    // Draw Arm 
    gameCanvas.strokeStyle = "#000";
    gameCanvas.beginPath();
        gameCanvas.moveTo(gameState.snowMan[0], HEIGHT-(gameState.snowMan[1]+8));
        gameCanvas.lineTo(armDir[0], armDir[1]);
    gameCanvas.stroke();

    // Draw Bottom
    gameCanvas.strokeStyle = "#333";
    gameCanvas.fillStyle = "#FFF";
    gameCanvas.beginPath();
    gameCanvas.ellipse(
        gameState.snowMan[0],
        HEIGHT-(gameState.snowMan[1]),
        6,6,0,Math.PI*2,0);
    gameCanvas.fill();
    gameCanvas.stroke();

    // Draw Torso
    gameCanvas.beginPath();
    gameCanvas.ellipse( 
        gameState.snowMan[0]+xDir,
        HEIGHT-(gameState.snowMan[1]+6),
        4.5,4.5,0,Math.PI*2,0);
    gameCanvas.fill(); 
    gameCanvas.stroke();


    // Draw Head
    gameCanvas.beginPath();
    gameCanvas.ellipse(
        gameState.snowMan[0]+xDir*3,
        HEIGHT-(gameState.snowMan[1]+11),
        3,3,0,Math.PI*2,0);  
    gameCanvas.fill();
    gameCanvas.stroke();
    
    // Draw Front Arm
    gameCanvas.strokeStyle = "#000";
    gameCanvas.beginPath();
        gameCanvas.moveTo(gameState.snowMan[0], HEIGHT-(gameState.snowMan[1]+6));
        gameCanvas.lineTo(armDir[0], armDir[1]);
    gameCanvas.stroke();

}


//------------------------------------------------------------------------
// Snow
var MASK_DIR    = 31;  //           1 1111
var MASK_SPEED = 224;  //        1110 0000
var MASK_FRAME = 1792; //    111 0000 0000
var MASK_COL =  6144;  // 1 1000 0000 0000
var BIT_SOLID = 8192;  // 13
var BIT_SNOW = 16384;  // 14
var BIT_REST = 32768;  // 15
var MASK_MVINV = 57347 // 1110 0000 0000 0011
var MASK_SUPPOT = BIT_REST | BIT_SOLID | BIT_SNOW;
var SHIFT_DIR = 0;
var SHIFT_SPEED = 5;
var SHIFT_FRAME = 8;
var SHIFT_COL   = 11;
var MAX_DEG = 31;
var DIR_TO_DEG = ((Math.PI * 2.0) / MAX_DEG);
var DEG_TO_DIR = (MAX_DEG / (Math.PI * 2.0));
var DIR_UP = 23; // UP
var DIR_DOWN = 8; // DOWN
var HALF_DIR = 15;
var QUAT_DIR = 8;
var MAX_SPEED = 7;
var SNOW_EMPTY = 0; 
var SNOW_REST = BIT_SNOW | BIT_REST;
var SNOW_SOLID = BIT_SOLID;

var COL_SNOW_FRONT = 255;
var COL_SNOW_FRONT_REST = 240;
var COL_SNOW_BACK = 200;
var COL_SNOW_BACK_REST = 180;

var SNOW_GRAV_CHANCE = 0.05;
var SNOW_REST_CHANCE = 0.01;
var SNOW_MELT_CHANCE = 0.0001; 
var SNOWFALL_CHANCE = 0.01;
var SNOW_SPAWN_SIZE = 30;

var WIND_STRENGTH = 0.01;
var WIND_INV_FREQ = 0.01;
 
function getSnowFlakePolar(s) 
{
    if((s & BIT_SNOW) == 0)
        return null;
    if(s & BIT_REST)
        return [DIR_DOWN, 0, 0];
    if(s == BIT_SNOW)
        return [DIR_DOWN - Math.floor(Math.random()*3-1), 1, MAX_SPEED];
 
    var deg = (s & MASK_DIR) >> SHIFT_DIR;
    var speed = (s & MASK_SPEED) >> SHIFT_SPEED;
    var frame = (s & MASK_FRAME) >> SHIFT_FRAME;

    return [deg,speed,frame];
}

function compilePolarFlake(pol)
{ 
    var s = BIT_SNOW |
        ((pol[0] % MAX_DEG)   << SHIFT_DIR) |
        (Math.min(pol[1], MAX_SPEED) << SHIFT_SPEED) |
        ((pol[2] % MAX_SPEED) << SHIFT_FRAME);

    return s;
}

function polarToCart(pol)
{
    var deg = pol[0] * DIR_TO_DEG - Math.PI;
    deg = deg % Math.PI; 
    
    var x = (Math.cos(deg)*pol[1]); 
    var y = (Math.sin(deg)*pol[1]);

    return [x,y]; 
}

function cartToPolar(sf) 
{
    var x = sf[0];
    var y = sf[1];
              
    var deg = Math.atan2(y,x) + Math.PI;
    deg = Math.round(deg * DEG_TO_DIR); 
     
    var speed = Math.sqrt(x*x+y*y);
    if(speed < 1)
    { 
        speed = 1; 
        deg = DIR_DOWN;  // fall down
    }
    else
    {
        speed = Math.round(Math.min(MAX_SPEED, speed));
    }

    return [deg, speed, 0];
}

function rotDist (a,b) { 
    var r = [(a-b + MAX_DEG) % MAX_DEG, (b-a + MAX_DEG) % MAX_DEG]; 
    if(r[0] === r[1])
        return [r[0], Math.floor(Math.random() * 2)*2-1];
    else if(r[0] < r[1])
        return [r[1],-1];
    else
        return [r[2],+1];
}
function addPolarForce(pol, forceDeg)
{
    if(pol[0] == forceDeg)
    {
        if(pol[1] < MAX_SPEED)
            pol[1] += 1; 
    }
    else
    { 
        if(pol[1] <= 1)
            pol[0] = forceDeg;
        else
        {
            var a = rotDist(pol[0], forceDeg);
            if(a[0] >= HALF_DIR)
                pol[1] -= 1;
            else if(a[0] >= QUAT_DIR)
            {
                pol[0] += a[1];
                pol[1] -= 1;
            }
            else
                pol[0] += a[1];
        }
    }

    return pol;
}

function makeSnowFlake(sf)
{
    return compilePolarFlake(cartToPolar(sf));
}

function spawnSnowAtMouse(e)
{
    var x = Math.floor(e.layerX / 2.0);
    var y = Math.floor(e.layerY / 2.0);

    if(e.shiftKey)
    {
        // Clear Snow
        for(var sx=-SNOW_SPAWN_SIZE; sx < SNOW_SPAWN_SIZE; ++sx)
        for(var sy=-SNOW_SPAWN_SIZE; sy < SNOW_SPAWN_SIZE; ++sy)
        {
            var c = 1 + Math.log2((sx*sx+sy*sy) / SNOW_SPAWN_SIZE);
            if(c < Math.random())
                wipeSnow(x + sx, y + sy, gameState.backSnowArray);
            if(c < Math.random())
                wipeSnow(x + sx, y + sy, gameState.snowArray);
        }
    }
    else
    {
        // Place Snow
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
}

function wipeSnow(x,y,buff)
{
    if(buff[x+y*WIDTH] & BIT_SOLID)
        return;
    
    buff[x+y*WIDTH] = 0;
}

function spawnSnow(x,y,buff)
{
    if(buff[x+y*WIDTH] & BIT_SOLID)
        return;
    
    buff[x+y*WIDTH] = BIT_SNOW;
}

var newBuf = new Uint16Array(WIDTH*HEIGHT); 
function updateSnow(oldBuf)
{
    // Spawn Snow
    for(var x=0;x<WIDTH;x++) 
    { 
        if(Math.random() < SNOWFALL_CHANCE)  
            spawnSnow(x,0,oldBuf);
    }

    for(var i=0; i<newBuf.length; ++i) { newBuf[i]=0; }

    // Setup Wind
    var windDir = 0;//DIR_DOWN + Math.floor(Math.random() * 5) - 2;
    var windStrength = Math.sin(prevTime*WIND_INV_FREQ)*WIND_STRENGTH; 
    if(windStrength < 0)
        windDir = Math.floor(MAX_DEG / 2);
    if(windDir === DIR_DOWN)
        windStrength = 0;        

    // Move Snow 
    for(var i=0; i<newBuf.length; ++i) {
        var s = oldBuf[i]; 
        if(s & BIT_SOLID)
        {
            newBuf[i] = oldBuf[i];
        }
        else if(s & BIT_REST)
        {
            var x = i % WIDTH;
            var y = HEIGHT - Math.floor(i / WIDTH);

            if(y < 1)
                newBuf[i] = SNOW_REST;
            else if(oldBuf[i+WIDTH] === 0)
                newBuf[i+WIDTH] = BIT_SNOW;
            else if(Math.random() < SNOW_MELT_CHANCE)
            {
                var di = i;
                while((di > WIDTH) && (newBuf[di-WIDTH] & BIT_SNOW))
                { 
                    di -= WIDTH;
                }
                newBuf[i] = BIT_SNOW;
                newBuf[di] = 0;
            }
            else
                newBuf[i] = SNOW_REST; 
        }
        else if(s & BIT_SNOW)
        {
            var sPol = getSnowFlakePolar(s);

            // is Snowflake moving this frame
            if((sPol[1]+sPol[2]) >= MAX_SPEED)
            {
                // Gravity
                if(Math.random() < SNOW_GRAV_CHANCE)
                    sPol = addPolarForce(sPol, DIR_DOWN);
                else if(Math.random() < windStrength)
                    sPol = addPolarForce(sPol, windDir);

                // Move Flake
                var sf = polarToCart(sPol)
                var x = i % WIDTH;
                var y = HEIGHT - Math.floor(i / WIDTH);
                var m = 0;

                if(Math.abs(sf[0]/sf[1]) > Math.random())
                {
                    m += 1;
                    x += (sf[0]>0.1) -(sf[0]<-0.1);
                }
                if(Math.abs(sf[1]/sf[0]) > Math.random())
                {
                    m += 1;
                    y += (sf[1]>0.1) -(sf[1]<-0.1);
                }
                if(m===0)
                {
                    if(Math.abs(sf[0]) > Math.abs(sf[1]))
                        x += (sf[0]>0.1) -(sf[0]<-0.1);
                    else
                        y += (sf[1]>0.1) -(sf[1]<-0.1);
                } 

                if((x<0) || (x>WIDTH) || (y<0) || (y>HEIGHT))
                    continue;
                
                // Check Dest
                var di = x+(HEIGHT-y)*WIDTH;

                if(oldBuf[di] != 0)
                { 
                    sPol[1] = 1;

                    if((x>0) && (oldBuf[di-1] == 0))
                    {
                        newBuf[di-1] = compilePolarFlake(sPol);
                    } 
                    else if((x<(WIDTH-1)) && (oldBuf[di+1] == 0))
                    {
                        newBuf[di+1] = compilePolarFlake(sPol);
                    }
                    else
                    {
                        if(y < 1)
                            newBuf[i] = SNOW_REST;
                        else if(oldBuf[i+WIDTH] === 0)
                            newBuf[i+WIDTH] = compilePolarFlake(sPol);
                        else if(Math.random() < SNOW_REST_CHANCE)    
                            newBuf[i] = SNOW_REST;
                        else
                        {                              
                            newBuf[i] = compilePolarFlake(sPol);
                        }
                    }
                }
                else 
                {
                    newBuf[di] = compilePolarFlake(sPol);
                } 
            }
            else
            {
                sPol[2] += sPol[1];  
                s = compilePolarFlake(sPol);
                newBuf[i] = s;   
            }
        }
    }
    
    oldBuf.set(newBuf);
}

window.onload = initGame;

/*})(); OPTIMIZE */