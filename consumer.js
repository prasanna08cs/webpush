const amqp = require('amqplib/callback_api');
let amqpConn = null;
const  url ="amqp://develop:infini1234@10.20.30.25:5672";
const exchange ="dummy_exchange";
const queue = "dummy_queue";
const  routing="dummy.queue";
const webpush = require('web-push');
const knex = require('knex')({
    client: 'mysql',
    // debug: ['ComQueryPacket'],
    connection: {
        host: '127.0.0.1',
        user: 'root',
        password: 'root',
        database: 'webpush'
    }
});
function start() {
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
        whenConnected();
    });
}

function whenConnected() {

     startWorker();
}
function startWorker() {
    amqpConn.createChannel(function(err, ch) {
        if (closeOnErr(err)) return;
        ch.on("error", function(err) {
            console.error("[AMQP] channel error", err.message);
        });
        ch.on("close", function() {
            console.log("[AMQP] channel closed");
        });

        ch.prefetch(10);
        ch.assertQueue(routing, { durable: true }, function(err, _ok) {
            if (closeOnErr(err)) return;
            ch.consume(queue, processMsg, { noAck: false });
            console.log("Worker is started");
        });

        function processMsg(msg) {
            work(msg, function(ok) {
                try {
                    if (ok)
                        ch.ack(msg);
                    else
                        ch.reject(msg, true);
                } catch (e) {
                    closeOnErr(e);
                }
            });
        }

        async function work(msg, cb) {
                    let queue_data=JSON.parse(msg.content.toString());
                        let data= JSON.parse(queue_data.data);
                    //console.log(JSON.parse(data.data))
            let quer= await knex("camp").select("site_id as site_id").where("id",data.camp_id).first();
                    console.log(quer.site_id);
           let site =  await knex("sites").select().where("id",quer.site_id).first();
            webpush.setVapidDetails('mailto:prasanna08cs@gmail.com', site.publicVapidKey, site.privateVapidKey);
             webpush.sendNotification(JSON.parse(queue_data.key),queue_data.data );
            cb(true);
        }
    });
}

function closeOnErr(err) {
    if (!err) return false;
    console.error("[AMQP] error", err);
    amqpConn.close();
    return true;
}

function current_time(){
    now = new Date();
    hour = "" + now.getHours(); if (hour.length == 1) { hour = "0" + hour; }
    minute = "" + now.getMinutes(); if (minute.length == 1) { minute = "0" + minute; }
    second = "" + now.getSeconds(); if (second.length == 1) { second = "0" + second; }
    return hour + ":" + minute + ":" + second;
}

start();