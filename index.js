const Discord = require('discord.js');
const { Database } = require("./database");

const config = require("./config");
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
    let content = message.content;
    if (message.content.startsWith(config.bot.prefix)) {
      // Handle action

      let command = getCommand(content);
      if (command == false) {
        message.reply('No valid command');
      }

      if (command == 'list') {
        message.reply(await getKilledMessage());
      }
      else if (command == 'add') {
        let usernames = '';
        let users = message.mentions.users;
        for (let userObject of users) {
          let user = userObject[1];
          let username = user.username;
          database.execute("INSERT INTO history (name) VALUES (?)", [
            username
          ]);
          usernames += ' ' + username;
        }
        message.reply('Added ' + usernames);
        let serverId = message.guild.id;
        let serverSettings = await database.execute("SELECT * FROM server_settings WHERE server=?", [serverId]);
        if (serverSettings.length > 0) {
          // Send the edit the message
          serverSettings = serverSettings[0];
          await syncKilled(serverSettings);
        }
      }
      else if (command == 'details') {
        let username = message.mentions.users.first().username;
        let kills = await database.execute("SELECT * FROM history WHERE name = ?", [username]);
        let returningMessage = 'Kills from ' + username + ' \n';
        for (let i = 0; i < kills.length; i++) {
          let kill = kills[i];
          let killDate = new Date(kill.created_at);
          let killDateString = (killDate.getDay() + 1) + "-" + killDate.getDate() + '-' + killDate.getFullYear();
          returningMessage += 'One kill happend on: ' + killDateString + ' \n';
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
        let serverSettings = await database.execute("SELECT * FROM server_settings WHERE server=?", [serverId]);
        if (serverSettings.length > 0) {
          // Send the edit the message
          serverSettings = serverSettings[0];
          await syncKilled(serverSettings);
        }
      }
      else if (command == 'help') {
        message.reply(`
          - .killer list -> Display list of all times someone was killed
          - .killer add -> Add a user to the kill list
          - .killer details USER -> Details of when a user killed someone
          - .killer bind CHANNEL -> Binds bots to a channel and a message
        `);
      }
      else {
        message.reply('Command not found, type list');
      }
    }
  });


  client.login(process.env.DISCORD_KEY ? process.env.DISCORD_KEY : config.discord.key);
})();

async function syncKilled(serverSettings) {
  let channel = await client.channels.fetch(serverSettings.bind_channel);
  let bindMessage = await channel.messages.fetch(serverSettings.message_id);
  bindMessage.edit(await getKilledMessage());
}


async function getKilledMessage() {
  let users = await database.execute("SELECT DISTINCT name FROM history", []);
  let timesKilled = {};
  for (let i = 0; i < users.length; i++) {
    let user = users[i];
    let username = user.name;
    let kills = await database.execute("SELECT COUNT(*) as times_killed FROM history WHERE name = ?", [username]);
    timesKilled[username] = kills[0].times_killed;
  }

  var sortable = [];
  for (let kill in timesKilled) {
      sortable.push([kill, timesKilled[kill]]);
  }

  sortable.sort(function(a, b) {
      return b[1] - a[1];
  });
  let sorted = {};
  sortable.forEach(function(item){
    sorted[item[0]]=item[1]
  });

  let returningMessage = "";
  for (var name in sorted) {
    returningMessage = returningMessage + " " + name + " killed a team member: " + sorted[name] + ' times \n';
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
