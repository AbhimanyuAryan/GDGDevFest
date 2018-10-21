// initial model definition
const model = tf.sequential();
model.add(tf.layers.dense({units: 256, inputShape: [8]})); //input is a 1x8
model.add(tf.layers.dense({units: 512, inputShape: [256]}));
model.add(tf.layers.dense({units: 256, inputShape: [512]}));
model.add(tf.layers.dense({units: 3, inputShape: [256]})); //returns a 1x3
const learningRate = 0.001;
const optimizer = tf.train.adam(learningRate);
model.compile({loss: 'meanSquaredError', optimizer: optimizer});


//animation of the pong game code
var animate = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (callback) {
        window.setTimeout(callback, 1000 / 60)
    };

// variables for pong game.
var canvas = document.createElement("canvas");
var width = 400;
var height = 600;
canvas.width = width;
canvas.height = height;
var context = canvas.getContext('2d');
var player = new Player();
var computer = new Computer();
var ball = new Ball(200, 300);
var ai = new AI();

var keysDown = {};

//from pong code:
var render = function () {
    context.fillStyle = "#000000";
    context.fillRect(0, 0, width, height);
    player.render();
    computer.render();
    ball.render();
};

//from pong code:
var update = function () {
    player.update();
    if(computer.ai_plays){
        move = ai.predict_move();
        computer.ai_update(move);
    }else
        computer.update(ball);
    ball.update(player.paddle, computer.paddle);
    ai.save_data(player.paddle, computer.paddle, ball)
};

//from pong code:
var step = function () {
    update();
    render();
    animate(step);
};

//from pong code:
function Paddle(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.x_speed = 0;
    this.y_speed = 0;
}

//from pong code:
Paddle.prototype.render = function () {
    context.fillStyle = "#59a6ff";
    context.fillRect(this.x, this.y, this.width, this.height);
};

//from pong code:
Paddle.prototype.move = function (x, y) {
    this.x += x;
    this.y += y;
    this.x_speed = x;
    this.y_speed = y;
    if (this.x < 0) {
        this.x = 0;
        this.x_speed = 0;
    } else if (this.x + this.width > 400) {
        this.x = 400 - this.width;
        this.x_speed = 0;
    }
};

//from pong code:
function Computer() {
    this.paddle = new Paddle(175, 10, 50, 10);
    this.ai_plays = false;
}

//from pong code:
Computer.prototype.render = function () {
    this.paddle.render();
};

//from pong code:
Computer.prototype.update = function (ball) {
    var x_pos = ball.x;
    var diff = -((this.paddle.x + (this.paddle.width / 2)) - x_pos);
    if (diff < 0 && diff < -4) {
        diff = -5;
    } else if (diff > 0 && diff > 4) {
        diff = 5;
    }
    this.paddle.move(diff, 0);
    if (this.paddle.x < 0) {
        this.paddle.x = 0;
    } else if (this.paddle.x + this.paddle.width > 400) {
        this.paddle.x = 400 - this.paddle.width;
    }
};