const Discord = require('discord.js');
const Database = require("./database");

const config = require("./config");
const client = new Discord.Client();
const database = new Database(config.db);

(async() => {
  let tableExists = await database.tableExists('history');
  if (tableExists == false) {
    await database.execute("CREATE TABLE `history` ( `id` INT NOT NULL AUTO_INCREMENT , `name` TEXT NOT NULL , `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP , PRIMARY KEY (`id`)) ENGINE = InnoDB;", []);
  }

  client.on('ready', () => {
    console.log("Ready to do this");
  });

  client.on('message', (message) => {
    if (message.content.startsWith(config.bot.prefix)) {
      // Handle action

      let command = getCommand(message);
      if (command == false) {
        message.reply('No valid command');
      }

      if (command == 'list') {
        let users = await database.execute("SELECT DISTINCT name FROM history", []);
        let timesKilled = {};
        for (let i = 0; i < users.length; i++) {
          let user = users[i];
          let kills = await database.execute("SELECT COUNT(*) as times_killed FROM history WHERE name = ?");
          timesKilled[user] = kills;
        }

        let returningMessage = "";
        for (var name in timesKilled) {
          returningMessage = returningMessage + " " + name + " killed a team member: " + timesKilled[name] + ' times \n';
        }

        message.reply(returningMessage);
      }
      else if (command == 'add') {
        let users = message.mentions.users;
        for (let i = 0; i < users.length; i++) {
          let user = users[i];
          database.execute("INSERT INTO history (name) VALUES (?)", [
            user
          ]);
          message.reply('Added ' + user);
        }
      }
      else {
        message.reply('Command not found');
      }
    }
  });


  client.login(config.discord.key);
})();




function getCommand(message) {
  let words = message.split(" ");
  if (words.length > 1) {
    // We have command
    return words[1];
  }
  return false;
}
