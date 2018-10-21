// init function
async function init(){

    // try to load a model
    try{
        model =  await tf.loadModel('indexeddb://my-model-1');
        console.log('model loaded from storage');
        computer.ai_plays = false;

    // else create a new one
    }catch{
        model = tf.sequential();

        model.add(tf.layers.dense({units: 256, inputShape: [6]})); //input is a 1x8
        //model.add(tf.layers.dense({units: 256, inputShape: [8]}));
        model.add(tf.layers.dense({units: 512, inputShape: [256]}));
        model.add(tf.layers.dense({units: 256, inputShape: [512]}));
        model.add(tf.layers.dense({units: 3, inputShape: [256]})); //returns a 1x3
        console.log('model created');
    }

    // set optimiser and compile model
    const learningRate = 0.001;
    const optimizer = tf.train.adam(learningRate);
    model.compile({loss: 'meanSquaredError', optimizer: optimizer, metrics: ['accuracy']});

    // if(computer.ai_plays){
    //    document.getElementById("playing").innerHTML = "Playing: AI";
    //}else{
    //    document.getElementById("playing").innerHTML = "Playing: Computer";
    //}

    // start a game
    animate(step);
}

// set game animation speed (game clock)
var animate = function (callback) {
        window.setTimeout(callback, 0)
    };

// create canvas
var canvas = document.createElement("canvas");
var width = 400;
var height = 600;
canvas.width = width;
canvas.height = height;
var context = canvas.getContext('2d');

// create game "objects"
var player = new Player();
var computer = new Computer();
var ball = new Ball(200, 300);
var ai = new AI();

// pressed keys
var keysDown = {};

// renders board
var render = function () {
    context.fillStyle = "#FF00FF";
    context.fillRect(0, 0, width, height);
    player.render();
    computer.render();
    ball.render();
};

// updates game state
var update = function () {

    // update player position
    player.update(ball);

    // update "computer" position
    // ai-based
    if(computer.ai_plays){
        move = ai.predict_move();
        computer.ai_update(move);
    // or rule-based if we don;t have any model yet
    }else
        computer.update(ball);

    // update ball position
    ball.update(player.paddle, computer.paddle);

    // add training data from current frame to training set
    ai.save_data(player.paddle, computer.paddle, ball)
};

// main game loop
var step = function () {
    update();
    render();
    animate(step); // runs that loop again after a "tick"
};

// paddle object
function Paddle(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.x_speed = 0;
    this.y_speed = 0;
}

// renders paddle on a board
Paddle.prototype.render = function () {
    context.fillStyle = "#0000FF";
    context.fillRect(this.x, this.y, this.width, this.height);
};

// moves paddle by x and y pixels (y is always 0 now)
Paddle.prototype.move = function (x, y) {

    // update position and speed
    this.x += x;
    this.y += y;
    this.x_speed = x;
    this.y_speed = y;

    // check if not out of the board
    if (this.x < 0) {
        this.x = 0;
        this.x_speed = 0;
    } else if (this.x + this.width > 400) {
        this.x = 400 - this.width;
        this.x_speed = 0;
    }
};

// computer player object
function Computer() {
    this.paddle = new Paddle(0, 10, 50, 10);
    //this.ai_plays = false; // will be set to true whenever ai model will be ready
}

// renders computer paddle ona  board
Computer.prototype.render = function () {
    this.paddle.render();
};

// updates computer paddle position - rule-based (simply follows a ball)
Computer.prototype.update = function (ball) {

    // calculate difference in pixels between paddle and ball (cap to 5 pixels - max speed of paddle)
    var x_pos = ball.x;
    var diff = -((this.paddle.x + (this.paddle.width / 2)) - x_pos);
    if (diff < 0 && diff < -4) {
        diff = -5;
    } else if (diff > 0 && diff > 4) {
        diff = 5;
    }

    // move paddle
    this.paddle.move(diff, 0);

    // check if paddle is not outside of the board
    if (this.paddle.x < 0) {
        this.paddle.x = 0;
    } else if (this.paddle.x + this.paddle.width > 400) {
        this.paddle.x = 400 - this.paddle.width;
    }
};

// updates computer paddle position - ai-based (ai calls it later in a code)
Computer.prototype.ai_update = function (move = 0) {
    this.paddle.move(4 * move, 0);
};

// player object
function Player() {
    this.paddle = new Paddle(0, 580, 50, 10);
}

// renders player paddle
Player.prototype.render = function () {
    this.paddle.render();
};

// updates player paddle position
Player.prototype.update = Computer.prototype.update;

// ball object
function Ball(x, y) {
    this.x = x;
    this.y = y;
    this.x_speed = Math.random()*4+1;
    this.y_speed = Math.random()*3+2;
    this.player_strikes = false;
    this.ai_strikes = false;
}

// renders ball on a table
Ball.prototype.render = function () {
    context.beginPath();
    context.arc(this.x, this.y, 5, 2 * Math.PI, false);
    context.fillStyle = "#000000";
    context.fill();
};

// updates ball position
Ball.prototype.update = function (paddle1, paddle2, new_turn) {

    // update speed and upper/lower point of a ball on a table
    this.x += this.x_speed;
    this.y += this.y_speed;
    var top_x = this.x - 5;
    var top_y = this.y - 5;
    var bottom_x = this.x + 5;
    var bottom_y = this.y + 5;

    // check if ball is not outside of a table
    // bounce off the side walls
    if (this.x - 5 < 0) {
        this.x = 5;
        this.x_speed = -this.x_speed;
    } else if (this.x + 5 > 400) {
        this.x = 395;
        this.x_speed = -this.x_speed;
    }

    // if ball hits upper and lower walls - reset ball (score)
    if (this.y < 0 || this.y > 600) {
        this.x_speed = Math.random()*4+1;
        this.y_speed = Math.random()*3+2;
        this.x = 200;
        this.y = 300;
        ai.new_turn();
    }

    // move ball on a table, update angle and speed, calculate new position
    this.player_strikes = false;
    this.ai_strikes = false;
    if (top_y > 300) {
        if (top_y < (paddle1.y + paddle1.height) && bottom_y > paddle1.y && top_x < (paddle1.x + paddle1.width) && bottom_x > paddle1.x) {
            this.y_speed = -3;
            this.x_speed += (paddle1.x_speed / 2);
            this.y += this.y_speed;
            this.player_strikes = true;
            console.log('player strikes');
        }
    } else {
        if (top_y < (paddle2.y + paddle2.height) && bottom_y > paddle2.y && top_x < (paddle2.x + paddle2.width) && bottom_x > paddle2.x) {
            this.y_speed = 3;
            this.x_speed += (paddle2.x_speed / 2);
            this.y += this.y_speed;
            this.ai_strikes = true;
            console.log('ai strikes');
        }
    }
};

// AI object
function AI(){
    this.previous_data = null;                  // data from previous frame
    this.training_data = [[], [], []];          // empty training dataset
    this.training_batch_data = [[], [], []];    // empty batch (dataset to be added to training data)
    this.previous_xs = null;                    // input data from previus frame
    this.turn = 0;                              // number of turn
    this.grab_data = true;                      // enables/disables data grabbing
    this.flip_table = true;                     // flips table
    this.keep_trainig_records = true;           // keep some number of training records instead of discardin them each session
    this.training_records_to_keep = 100000;     // number of training records to keep
    this.first_strike = true;                   // first strike flag (to ommit data)
}

// saves data from current frame of a game
AI.prototype.save_data = function(player, computer, ball){

    // return if grabbing is disabled
    if(!this.grab_data)
        return;

    // fresh turn, just fill initial data in
    if(this.previous_data == null){
        this.previous_data = [player.x, computer.x, ball.x, ball.y];
        return;
    }

    // if ai strikes, start recording data - empty batch
    if(ball.ai_strikes){
        this.training_batch_data = [[], [], []];
        console.log('emtying batch')
    }

    // create current data object [player_x, computer_x, ball_x, ball_y]
    // and embedding index (0 - left, 1 - no move, 2 - right)
    data_xs = [player.x, computer.x, ball.x, ball.y];
    index = (player.x < this.previous_data[0])?0:((player.x == this.previous_data[0])?1:2);

    // save data as [...previous data, ...current data]
    // result - [old_player_x, old_computer_x, old_ball_x, old_ball_y, player_x, computer_x, ball_x, ball_y]
    this.previous_xs = [...this.previous_data, ...data_xs];
    // add data to training set depending on index value (depending if that data relates to the move to the left, no move or move to the right)
    // only player and ball position
    this.training_batch_data[index].push([this.previous_xs[0], this.previous_xs[2], this.previous_xs[3], this.previous_xs[4], this.previous_xs[6], this.previous_xs[7]]);
    // set current data as previous data for next frame
    this.previous_data = data_xs;

    // if player strikes, add batch to training data
    if(ball.player_strikes){
        if(this.first_strike){
            this.first_strike = false;
            this.training_batch_data = [[], [], []];
            console.log('emtying batch');
        }else{
            for(i = 0; i < 3; i++)
                this.training_data[i].push(...this.training_batch_data[i]);
            this.training_batch_data = [[], [], []];
            console.log('adding batch');
        }
    }
}

// runs every turn
AI.prototype.new_turn = function(){

    // clean previus data, we are starting fresh
    this.first_strike = true;
    this.training_batch_data = [[], [], []];
    this.previous_data = null;
    this.turn++;
    console.log('new turn: ' + this.turn);

    //computer.ai_plays = !computer.ai_plays;
    //if(computer.ai_plays){
    //    document.getElementById("playing").innerHTML = "Playing: AI";
    //}else{
    //    document.getElementById("playing").innerHTML = "Playing: Computer";
    //}

    // after x turn
    if(this.turn > 9){

        // tarin a model
        this.train();

        // allow ai to play (as we have a trained model)
        //computer.ai_plays = true;

        // empty training dataset
        this.reset();
    }
}

// empties training data
AI.prototype.reset = function(){
    this.previous_data = null;
    if(!this.keep_trainig_records)
        this.training_data = [[], [], []];
    this.turn = 0;

    //if(computer.ai_plays){
    //    document.getElementById("playing").innerHTML = "Playing: AI";
    //}else{
    //    document.getElementById("playing").innerHTML = "Playing: Computer";
    //}

    console.log('reset')
    console.log('emtying batch')
}

// trains a model
AI.prototype.train = function(){

    // first we have to balance a data
    console.log('balancing');
    document.getElementById("playing").innerHTML = "Training";

    // trim data and find minimum number of training records in data for all 3 embeddings
    if(this.keep_trainig_records){
        for(i = 0; i < 3; i++){
            if(this.training_data[i].length > this.training_records_to_keep)
                this.training_data[i] = this.training_data[i].slice(
                    Math.max(0, this.training_data[i].length - this.training_records_to_keep),
                    this.training_data[i].length
                );
        }
    }
    len = Math.min(this.training_data[0].length, this.training_data[1].length, this.training_data[2].length);
    console.log(this.training_data);
    // if it equals zero - we don't have any data to train model on
    if(!len){
        console.log('no data to train on');
        return;
    }

    data_xs = [];
    data_ys = [];

    if(len < this.training_records_to_keep)
        return;

    // now we need to trim data so every embedding will contain exactly the same amount of training records
    // than randomize that data
    // and create embedding records one embedding record for every input data record
    // finally add training data records and embedding records to common tables (for training)
    // tf.fit() will do final data shuffle for us
    for(i = 0; i < 3; i++){
        data_xs.push(...this.training_data[i].slice(0, len)
            .sort(()=>Math.random()-0.5).sort(()=>Math.random()-0.5));      // trims training data to 'len' length and shuffle it
        data_ys.push(...Array(len).fill([i==0?1:0, i==1?1:0, i==2?1:0]));   // creates 'len' number records of embedding data
                                                                            // either [1, 0 0] for left, [0, 1, 0] - for no move
                                                                            // and [0, 0, 1] for right (depending in index if training data)
    }

    var a = document.getElementById("a");
    var file = new Blob([JSON.stringify({xs: data_xs, ys: data_ys})], {type: 'application/json'});
    a.href = URL.createObjectURL(file);
    a.download = 'training_data.json';
    a.click();

    hfhgfghfhg;
    //console.log(data_xs);
    //console.log(data_ys);
}

// inferences a move
AI.prototype.predict_move = function(){

    // but only for 2+ frame of a game (we need data from previous frame as well)
    if(this.previous_xs != null){
        // flip table so ai will see it from player's perspective
        // and try to mimic his gameplay
        // also use ionly ai's paddle positions
        data_xs = [
            width - this.previous_xs[1], width - this.previous_xs[2], height - this.previous_xs[3],
            width - this.previous_xs[5], width - this.previous_xs[6], height - this.previous_xs[7]
        ];
        // predict move
        prediction = model.predict(tf.tensor([data_xs]));
        // argmax will return embeddingL 0, 1 or 2, we need -1, 0 or 1 (left, no move, right) - decrement it and return
        // also we actually need to flip that prediction, as ai plays on top (upside-down)
        //return -(tf.argMax(prediction, 1).dataSync()-1);
        return -(tf.argMax(prediction, 1).dataSync()-1);
    }
}

// add canvas
document.body.appendChild(canvas);

// init whole code
init();

// arrow keypress events
window.addEventListener("keydown", function (event) {
    keysDown[event.keyCode] = true;
});
window.addEventListener("keyup", function (event) {
    delete keysDown[event.keyCode];
});
