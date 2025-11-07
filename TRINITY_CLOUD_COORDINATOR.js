/**
 * TRINITY CLOUD COORDINATOR
 * Real cloud-based communication between 3 Trinity computers
 *
 * SOLUTION: GitHub repo as communication layer
 * - All 3 computers clone the same repo
 * - Push/pull for state sync
 * - C1 can "wake up" C2 and tell them what to do
 * - Works offline (syncs when online)
 *
 * BACKUP: Railway simple API endpoint for real-time
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);

const CONFIG = {
  // GitHub coordination (simplest, works everywhere)
  github: {
    repoUrl: 'TRINITY_COORDINATION',  // You'll set this up
    localPath: path.join(__dirname, '.trinity-sync'),
    stateFile: 'trinity-state.json',
    messagesFile: 'trinity-messages.json'
  },

  // Alternative: Simple cloud endpoint
  cloudEndpoint: process.env.TRINITY_CLOUD_URL || null,

  // Sync interval
  syncInterval: 5000  // Check every 5 seconds
};

class TrinityCloudCoordinator {
  constructor(myId) {
    if (!['C1', 'C2', 'C3'].includes(myId)) {
      throw new Error('myId must be C1, C2, or C3');
    }

    this.myId = myId;
    this.syncInterval = null;
    this.lastSync = null;
  }

  // ===== SETUP =====

  async setup(githubRepoUrl) {
    console.log(`🌩️  Setting up cloud coordination for ${this.myId}...`);

    // Clone or pull repo
    if (!fs.existsSync(CONFIG.github.localPath)) {
      console.log('📦 Cloning coordination repo...');
      await execPromise(`git clone ${githubRepoUrl} "${CONFIG.github.localPath}"`);
    } else {
      console.log('🔄 Pulling latest coordination state...');
      await execPromise(`cd "${CONFIG.github.localPath}" && git pull`);
    }

    // Initialize state if doesn't exist
    await this.initializeState();

    console.log('✅ Cloud coordination ready');
  }

  async initializeState() {
    const statePath = path.join(CONFIG.github.localPath, CONFIG.github.stateFile);
    const messagesPath = path.join(CONFIG.github.localPath, CONFIG.github.messagesFile);

    if (!fs.existsSync(statePath)) {
      const initialState = {
        mission: null,
        members: {
          C1: { status: 'offline', lastSeen: null, currentTask: null },
          C2: { status: 'offline', lastSeen: null, currentTask: null },
          C3: { status: 'offline', lastSeen: null, currentTask: null }
        },
        coordination: {
          phase: 'idle',
          lastUpdate: new Date().toISOString()
        }
      };

      fs.writeFileSync(statePath, JSON.stringify(initialState, null, 2));
    }

    if (!fs.existsSync(messagesPath)) {
      fs.writeFileSync(messagesPath, JSON.stringify({ messages: [] }, null, 2));
    }

    // Initial commit
    await this.commitAndPush('Initialize Trinity coordination');
  }

  // ===== SYNC =====

  async sync() {
    try {
      // Pull latest
      await execPromise(`cd "${CONFIG.github.localPath}" && git pull --rebase`);
      this.lastSync = new Date();
      return true;
    } catch (err) {
      console.error('Sync error:', err.message);
      return false;
    }
  }

  async commitAndPush(message) {
    try {
      await execPromise(`cd "${CONFIG.github.localPath}" && git add -A`);
      await execPromise(`cd "${CONFIG.github.localPath}" && git commit -m "${message}" || echo "No changes"`);
      await execPromise(`cd "${CONFIG.github.localPath}" && git push`);
      return true;
    } catch (err) {
      console.error('Push error:', err.message);
      return false;
    }
  }

  // ===== STATE MANAGEMENT =====

  async getState() {
    await this.sync();
    const statePath = path.join(CONFIG.github.localPath, CONFIG.github.stateFile);
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  }

  async setState(state) {
    const statePath = path.join(CONFIG.github.localPath, CONFIG.github.stateFile);
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    await this.commitAndPush(`${this.myId} updated state`);
  }

  // ===== PRESENCE =====

  async reportOnline() {
    const state = await this.getState();
    state.members[this.myId] = {
      status: 'online',
      lastSeen: new Date().toISOString(),
      currentTask: state.members[this.myId]?.currentTask || null
    };
    await this.setState(state);
    console.log(`✅ ${this.myId} reported online`);
  }

  async reportOffline() {
    const state = await this.getState();
    state.members[this.myId].status = 'offline';
    await this.setState(state);
  }

  async heartbeat() {
    const state = await this.getState();
    state.members[this.myId].lastSeen = new Date().toISOString();
    await this.setState(state);
  }

  // ===== MESSAGING (C1 can "call" C2) =====

  async sendMessage(toMember, message) {
    console.log(`📨 ${this.myId} → ${toMember}: ${message.subject}`);

    await this.sync();
    const messagesPath = path.join(CONFIG.github.localPath, CONFIG.github.messagesFile);
    const messagesData = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));

    messagesData.messages.push({
      id: Date.now().toString(),
      from: this.myId,
      to: toMember,
      subject: message.subject,
      body: message.body,
      timestamp: new Date().toISOString(),
      read: false
    });

    fs.writeFileSync(messagesPath, JSON.stringify(messagesData, null, 2));
    await this.commitAndPush(`${this.myId} sent message to ${toMember}`);
  }

  async getMessages() {
    await this.sync();
    const messagesPath = path.join(CONFIG.github.localPath, CONFIG.github.messagesFile);
    const messagesData = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));

    // Get messages for me that are unread
    const myMessages = messagesData.messages.filter(m =>
      m.to === this.myId && !m.read
    );

    return myMessages;
  }

  async markMessagesRead(messageIds) {
    const messagesPath = path.join(CONFIG.github.localPath, CONFIG.github.messagesFile);
    const messagesData = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));

    for (const id of messageIds) {
      const message = messagesData.messages.find(m => m.id === id);
      if (message) {
        message.read = true;
      }
    }

    fs.writeFileSync(messagesPath, JSON.stringify(messagesData, null, 2));
    await this.commitAndPush(`${this.myId} marked messages read`);
  }

  // ===== WAKE UP OTHER MEMBERS =====

  async wakeUp(member, instruction) {
    console.log(`⏰ ${this.myId} waking up ${member}...`);

    await this.sendMessage(member, {
      subject: 'WAKE_UP',
      body: {
        type: 'wake_up',
        instruction,
        from: this.myId
      }
    });

    console.log(`✅ Wake-up message sent to ${member}`);
  }

  async assignTask(member, task) {
    console.log(`📋 ${this.myId} assigning task to ${member}...`);

    await this.sendMessage(member, {
      subject: 'TASK_ASSIGNMENT',
      body: {
        type: 'task',
        task,
        from: this.myId
      }
    });

    // Update state
    const state = await this.getState();
    state.members[member].currentTask = task;
    await this.setState(state);

    console.log(`✅ Task assigned to ${member}`);
  }

  // ===== COORDINATION =====

  async requestHelp(topic) {
    console.log(`🆘 ${this.myId} requesting help: ${topic}`);

    const others = ['C1', 'C2', 'C3'].filter(m => m !== this.myId);

    for (const member of others) {
      await this.sendMessage(member, {
        subject: 'HELP_REQUEST',
        body: {
          type: 'help',
          topic,
          from: this.myId
        }
      });
    }
  }

  async reportComplete(task) {
    console.log(`✅ ${this.myId} completed: ${task}`);

    const state = await this.getState();
    state.members[this.myId].currentTask = null;
    await this.setState(state);

    // Notify others
    const others = ['C1', 'C2', 'C3'].filter(m => m !== this.myId);

    for (const member of others) {
      await this.sendMessage(member, {
        subject: 'TASK_COMPLETE',
        body: {
          type: 'complete',
          task,
          from: this.myId
        }
      });
    }
  }

  // ===== MONITORING =====

  async whoIsOnline() {
    const state = await this.getState();
    const online = [];

    for (const [member, data] of Object.entries(state.members)) {
      if (data.status === 'online') {
        // Check if last seen is recent (within 30 seconds)
        const lastSeen = new Date(data.lastSeen);
        const now = new Date();
        const diff = (now - lastSeen) / 1000;

        if (diff < 30) {
          online.push(member);
        }
      }
    }

    return online;
  }

  async getMemberStatus(member) {
    const state = await this.getState();
    return state.members[member];
  }

  // ===== AUTO SYNC LOOP =====

  startAutoSync() {
    console.log(`🔄 ${this.myId} starting auto-sync (${CONFIG.syncInterval}ms)...`);

    this.syncInterval = setInterval(async () => {
      await this.sync();
      await this.heartbeat();
      await this.checkMessages();
    }, CONFIG.syncInterval);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async checkMessages() {
    const messages = await this.getMessages();

    if (messages.length > 0) {
      console.log(`\n📬 ${this.myId} has ${messages.length} new messages:`);

      for (const msg of messages) {
        console.log(`\n  From: ${msg.from}`);
        console.log(`  Subject: ${msg.subject}`);
        console.log(`  Time: ${msg.timestamp}`);

        // Auto-handle certain message types
        if (msg.body.type === 'wake_up') {
          console.log(`  ⏰ WAKE UP CALL: ${msg.body.instruction}`);
        } else if (msg.body.type === 'task') {
          console.log(`  📋 TASK ASSIGNED: ${JSON.stringify(msg.body.task)}`);
        } else if (msg.body.type === 'help') {
          console.log(`  🆘 HELP REQUEST: ${msg.body.topic}`);
        }
      }

      // Mark as read
      await this.markMessagesRead(messages.map(m => m.id));
    }
  }
}

// ===== SIMPLE SETUP =====

async function quickStart() {
  console.log(`
🌩️  TRINITY CLOUD COORDINATOR - QUICK START

Step 1: Create a private GitHub repo named "trinity-coordination"

Step 2: Clone it on all 3 computers:
  git clone https://github.com/YOUR_USERNAME/trinity-coordination.git

Step 3: Initialize on each computer:
  const coordinator = new TrinityCloudCoordinator('C1');  // or C2, C3
  await coordinator.setup('https://github.com/YOUR_USERNAME/trinity-coordination.git');
  await coordinator.reportOnline();
  coordinator.startAutoSync();

Step 4: Now C1 can wake up C2:
  await coordinator.wakeUp('C2', 'Build the payment integration');
  await coordinator.assignTask('C2', { type: 'build', feature: 'payment' });

DONE! All 3 computers now communicate through GitHub.
  `);
}

// ===== CLI =====

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const myId = process.env.TRINITY_MEMBER || args[1];

  if (!myId || !['C1', 'C2', 'C3'].includes(myId)) {
    console.log('Usage: TRINITY_MEMBER=C1 node TRINITY_CLOUD_COORDINATOR.js <command>');
    console.log('   or: node TRINITY_CLOUD_COORDINATOR.js <command> <C1|C2|C3>');
    return;
  }

  const coordinator = new TrinityCloudCoordinator(myId);

  switch (command) {
    case 'setup':
      const repoUrl = args[2] || process.env.TRINITY_REPO_URL;
      if (!repoUrl) {
        console.error('Provide repo URL: setup <github-url>');
        return;
      }
      await coordinator.setup(repoUrl);
      break;

    case 'online':
      await coordinator.reportOnline();
      break;

    case 'offline':
      await coordinator.reportOffline();
      break;

    case 'status':
      const online = await coordinator.whoIsOnline();
      console.log('Online members:', online);
      break;

    case 'wake':
      const target = args[2];
      const instruction = args.slice(3).join(' ');
      await coordinator.wakeUp(target, instruction);
      break;

    case 'messages':
      const messages = await coordinator.getMessages();
      console.log('Messages:', messages);
      break;

    case 'monitor':
      await coordinator.reportOnline();
      coordinator.startAutoSync();
      console.log('Monitoring... Press Ctrl+C to stop');
      break;

    default:
      console.log('Commands: setup, online, offline, status, wake, messages, monitor');
  }
}

if (require.main === module) {
  if (process.argv.length === 2) {
    quickStart();
  } else {
    main();
  }
}

module.exports = TrinityCloudCoordinator;
