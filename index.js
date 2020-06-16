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
        let users = await database.execute("SELECT DISTINCT name FROM history", []);
        let timesKilled = {};
        for (let i = 0; i < users.length; i++) {
          let user = users[i];
          let username = user.name;
          let kills = await database.execute("SELECT COUNT(*) as times_killed FROM history WHERE name = ?", [username]);
          timesKilled[username] = kills[0].times_killed;
        }

        let returningMessage = "";
        for (var name in timesKilled) {
          returningMessage = returningMessage + " " + name + " killed a team member: " + timesKilled[name] + ' times \n';
        }

        message.reply(returningMessage);
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
      }
      else if (command == 'help') {
        message.reply(`
          - .killer list -> Display list of all times someone was killed
          - .killer add -> Add a user to the kill list
        `);
      }
      else {
        message.reply('Command not found, type list');
      }
    }
  });


  client.login(process.env.DISCORD_KEY ? process.env.DISCORD_KEY : config.discord.key);
})();




function getCommand(message) {
  let words = message.split(" ");
  if (words.length > 1) {
    // We have command
    return words[1];
  }
  return false;
}
