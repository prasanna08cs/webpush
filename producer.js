const amqp = require('amqplib/callback_api');
const amqpConn = null;
const  url ="http://develop:infini1234@10.20.30.25";
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
        if (closeOnErr(err)) return;
        ch.on("error", function(err) {
            console.error("[AMQP] channel error", err.message);
        });
        ch.on("close", function() {
            console.log("[AMQP] channel closed");
        });
        pubChannel = ch;
        //assert the exchange: 'my-delay-exchange' to be a x-delayed-message,
        pubChannel.assertExchange(exchange, "x-delayed-message", {autoDelete: false, durable: true, passive: true,  arguments: {'x-delayed-type':  "direct"}})
        //Bind the queue: "jobs" to the exchnage: "my-delay-exchange" with the binding key "jobs"
        pubChannel.bindQueue('jobs', exchange ,'jobs');

        while (true) {
            var m = offlinePubQueue.shift();
            if (!m) break;
            publish(m[0], m[1], m[2]);
        }
    });
}
