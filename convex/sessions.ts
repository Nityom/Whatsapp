import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getWhatsAppSession = query({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("whatsappSessions")
      .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
  },
});

export const saveWhatsAppSession = mutation({
  args: {
    phoneNumber: v.string(),
    currentStep: v.string(),
    language: v.optional(v.string()),
    patientId: v.optional(v.string()),
    patientReference: v.optional(v.string()),
    patientName: v.optional(v.string()),
    isVerified: v.optional(v.boolean()),
    verificationOtp: v.optional(v.string()),
    otpExpiresAt: v.optional(v.number()),
    pendingAction: v.optional(v.string()),
    isHandedOver: v.optional(v.boolean()),
    handoverReason: v.optional(v.string()),
    handoverTimestamp: v.optional(v.number()),
    lastBookedDoctor: v.optional(v.string()),
    lastBookedDate: v.optional(v.string()),
    bookingDraft: v.optional(
      v.object({
        doctorName: v.optional(v.string()),
        specialty: v.optional(v.string()),
        date: v.optional(v.string()),
        session: v.optional(v.string()),
        currentSession: v.optional(v.string()),
        slot: v.optional(v.string()),
        slotTime: v.optional(v.string()),
        patientName: v.optional(v.string()),
        patientAge: v.optional(v.string()),
        patientPhone: v.optional(v.string()),
        patientAddress: v.optional(v.string()),
        sex: v.optional(v.union(v.literal("Male"), v.literal("Female"), v.literal("Other"))),
        complaint: v.optional(v.string()),
        startDate: v.optional(v.string()),
        pickupTime: v.optional(v.string()),
        returnDate: v.optional(v.string()),
        returnTime: v.optional(v.string()),
        customerName: v.optional(v.string()),
        customerLatitude: v.optional(v.number()),
        customerLongitude: v.optional(v.number()),
        distanceKm: v.optional(v.number()),
        locationName: v.optional(v.string()),
        locationAddress: v.optional(v.string()),
        vehicleName: v.optional(v.string()),
        vehiclePrice: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("whatsappSessions")
      .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    const now = Date.now();

    if (existing) {
      const mergedDraft = args.bookingDraft
        ? { ...(existing.bookingDraft || {}), ...args.bookingDraft }
        : existing.bookingDraft;

      await ctx.db.patch(existing._id, {
        currentStep: args.currentStep,
        language: args.language ?? existing.language,
        patientId: args.patientId === "" ? undefined : (args.patientId ?? existing.patientId),
        patientReference: args.patientReference === "" ? undefined : (args.patientReference ?? existing.patientReference),
        patientName: args.patientName === "" ? undefined : (args.patientName ?? existing.patientName),
        isVerified: args.isVerified ?? existing.isVerified,
        verificationOtp: args.verificationOtp ?? existing.verificationOtp,
        otpExpiresAt: args.otpExpiresAt ?? existing.otpExpiresAt,
        pendingAction: args.pendingAction ?? existing.pendingAction,
        isHandedOver: args.isHandedOver ?? existing.isHandedOver,
        handoverReason: args.handoverReason ?? existing.handoverReason,
        handoverTimestamp: args.handoverTimestamp ?? existing.handoverTimestamp,
        lastBookedDoctor: args.lastBookedDoctor ?? existing.lastBookedDoctor,
        lastBookedDate: args.lastBookedDate ?? existing.lastBookedDate,
        bookingDraft: mergedDraft,
        updatedAt: now,
      });

      return await ctx.db.get(existing._id);
    }

    const newId = await ctx.db.insert("whatsappSessions", {
      phoneNumber: args.phoneNumber,
      currentStep: args.currentStep,
      language: args.language,
      patientId: args.patientId,
      patientReference: args.patientReference,
      patientName: args.patientName,
      isVerified: args.isVerified ?? false,
      verificationOtp: args.verificationOtp,
      otpExpiresAt: args.otpExpiresAt,
      pendingAction: args.pendingAction,
      isHandedOver: args.isHandedOver ?? false,
      handoverReason: args.handoverReason,
      handoverTimestamp: args.handoverTimestamp,
      lastBookedDoctor: args.lastBookedDoctor,
      lastBookedDate: args.lastBookedDate,
      bookingDraft: args.bookingDraft,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(newId);
  },
});

export const clearWhatsAppSession = mutation({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("whatsappSessions")
      .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        currentStep: "WELCOME",
        language: undefined,
        isVerified: false,
        bookingDraft: undefined,
        pendingAction: undefined,
        verificationOtp: undefined,
        otpExpiresAt: undefined,
        isHandedOver: false,
        handoverReason: undefined,
        handoverTimestamp: undefined,
        updatedAt: now,
      });
      return await ctx.db.get(existing._id);
    }

    const newId = await ctx.db.insert("whatsappSessions", {
      phoneNumber: args.phoneNumber,
      currentStep: "WELCOME",
      isVerified: false,
      isHandedOver: false,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(newId);
  },
});

export const setHandover = mutation({
  args: {
    phoneNumber: v.string(),
    isHandedOver: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("whatsappSessions")
      .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isHandedOver: args.isHandedOver,
        handoverReason: args.reason,
        handoverTimestamp: args.isHandedOver ? now : undefined,
        currentStep: args.isHandedOver ? "HANDED_OVER" : "IDLE",
        updatedAt: now,
      });
      return await ctx.db.get(existing._id);
    }

    const newId = await ctx.db.insert("whatsappSessions", {
      phoneNumber: args.phoneNumber,
      currentStep: args.isHandedOver ? "HANDED_OVER" : "IDLE",
      isHandedOver: args.isHandedOver,
      handoverReason: args.reason,
      handoverTimestamp: args.isHandedOver ? now : undefined,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(newId);
  },
});

export const getRecentChatLogs = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    return await ctx.db.query("chatMessages").order("desc").take(limit);
  },
});

export const logChatMessage = mutation({
  args: {
    phoneNumber: v.string(),
    sender: v.union(v.literal("patient"), v.literal("assistant"), v.literal("staff")),
    text: v.string(),
    type: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("chatMessages", {
      phoneNumber: args.phoneNumber,
      sender: args.sender,
      text: args.text,
      type: args.type || "text",
      metadata: args.metadata,
      createdAt: now,
    });

    // Update lastMessage on session
    const existing = await ctx.db
      .query("whatsappSessions")
      .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastMessage: args.text,
        lastMessageTimestamp: now,
        updatedAt: now,
      });
    }

    return id;
  },
});

export const listAllSessions = query({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query("whatsappSessions").order("desc").collect();

    const enriched = await Promise.all(
      sessions.map(async (sess) => {
        let lastMessage = sess.lastMessage;
        let lastTime = sess.lastMessageTimestamp || sess.updatedAt;
        if (!lastMessage) {
          const lastMsg = await ctx.db
            .query("chatMessages")
            .withIndex("by_phone", (q) => q.eq("phoneNumber", sess.phoneNumber))
            .order("desc")
            .first();
          if (lastMsg) {
            lastMessage = lastMsg.text;
            lastTime = lastMsg.createdAt;
          }
        }
        return {
          ...sess,
          lastMessage: lastMessage || "Conversation started",
          lastMessageTimestamp: lastTime,
        };
      })
    );

    return enriched.sort((a, b) => (b.lastMessageTimestamp || 0) - (a.lastMessageTimestamp || 0));
  },
});

export const getChatHistory = query({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .order("asc")
      .collect();
  },
});

export const sendStaffMessage = mutation({
  args: {
    phoneNumber: v.string(),
    text: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const msgId = await ctx.db.insert("chatMessages", {
      phoneNumber: args.phoneNumber,
      sender: "staff",
      text: args.text,
      type: "staff_reply",
      metadata: args.metadata,
      createdAt: now,
    });

    const existing = await ctx.db
      .query("whatsappSessions")
      .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        currentStep: "HANDED_OVER",
        isHandedOver: true,
        handoverReason: "Staff reply sent from Svaasth Connect Dashboard",
        handoverTimestamp: now,
        lastMessage: args.text,
        lastMessageTimestamp: now,
        unreadCount: 0,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("whatsappSessions", {
        phoneNumber: args.phoneNumber,
        currentStep: "HANDED_OVER",
        isHandedOver: true,
        handoverReason: "Staff reply sent from Svaasth Connect Dashboard",
        handoverTimestamp: now,
        lastMessage: args.text,
        lastMessageTimestamp: now,
        unreadCount: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true, messageId: msgId };
  },
});

export const sendBulkMessage = mutation({
  args: {
    phoneNumbers: v.array(v.string()),
    text: v.string(),
    campaignTitle: v.string(),
    targetAudience: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const campaignId = await ctx.db.insert("broadcastCampaigns", {
      title: args.campaignTitle,
      message: args.text,
      targetAudience: args.targetAudience,
      recipientCount: args.phoneNumbers.length,
      status: "sent",
      sentAt: now,
    });

    for (const phone of args.phoneNumbers) {
      const cleanPhone = phone.replace(/\D/g, "");
      if (!cleanPhone) continue;

      await ctx.db.insert("chatMessages", {
        phoneNumber: cleanPhone,
        sender: "staff",
        text: args.text,
        type: "broadcast",
        createdAt: now,
      });

      const existing = await ctx.db
        .query("whatsappSessions")
        .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", cleanPhone))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          isHandedOver: true,
          currentStep: "HANDED_OVER",
          handoverReason: "Staff template / broadcast sent",
          lastMessage: args.text,
          lastMessageTimestamp: now,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("whatsappSessions", {
          phoneNumber: cleanPhone,
          currentStep: "HANDED_OVER",
          isHandedOver: true,
          handoverReason: "Staff template / broadcast sent",
          lastMessage: args.text,
          lastMessageTimestamp: now,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return { success: true, campaignId, count: args.phoneNumbers.length };
  },
});

export const updateSessionMeta = mutation({
  args: {
    phoneNumber: v.string(),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    assignedTo: v.optional(v.string()),
    patientName: v.optional(v.string()),
    isHandedOver: v.optional(v.boolean()),
    unreadCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("whatsappSessions")
      .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        notes: args.notes !== undefined ? args.notes : existing.notes,
        tags: args.tags !== undefined ? args.tags : existing.tags,
        assignedTo: args.assignedTo !== undefined ? args.assignedTo : existing.assignedTo,
        patientName: args.patientName !== undefined ? args.patientName : existing.patientName,
        isHandedOver: args.isHandedOver !== undefined ? args.isHandedOver : existing.isHandedOver,
        unreadCount: args.unreadCount !== undefined ? args.unreadCount : existing.unreadCount,
        updatedAt: now,
      });
      return await ctx.db.get(existing._id);
    }
    return null;
  },
});

export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query("whatsappSessions").collect();
    const messages = await ctx.db.query("chatMessages").collect();
    const campaigns = await ctx.db.query("broadcastCampaigns").order("desc").take(5);

    const totalChats = sessions.length;
    const replied = sessions.filter((s) => s.lastMessage || s.isHandedOver).length;
    const newLeads = sessions.filter((s) => s.tags?.includes("Lead") || !s.patientReference).length;
    const messagesSent = messages.filter((m) => m.sender === "assistant" || m.sender === "staff").length;

    return {
      totalChats,
      replied,
      newLeads,
      messagesSent,
      campaigns,
    };
  },
});

export const seedSampleData = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const samples = [
      {
        phoneNumber: "919876543210",
        patientName: "Rohit Patil",
        tags: ["Patient", "Lead"],
        notes: "Interested in follow-up consultation.",
        assignedTo: "You",
        unreadCount: 2,
        messages: [
          { sender: "patient" as const, text: "Hi! 👋", offset: 180000 },
          { sender: "patient" as const, text: "Can I book an appointment for Dr. Mehta tomorrow?", offset: 120000 },
          { sender: "assistant" as const, text: "Sure! 😊\nDr. Mehta is available tomorrow.\n\nHere are the slots:\n• 10:00 AM\n• 12:00 PM\n• 4:30 PM\n\nWhich slot works for you?", offset: 90000 },
          { sender: "patient" as const, text: "4:30 PM works. Please book it.", offset: 50000 },
          { sender: "assistant" as const, text: "✅ Done!\nYour appointment with Dr. Mehta is confirmed for tomorrow at 4:30 PM.\n\nYou'll receive a reminder on WhatsApp. 👍", offset: 25000 },
        ],
      },
      {
        phoneNumber: "919822011223",
        patientName: "Sneha A.",
        tags: ["Lead"],
        notes: "Enquired about clinic timings and orthopaedic consultation fees.",
        assignedTo: "Reception Desk",
        unreadCount: 1,
        messages: [
          { sender: "patient" as const, text: "What are your clinic timings?", offset: 60000 },
        ],
      },
      {
        phoneNumber: "919423155667",
        patientName: "Amit Sharma",
        tags: ["Patient"],
        notes: "Requested official digital prescription copy.",
        assignedTo: "Dr. Vipeen Raut",
        unreadCount: 0,
        messages: [
          { sender: "patient" as const, text: "Please share my prescription.", offset: 180000 },
          { sender: "assistant" as const, text: "💊 Here is your official digital prescription link from Svaasth Hospital:\nhttps://jovial-sheep-76.convex.site/print-prescription?ref=CRX0077\n\nTake care!", offset: 150000 },
        ],
      },
      {
        phoneNumber: "919890044332",
        patientName: "Priya Deshmukh",
        tags: ["Lead"],
        notes: "First time visitor seeking maternity consultation.",
        assignedTo: "Dr. Shillpa Raut",
        unreadCount: 0,
        messages: [
          { sender: "patient" as const, text: "Do you have a slot tomorrow?", offset: 240000 },
          { sender: "assistant" as const, text: "Hello Priya! Dr. Shillpa Raut has slots available tomorrow:\nMorning: 10:30 AM – 1:00 PM\nEvening: 6:00 PM – 7:30 PM\nReply 1 to book now.", offset: 220000 },
        ],
      },
      {
        phoneNumber: "919765433221",
        patientName: "Vikas Kadam",
        tags: ["Patient"],
        notes: "Post-surgery follow-up completed successfully.",
        assignedTo: "Dr. Vipeen Raut",
        unreadCount: 0,
        messages: [
          { sender: "patient" as const, text: "Thank you! 🙏", offset: 300000 },
          { sender: "staff" as const, text: "You're most welcome Mr. Kadam! Wishing you a speedy recovery.", offset: 280000 },
        ],
      },
      {
        phoneNumber: "919921188776",
        patientName: "Neha Rane",
        tags: ["Patient", "Lead"],
        notes: "Awaiting blood test laboratory reports.",
        assignedTo: "Pathology Lab",
        unreadCount: 0,
        messages: [
          { sender: "patient" as const, text: "Can you send the lab report?", offset: 360000 },
          { sender: "assistant" as const, text: "Your reports are being finalized by Dr. Raut and will be shared shortly.", offset: 340000 },
        ],
      },
      {
        phoneNumber: "919823344556",
        patientName: "Mandar Sawant",
        tags: ["Lead"],
        notes: "Joint pain query - recommended knee checkup camp.",
        assignedTo: "Reception Desk",
        unreadCount: 0,
        messages: [
          { sender: "patient" as const, text: "Is Dr. Patil available on Monday?", offset: 420000 },
        ],
      },
    ];

    for (const sample of samples) {
      const existing = await ctx.db
        .query("whatsappSessions")
        .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", sample.phoneNumber))
        .first();

      const lastMsg = sample.messages[sample.messages.length - 1];

      if (existing) {
        await ctx.db.patch(existing._id, {
          patientName: sample.patientName,
          tags: sample.tags,
          notes: sample.notes,
          assignedTo: sample.assignedTo,
          unreadCount: sample.unreadCount,
          lastMessage: lastMsg.text,
          lastMessageTimestamp: now - lastMsg.offset,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("whatsappSessions", {
          phoneNumber: sample.phoneNumber,
          currentStep: "IDLE",
          patientName: sample.patientName,
          tags: sample.tags,
          notes: sample.notes,
          assignedTo: sample.assignedTo,
          unreadCount: sample.unreadCount,
          lastMessage: lastMsg.text,
          lastMessageTimestamp: now - lastMsg.offset,
          createdAt: now - 500000,
          updatedAt: now,
        });
      }

      const existingMsgs = await ctx.db
        .query("chatMessages")
        .withIndex("by_phone", (q) => q.eq("phoneNumber", sample.phoneNumber))
        .first();

      if (!existingMsgs) {
        for (const msg of sample.messages) {
          await ctx.db.insert("chatMessages", {
            phoneNumber: sample.phoneNumber,
            sender: msg.sender,
            text: msg.text,
            type: "text",
            createdAt: now - msg.offset,
          });
        }
      }
    }

    return { success: true, count: samples.length };
  },
});
