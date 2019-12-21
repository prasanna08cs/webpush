const amqp = require('amqplib/callback_api');
let amqpConn = null;
const  url ="amqp://develop:infini1234@10.20.30.25:5672";
const exchange ="dummy_exchange";
const queue = "dummy_queue";
const  routing="dummy.queue";
function start(data) {
    amqp.connect(url + "?heartbeat=60", function(err, conn) {
        if (err) {
            console.error("[AMQP]", err.message);
            return setTimeout(start, 1000);
        }

        conn.on("error", function(err) {
            if (err.message !== "Connection closing") {
                console.error("[AMQP] conn error", err.message);
            }
        });

        conn.on("close", function() {
            console.error("[AMQP] reconnecting");
            return setTimeout(start, 1000);
        });

        console.log("[AMQP] connected");
        amqpConn = conn;
        whenConnected(data);
    });
}

function whenConnected(data) {
    startPublisher(data);
    // startWorker();
}
function startPublisher(data) {
    amqpConn.createConfirmChannel(function(err, ch) {
        if ((err)) return;
        ch.on("error", function(err) {
            console.error("[AMQP] channel error", err.message);
        });
        ch.on("close", function() {
            console.log("[AMQP] channel closed");
        });
        pubChannel = ch;
        //assert the exchange: 'my-delay-exchange' to be a x-delayed-message,
        pubChannel.assertExchange(exchange, "topic", {autoDelete: false, durable: true, passive: true})
        //Bind the queue: "jobs" to the exchnage: "my-delay-exchange" with the binding key "jobs"
        pubChannel.bindQueue(queue, exchange ,'');
        try {
            pubChannel.publish(exchange, routing, Buffer.from( data), {},
                function(err, ok) {
                    if (err) {
                        console.error("[AMQP] publish", err);

                        //pubChannel.connection.close();
                    } else{
                        console.log("published to queue")
                    }
                });
        } catch (e) {
            console.error("[AMQP] failed", e.message);

        }


    });
}
module.exports.publish = start;