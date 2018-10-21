// initial model definition
const model = tf.sequential();
model.add(tf.layers.dense({units: 256, inputShape: [8]})); //input is a 1x8
model.add(tf.layers.dense({units: 512, inputShape: [256]}));
model.add(tf.layers.dense({units: 256, inputShape: [512]}));
model.add(tf.layers.dense({units: 3, inputShape: [256]})); //returns a 1x3
const learningRate = 0.001;
const optimizer = tf.train.adam(learningRate);
model.compile({loss: 'meanSquaredError', optimizer: optimizer});