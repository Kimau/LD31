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

var initGame = function()
{
    gameCanvasDom = $("canvas");
    gameCanvas = gameCanvasDom.getContext("2d");

    gameResources["house"] = $("imgHouse");
    
    createNewGame();
}

var createNewGame = function(playerName)
{
    gameState = NEW_GAME_STATE; 
    gameState.snowArray = new Uint8Array(WIDTH*HEIGHT);

    gameCanvas.fillStyle = "#000";
    gameCanvas.fillRect(0,0,WIDTH,HEIGHT);
    gameCanvas.drawImage(gameResources["house"],0,0,WIDTH,HEIGHT);
    gameState.imageArray = gameCanvas.getImageData(0,0,WIDTH,HEIGHT);

    for(var i=0; i<gameState.snowArray.length; ++i) {
        if((gameState.imageArray.data[i*4+0]+
            gameState.imageArray.data[i*4+1]+
            gameState.imageArray.data[i*4+2]) > 0)
            gameState.snowArray[i] = 128;
    } 
} 

//------------------------------------------------------------------------
// Snow

// Snow
var SNOW_EMPTY = 0;
var BIT_SNOW = 1;
var BIT_LEFT = 2;
var BIT_RIGHT = 4;
var BIT_UP = 8;
var BIT_DOWN = 16;
var BIT_SOLID = 128;
var SPEED_SHIFT = 5;
var MAX_SPEED = 7;
var SNOW_SOLID = BIT_SOLID;

var getSnowFlake = function(s)
{
    if((s & BIT_SNOW) == 0)
        return null;
    
    var x = -1 * (s & BIT_LEFT) + 1*(s&BIT_RIGHT);
    var y = -1 * (s & BIT_DOWN) + 1*(s&BIT_UP);
    var v = (s >> SPEED_SHIFT) & MAX_SPEED;

    return [x,y,v];
}

var makeSnowFlake = function(x,y,v)
{
    var s = BIT_SNOW;
    if(x < 0) s|= BIT_LEFT;
    if(x > 0) s|= BIT_RIGHT;
    if(y < 0) s|= BIT_DOWN;
    if(y > 0) s|= BIT_UP;
    s |= (v&MAX_SPEED) << SPEED_SHIFT;

    return s; 
}

var spawnSnowAtMouse = function(e)
{
    spawnSnow(e.layerX,e.layerY);
}

var spawnSnow(x,y)
{
    gameState.snowArray[x+y*WIDTH] = makeSnowFlake(0,0,1);
}