const Discord = require('discord.js');

const { Database } = require("./database");
const config = require("./config");
const { TeamKill } = require("./teamkill");

const client = new Discord.Client();

const database = new Database(config.db);
// https://discord.com/api/oauth2/authorize?client_id=722454127887515649&permissions=206912&scope=bot

(async() => {
  let tableExists = await database.tableExists('history');
  if (tableExists == false) {
    await database.execute("CREATE TABLE `history` ( `id` INT NOT NULL AUTO_INCREMENT , `name` TEXT NOT NULL , `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP , PRIMARY KEY (`id`)) ENGINE = InnoDB;", []);
  }

  client.on('ready', () => {
    console.log("Ready to do this");
    client.user.setActivity('Type .killer');
  });

  client.on('message', async (message) => {
    let teamkill = new TeamKill(database, message.guild.id);
    let content = message.content;
    if (message.content.startsWith(config.bot.prefix)) {
      // Handle action

      let command = getCommand(content);
      if (command == false) {
        message.reply('No valid command');
      }

      if (command == 'list') {
        let kills = await teamkill.getCountedKills();
        message.reply(await getKilledMessage(kills));
      }
      else if (command == 'add') {
        let usernames = '';
        let users = message.mentions.users;
        if (users.first() == undefined) {
          message.reply("Missing username");
          return;
        }
        for (let userObject of users) {
          let user = userObject[1];
          let username = user.username;
          teamkill.addKill(username);
          usernames += ' ' + username;
        }
        message.reply('Added ' + usernames);
        let settings = await teamkill.getServerSettings();
        if (settings) {
          // Send the edit the message
          await syncKilled(teamkill, settings);
        }
      }
      else if (command == 'details') {
        let username = message.mentions.users.first().username;
        let kills = teamkill.getKillsOfUser(username);
        let returningMessage = '';
        for (let i = 0; i < kills.length; i++) {
          returningMessage += 'One kill happend on: ' + kills[i] + ' \n';
        }
        message.reply(returningMessage);
      }
      else if (command == 'bind') {
        let channel = message.mentions.channels.first();
        let channelId = channel.id;
        let server = message.guild;
        let serverId = server.id;
        if (await database.execute("SELECT * FROM server_settings WHERE server=?", [serverId]).length > 0) {
          // Update
          await database.execute("UPDATE server_settings SET bind_channel=? WHERE server=?", [channelId, serverId]);
        }
        else {
          // Insert
          await database.execute("INSERT INTO server_settings (server, bind_channel) VALUES (?, ?)", [serverId, channelId]);
        }
        let sendedMessage = await channel.send('Binded to this channel and message');
        await database.execute('UPDATE server_settings SET message_id=? WHERE server=?', [sendedMessage.id, serverId]);
      }
      else if (command == 'sync') {
        let serverId = message.guild.id;
        let serverSettings = await teamkill.getServerSettings();
        if (serverSettings) {
          // Send the edit the message
          await syncKilled(teamkill, serverSettings);
        }
      }
      else if (command == 'share') {
        message.reply("You can add me with the following link: https://discord.com/api/oauth2/authorize?client_id=722454127887515649&permissions=206912&scope=bot");
      }
      else if (command == 'help') {
        message.reply(`
          - .killer list -> Display list of all times someone was killed
          - .killer add -> Add a user to the kill list
          - .killer details USER -> Details of when a user killed someone
          - .killer bind CHANNEL -> Binds bots to a channel and a message
          - .killer share -> Gives you the link to deploy the script on your own discord server
        `);
      }
      else {
        message.reply('Command not found, type list');
      }
    }
  });


  client.login(process.env.DISCORD_KEY ? process.env.DISCORD_KEY : config.discord.key);
})();

async function syncKilled(teamkill, serverSettings) {
  let channel = await client.channels.fetch(serverSettings.bind_channel);
  let bindMessage = await channel.messages.fetch(serverSettings.message_id);
  let kills = await teamkill.getCountedKills();
  bindMessage.edit(await getKilledMessage(kills));
}


async function getKilledMessage(kills) {
  let returningMessage = "";
  for (let name in kills) {
    returningMessage = returningMessage + " " + name + " killed a team member: " + kills[name] + ' times \n';
  }
  return returningMessage;
}

function getCommand(message) {
  let words = message.split(" ");
  if (words.length > 1) {
    // We have command
    return words[1];
  }
  return false;
}
