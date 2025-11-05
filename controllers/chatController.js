const { StreamChat } = require("stream-chat");
const Attorney = require("../models/Attorney");
const Paralegal = require("../models/Paralegal");

let client;

// Lazy initialize Stream client
function getClient() {
  if (!client) {
    if (!process.env.STREAM_API_KEY || !process.env.STREAM_API_SECRET) {
      throw new Error("Stream credentials missing");
    }
    client = StreamChat.getInstance(
      process.env.STREAM_API_KEY,
      process.env.STREAM_API_SECRET
    );
    console.log("✅ Stream client initialized");
  }
  return client;
}

// =============================
// Generate Token for Frontend
// =============================
exports.getChatToken = async (req, res) => {
  try {
    const client = getClient();
    const user = req.user;

    const userId = user._id.toString();
    const name =
      user.fullName ||
      `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
      "User";

    // ✅ Always upsert before token creation
    await client.upsertUser({
      id: userId,
      name,
      image: user.avatar || null,
    });

    const token = client.createToken(userId);

    res.status(200).json({
      success: true,
      token,
      apiKey: process.env.STREAM_API_KEY,
      user: { id: userId, name },
    });
  } catch (err) {
    console.error("❌ getChatToken error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// =============================
// Create or Get Chat Channel
// =============================
exports.createChatChannel = async (req, res) => {
  try {
    const client = getClient();
    const user = req.user;
    const targetId = req.body.targetId;

    if (!targetId) {
      return res.status(400).json({ message: "Target user ID required" });
    }

    // ✅ Fetch both users
    const currentUser =
      (await Attorney.findById(user._id)) ||
      (await Paralegal.findById(user._id));
    const targetUser =
      (await Attorney.findById(targetId)) ||
      (await Paralegal.findById(targetId));

    if (!currentUser || !targetUser) {
      return res
        .status(404)
        .json({ message: "One or both users not found in database" });
    }

    const currentUserName =
      currentUser.fullName ||
      `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() ||
      "User";
    const targetUserName =
      targetUser.fullName ||
      `${targetUser.firstName || ""} ${targetUser.lastName || ""}`.trim() ||
      "User";

    // ✅ Ensure both users exist on Stream
    await client.upsertUsers([
      {
        id: user._id.toString(),
        name: currentUserName,
        image: currentUser.avatar || null,
      },
      {
        id: targetId.toString(),
        name: targetUserName,
        image: targetUser.avatar || null,
      },
    ]);

    // ✅ Check if channel already exists between both users
    const filter = {
      type: "messaging",
      member_count: 2,
      members: { $in: [user._id.toString()] },
    };

    const existingChannels = await client.queryChannels(filter);
    const existing = existingChannels.find((ch) => {
      const m = ch.state.members;
      return (
        m[user._id.toString()] && m[targetId.toString()]
      );
    });

    if (existing) {
      // ✅ Return existing channel ID
      return res.status(200).json({
        success: true,
        channelId: existing.id,
        alreadyExists: true,
      });
    }

    // ✅ Create new channel only if not exists
    const channelId = `chat_${[user._id, targetId].sort().join("_")}`;
    const channel = client.channel("messaging", channelId, {
      members: [user._id.toString(), targetId.toString()],
      name: `Chat: ${currentUserName} & ${targetUserName}`,
      created_by_id: user._id.toString(),
    });

    await channel.create();

    res.status(200).json({
      success: true,
      channelId,
      alreadyExists: false,
    });
  } catch (err) {
    console.error("❌ createChatChannel error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};


// =============================
// Get User Channels
// =============================
exports.getUserChannels = async (req, res) => {
  try {
    const client = getClient();
    const filter = { members: { $in: [req.user._id.toString()] } };
    const channels = await client.queryChannels(filter);
    res.status(200).json({ success: true, channels });
  } catch (err) {
    console.error("❌ getUserChannels error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};
