const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

// Map to store pending image URL requests
const pendingImageRequests = new Map();

// Default image configuration
let imageConfig = {
  passImage: "https://example.com/pass_image.png",
  failImage: "https://example.com/fail_image.png"
};

// Path to store image configuration
const configPath = path.join(__dirname, 'image-config.json');

// Load image configuration if it exists
try {
  if (fs.existsSync(configPath)) {
    const configData = fs.readFileSync(configPath, 'utf8');
    imageConfig = JSON.parse(configData);
  }
} catch (error) {
  console.error('Error loading image configuration:', error);
}

// Save image configuration
function saveImageConfig() {
  try {
    fs.writeFileSync(configPath, JSON.stringify(imageConfig, null, 2), 'utf8');
    console.log('Image configuration saved successfully');
  } catch (error) {
    console.error('Error saving image configuration:', error);
  }
}

client.once('ready', () => {
  console.log(`${client.user.tag} has connected to Discord!`);
  console.log(`Bot is connected to ${client.guilds.cache.size} guilds`);
});

client.on('messageCreate', async (message) => {
  // Ignore messages from bots
  if (message.author.bot) return;

  // Check if this is an image URL response to a pending request
  if (pendingImageRequests.has(message.author.id)) {
    const requestData = pendingImageRequests.get(message.author.id);
    
    // Process the image URL
    const imageUrl = message.content.trim();
    
    if (imageUrl.toLowerCase() === 'default') {
      // Use default image based on result type
      if (requestData.resultType === 'pass') {
        requestData.embed.setImage(imageConfig.passImage);
      } else {
        requestData.embed.setImage(imageConfig.failImage);
      }
    } else if (imageUrl.toLowerCase() !== 'none') {
      // Use the provided image URL
      requestData.embed.setImage(imageUrl);
    }
    
    // Send the final embed
    await message.channel.send({ embeds: [requestData.embed] });
    
    // Delete the request from the pending map
    pendingImageRequests.delete(message.author.id);
    return;
  }

  // Process commands
  if (!message.content.startsWith('!')) return;
  
  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'embedd') {
    const embedContent = args.join(' ');
    
    if (!embedContent) {
      await message.reply('Please provide a message to embed.');
      return;
    }
    
    const embed = new EmbedBuilder()
      .setDescription(embedContent)
      .setColor('#3498db')
      .setAuthor({
        name: message.author.displayName || message.author.username,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      });
    
    await message.channel.send({ embeds: [embed] });
    // Delete original command message for cleanliness
    await message.delete().catch(error => console.error('Error deleting message:', error));
  }
  
  else if (command === 'result') {
    const resultType = args[0]?.toLowerCase();
    const userMention = args[1];
    const note = args.slice(2).join(' ');
    
    // Check if all required parameters are provided
    if (!resultType || !userMention || !note) {
      await message.reply('Missing parameters. Usage: `!result <Pass or Fail> <@UserMention> <Note>`');
      return;
    }
    
    // Check if result is either Pass or Fail
    if (resultType !== 'pass' && resultType !== 'fail') {
      await message.reply('Result must be either \'Pass\' or \'Fail\'.');
      return;
    }
    
    // Create base embed with provided information
    let color, title, resultText, description;
    
    if (resultType === 'pass') {
      color = '#2ecc71'; // Green
      title = 'South Dakota State Roleplay - Passed';
      resultText = 'PASSED';
      description = 'Congratulations! Your staff application has been approved. We\'re excited to welcome you to the team and look forward to working together!';
      
      // Create the embed
      const embed = new EmbedBuilder()
        .setColor(color)
        .setDescription(`${userMention}\n\n**${title}**\n\n${description}\n\n${note}\n\n${resultText} LARP`);
      
      // Ask for pass image specifically
      await message.reply('Please provide an image URL for the PASSED result (type \'default\' to use default image, or \'none\' to skip):');
      
      // Store the embed for later use
      pendingImageRequests.set(message.author.id, {
        embed: embed,
        resultType: 'pass',
        timestamp: Date.now()
      });
    } else { // resultType === 'fail'
      color = '#e74c3c'; // Red
      title = 'South Dakota State Roleplay - Failed';
      resultText = 'FAILED';
      description = 'Unfortunately, your staff application has not been approved. We encourage you not to be discouraged and hope you consider reapplying soon!';
      
      // Create the embed
      const embed = new EmbedBuilder()
        .setColor(color)
        .setDescription(`${userMention}\n\n**${title}**\n\n${description}\n\n${note}\n\n${resultText} LARP`);
      
      // Ask for fail image specifically
      await message.reply('Please provide an image URL for the FAILED result (type \'default\' to use default image, or \'none\' to skip):');
      
      // Store the embed for later use
      pendingImageRequests.set(message.author.id, {
        embed: embed,
        resultType: 'fail',
        timestamp: Date.now()
      });
    }
    
    // Set a timeout to remove the pending request after 1 minute
    setTimeout(() => {
      if (pendingImageRequests.has(message.author.id)) {
        pendingImageRequests.delete(message.author.id);
        message.channel.send('You took too long to provide an image URL. Command cancelled.');
      }
    }, 60000);
  }
  
  else if (command === 'setimagepass') {
    // Check if user has admin permissions
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      await message.reply('You need administrator permissions to use this command.');
      return;
    }
    
    const imageUrl = args[0];
    
    // Check if image URL is provided
    if (!imageUrl) {
      await message.reply('Missing parameter. Usage: `!setimagepass <imageUrl>`');
      return;
    }
    
    // Update and save image configuration
    imageConfig.passImage = imageUrl;
    await message.reply('Default pass image has been updated.');
    saveImageConfig();
  }
  
  else if (command === 'setimagefail') {
    // Check if user has admin permissions
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      await message.reply('You need administrator permissions to use this command.');
      return;
    }
    
    const imageUrl = args[0];
    
    // Check if image URL is provided
    if (!imageUrl) {
      await message.reply('Missing parameter. Usage: `!setimagefail <imageUrl>`');
      return;
    }
    
    // Update and save image configuration
    imageConfig.failImage = imageUrl;
    await message.reply('Default fail image has been updated.');
    saveImageConfig();
  }
});

// Cleanup expired pending requests every 5 minutes
setInterval(() => {
  const now = Date.now();
  pendingImageRequests.forEach((requestData, authorId) => {
    if (now - requestData.timestamp > 60000) {
      pendingImageRequests.delete(authorId);
    }
  });
}, 300000);

// Error handling
client.on('error', error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Login to Discord
client.login('XVXVXV');