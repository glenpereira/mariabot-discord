require("dotenv").config(); //initialize dotenv
const {
  EC2Client,
  DescribeInstanceStatusCommand,
  StartInstancesCommand,
  StopInstancesCommand,
} = require("@aws-sdk/client-ec2");
const { Client, GatewayIntentBits, ActivityType } = require("discord.js"); //import discord.js
const axios = require("axios")

const CLIENT_TOKEN = process.env.CLIENT_TOKEN;
const MARIABOT_SERVER_INSTANCE_ID = process.env.MARIABOT_SERVER_INSTANCE_ID;
const MARIABOT_SERVER_URL = process.env.MARIABOT_SERVER_URL;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
}); //create new client
const ec2Client = new EC2Client({});

const ec2Input = {
  InstanceIds: [MARIABOT_SERVER_INSTANCE_ID],
};

const command = new DescribeInstanceStatusCommand(ec2Input);

let response = "not running";
let serverStatus = "";
let audioObject = {}

function checkServerStatus() {
  ec2Client
    .send(command)
    .then((res) => {
      try {
        console.log(res.InstanceStatuses);
        const resType = typeof res.InstanceStatuses;
        console.log(resType);
        response = res.InstanceStatuses[0].InstanceState.Name;
        console.log(typeof response);
      } finally {
        setTimeout(() => {
          console.log("in set timeout");
          if (response === "running") {
            serverStatus = "Online";
            console.log("setting server status to online");
          } else {
            serverStatus = "Offline";
            console.log("setting server status to offline");
          }
          client.user.setPresence({
            activities: [
              {
                name: `Server is ${serverStatus}`,
                type: ActivityType.Watching,
              },
            ],
            status: "online",
          });
          console.log("Server status: " + serverStatus);
        }, 2000);
      }
    })
    .catch((err) => {
      console.log(err);
    });
}

function startServer() {
  const command = new StartInstancesCommand(ec2Input);
  ec2Client
    .send(command)
    .then((res) => {
      console.log(res);
    })
    .catch((err) => {
      console.log(err);
    });
}

function stopServer() {
  const command = new StopInstancesCommand(ec2Input);
  ec2Client
    .send(command)
    .then((res) => {
      console.log(res);
    })
    .catch((err) => {
      console.log(err);
    });
}

async function postInputText(data) {
  await axios
    .post(`${MARIABOT_SERVER_URL}/text`, data)
    .then((res) => {
      console.log(res.data);
      audioObject = res.data
    })
    .catch((err) => {
      console.log(err);
    });
}

function sendMessage(msg){
  channel.send(msg)
}

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  setInterval(() => {
    checkServerStatus();
  }, 60000);
});

const statusName = "HI";

//make sure this line is the last line
client.login(CLIENT_TOKEN); //login bot using token

client.on("messageCreate", (msg) => {
  console.log(msg.content);
  if (msg.content === "m.hi") {
    msg.reply("Hello I'm Mariabot");
  }

  if (msg.content === "m.test") {
    msg.channel.send("testing");
    msg.channel.send("testing2");
  }

  if (msg.content === "m.status") {
    checkServerStatus();
    setTimeout(() => {
      if (serverStatus === "Online") {
        msg.reply("Server is 🟢Online!");
      } else {
        msg.reply("Server is 🔴Offline");
      }
    }, 3000);
  }

  if (msg.content === "m.start") {
    startServer();
    msg.reply("Please wait 30 seconds for server startup.");
    setTimeout(() => {
      checkServerStatus();
      setTimeout(() => {
        if (serverStatus === "Online") {
          msg.channel.send("Server is now 🟢Online!");
        }
      }, 2000);
    }, 15000);
  }

  if (msg.content === "m.stop") {
    stopServer();
    msg.reply("Stopping Server.");
    setTimeout(() => {
      checkServerStatus();
      setTimeout(() => {
        if (serverStatus === "Offline") {
          msg.channel.send("Server is now 🔴Offline!");
        }
      }, 2000);
    }, 15000);
  }

  if (msg.content.includes("m.post") === true) {
    let inputString = msg.content.replace("m.post ", "");
    console.log("Input string: " + inputString);
    const inputData = {
      text: inputString,
      author: 'discord-bot',
    }
    audioObject = postInputText(inputData)
    setTimeout(() => {
      msg.reply(`Input text: ${audioObject.text}`)
      msg.reply(`Audio Link: ${audioObject.src}`)
    }, 3000)

  }
});
