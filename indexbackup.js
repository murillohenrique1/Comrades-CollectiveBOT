const { Client, GatewayIntentBits, Partials } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Message, Partials.Reaction, Partials.User]
});

const TOKEN = 'MTM0MTgzMzI4MzQ0ODg2ODg4NA.Gi-_E5.jIwfqEzrkAjRNgQwkG78rU17P8GSjHiZLMpHF8';

const TARGET_CHANNEL_THUMBSUP = '1342199771041103955';
const TARGET_CHANNEL_HOTFACE = '1344006586947080324';
const TARGET_CHANNEL_WHITECHECK = '1344007507554865223';

// Channels where duplicate message detection should work
const FILTERED_CHANNELS = [
    '1341488228137439262',
    '1342199771041103955',
    '1344006586947080324',
    '1344007507554865223',
    '1334617038077034506',
    '1334616656479260753'
];

const EMOJI_THUMBSUP = '👍';
const EMOJI_HOTFACE = '🥵';
const EMOJI_WHITECHECK = '✅';

// Global storage for messages (per channel)
const messageTracker = new Map();

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);
});

// Message Counting Command (!count)
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

    // ✅ Only apply duplicate message detection in specific channels
    if (!FILTERED_CHANNELS.includes(message.channel.id)) return;

    const channelId = message.channel.id;

    if (!messageTracker.has(channelId)) {
        messageTracker.set(channelId, new Set());
    }

    const seenMessages = messageTracker.get(channelId);

    // If this exact message has already been sent, delete the new one
    if (seenMessages.has(message.content)) {
        await message.delete();
    } else {
        seenMessages.add(message.content); // Store the message globally in the channel
    }
});

// Repost Messages on Reaction
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
    let targetChannelId = null;

    if (reaction.emoji.name === EMOJI_THUMBSUP) {
        targetChannelId = TARGET_CHANNEL_THUMBSUP;
    } else if (reaction.emoji.name === EMOJI_HOTFACE) {
        targetChannelId = TARGET_CHANNEL_HOTFACE;
    } else if (reaction.emoji.name === EMOJI_WHITECHECK) {
        targetChannelId = TARGET_CHANNEL_WHITECHECK;
    }

    if (targetChannelId) {
        const targetChannel = message.guild.channels.cache.get(targetChannelId);

        if (!targetChannel) {
            console.error(`❌ Channel with ID ${targetChannelId} not found.`);
            return;
        }

        // Only repost the message content, no extra text
        if (message.content) {
            await targetChannel.send(message.content);
        }
    }
});

client.login(TOKEN);
