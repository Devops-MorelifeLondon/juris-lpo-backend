const { StreamChat } = require('stream-chat');
const Attorney = require('../models/Attorney');
const Paralegal = require('../models/Paralegal');

let client; // lazy initialization

function getClient() {
  if (!client) {
    if (!process.env.STREAM_API_KEY || !process.env.STREAM_API_SECRET) {
      console.error('❌ Stream API credentials missing — please check .env');
      throw new Error('STREAM credentials missing');
    }

    client = StreamChat.getInstance(
      process.env.STREAM_API_KEY,
      process.env.STREAM_API_SECRET
    );

    console.log('✅ Stream client initialized');
  }
  return client;
}

// ========================
// Generate chat token
// ========================
exports.getChatToken = async (req, res) => {
  try {
    console.log('🔥 Hit /api/chat/get-token');
    const client = getClient();

    const user = req.user;
    const role = req.role;
    const name = user.fullName || `${user.firstName} ${user.lastName}` || 'User';
    const avatar = user.avatar || null;

    const userId = user._id.toString(); // ✅ always string

    await client.upsertUser({
      id: userId,
      name,
      image: avatar,
    });

    const token = client.createToken(userId);

    res.status(200).json({
      success: true,
      token,
      apiKey: process.env.STREAM_API_KEY,
      user: { id: userId, name, role, avatar },
    });
  } catch (err) {
    console.error('❌ getChatToken error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ========================
// Create or get chat channel
// ========================
// ========================
// Create or get chat channel
// ========================
exports.createChatChannel = async (req, res) => {
  try {
    const client = getClient();
    const user = req.user;
    const targetId = req.body.targetId;

    if (!targetId) {
      return res.status(400).json({ message: 'Target user ID required' });
    }

    // ✅ Fetch both users (replace with your actual models)
    const currentUser =
      (await Attorney.findById(user.id)) || (await Paralegal.findById(user.id));
    const targetUser =
      (await Attorney.findById(targetId)) || (await Paralegal.findById(targetId));

    const currentUserName =
      currentUser?.fullName ||
      `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() ||
      'User';
    const targetUserName =
      targetUser?.fullName ||
      `${targetUser?.firstName || ''} ${targetUser?.lastName || ''}`.trim() ||
      'User';

    // ✅ Ensure both exist on Stream
    await client.upsertUsers([
      {
        id: user.id.toString(),
        name: currentUserName,
        image: currentUser?.avatar || null,
      },
      {
        id: targetId.toString(),
        name: targetUserName,
        image: targetUser?.avatar || null,
      },
    ]);

    // ✅ Create or get existing channel
    const channelId = `chat_${[user.id, targetId].sort().join('_')}`;
    const channel = client.channel('messaging', channelId, {
      members: [user.id.toString(), targetId.toString()],
      name: `Chat between ${currentUserName} and ${targetUserName}`, // ✅
      created_by_id: user.id.toString(),
    });

    await channel.create();

    res.status(200).json({ success: true, channelId });
  } catch (err) {
    console.error('❌ createChatChannel error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};



// ========================
// Get user channels
// ========================
exports.getUserChannels = async (req, res) => {
  try {
    const client = getClient();
    const filter = { members: { $in: [req.user._id.toString()] } };
    const channels = await client.queryChannels(filter);
    res.status(200).json({ success: true, channels });
  } catch (err) {
    console.error('❌ getUserChannels error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};
