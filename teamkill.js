class TeamKill {

  constructor(database, serverId) {
    this.database = database;
    this.serverId = serverId;
  }

  addKill(username) {
    this.database.execute("INSERT INTO history (name, server_id) VALUES (?, ?)", [
      username,
      this.serverId,
    ]);
  }

  async getCountedKills() {
    let users = await this.database.execute("SELECT DISTINCT name FROM history WHERE server_id=?", [this.serverId]);
    let timesKilled = {};
    for (let i = 0; i < users.length; i++) {
      let user = users[i];
      let username = user.name;
      let kills = await this.database.execute("SELECT COUNT(*) as times_killed FROM history WHERE name = ? AND server_id=?", [username, this.serverId]);
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
    return sorted;
  }

  async getKillsOfUser(userId) {
    let result = [];
    let kills = await this.database.execute("SELECT * FROM history WHERE name = ? AND server_id=?", [username, this.serverId]);
    let returningMessage = 'Kills from ' + username + ' \n';
    for (let i = 0; i < kills.length; i++) {
      let kill = kills[i];
      let killDate = new Date(kill.created_at);
      let killDateString = (killDate.getDay() + 1) + "-" + killDate.getDate() + '-' + killDate.getFullYear();
      result.push(killDateString);
    }
    return result;
  }

  async getServerSettings() {
    let serverSettings = await this.database.execute("SELECT * FROM server_settings WHERE server=?", [this.serverId]);
    if (serverSettings.length > 0) {
      // Send the edit the message
      serverSettings = serverSettings[0];
      return serverSettings;
    }
    return false;
  }
}

module.exports = { TeamKill };
