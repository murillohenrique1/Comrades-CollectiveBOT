const { Client, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');

// Bot Configuration
const TOKEN = 'YOUR_BOT_TOKEN_HERE';  // ❌ REPLACE THIS WITH YOUR ACTUAL TOKEN
const DB_FILE = 'messages.json';

// Channels for reaction reposting
const TARGET_CHANNELS = {
    '👍': '1342199771041103955',
    '🥵': '1344006586947080324',
    '✅': '1344007507554865223'
};

// Filtered channels for duplicate detection
const FILTERED_CHANNELS = [
    '1341488228137439262',
    '1342199771041103955',
    '1344006586947080324',
    '1344007507554865223',
    '1334617038077034506',
    '1334616656479260753'
];

// Initialize bot client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Message, Partials.Reaction, Partials.User]
});

// Initialize JSON database
let messagesDB = {};

// Load messages from JSON file
if (fs.existsSync(DB_FILE)) {
    const rawData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

    // Convert arrays back to Sets
    messagesDB = Object.fromEntries(
        Object.entries(rawData).map(([channelId, messages]) => [channelId, new Set(messages)])
    );
} else {
    fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2));
}

// Store messages in database
function storeMessage(channelId, content) {
    if (!messagesDB[channelId]) messagesDB[channelId] = new Set();
    messagesDB[channelId].add(content);

    // Convert Sets back into arrays before saving
    const jsonData = Object.fromEntries(
        Object.entries(messagesDB).map(([channel, messages]) => [channel, [...messages]])
    );

    fs.writeFileSync(DB_FILE, JSON.stringify(jsonData, null, 2));
}

// Fetch old messages on startup
async function fetchHistory(channel) {
    console.log(`📜 Fetching history for #${channel.name}...`);

    let lastMessageId;
    while (true) {
        const messages = await channel.messages.fetch({ limit: 100, before: lastMessageId });

        for (const message of messages.values()) {
            storeMessage(channel.id, message.content.trim());
        }

        if (messages.size < 100) break;
        lastMessageId = messages.last().id;
    }

    console.log(`✅ Finished fetching history for #${channel.name}`);
}

// Bot ready event
client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);

    // Fetch history for filtered channels
    for (const channelId of FILTERED_CHANNELS) {
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (channel) await fetchHistory(channel);
    }
});

// Message event for commands and duplicate detection
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content === '!ping') {
        message.reply('Pong! 🏓');
    }

    if (message.content === '!count') {
        let count = 0;
        let lastMessageId;

        try {
            while (true) {
                const messages = await message.channel.messages.fetch({ limit: 100, before: lastMessageId });
                count += messages.size;
                if (messages.size < 100) break;
                lastMessageId = messages.last().id;
            }

            message.reply(`📊 This channel has **${count}** messages!`);
        } catch (error) {
            console.error(error);
            message.reply("❌ I couldn't count the messages!");
        }
    }

    // Check for duplicates
    if (!FILTERED_CHANNELS.includes(message.channel.id)) return;

    const content = message.content.trim();
    if (messagesDB[message.channel.id] && messagesDB[message.channel.id].has(content)) {
        await message.delete();
        message.channel.send(`🚫 ${message.author}, this message has already been posted.`);
    } else {
        storeMessage(message.channel.id, content);
    }
});

// Reposting messages based on reactions
client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;

    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('❌ Error fetching reaction:', error);
            return;
        }
    }

    const message = reaction.message;
    const targetChannelId = TARGET_CHANNELS[reaction.emoji.name];

    if (targetChannelId) {
        const targetChannel = message.guild.channels.cache.get(targetChannelId);
        if (!targetChannel) {
            console.error(`❌ Channel with ID ${targetChannelId} not found.`);
            return;
        }

        if (message.content) {
            await targetChannel.send(message.content);
        }
    }
});

// Login bot
client.login('MTM0MTgzMzI4MzQ0ODg2ODg4NA.Gi-_E5.jIwfqEzrkAjRNgQwkG78rU17P8GSjHiZLMpHF8'); 