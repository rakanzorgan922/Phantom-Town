const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
    TextInputStyle, REST, Routes, SlashCommandBuilder, PermissionFlagsBits,
    ComponentType
} = require('discord.js');
const express = require('express');
const fs = require('fs');

// ==================== 🛠️ نظام إبقاء البوت متصلاً 24/7 ====================
const app = express();
app.get('/', (req, res) => res.send('Phantom Town Bot: 100% Active & Fully Integrated'));
app.listen(3000, () => console.log('Keep-alive Web Server Running on Port 3000'));

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ] 
});

// ==================== ⚙️ قسم الإعدادات والآيديات ====================
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// 🛑 آيديات رومات اللوقات
const LOG_CHANNEL_ID = '1549819385143894097';
const FINGERPRINT_LOG_CHANNEL_ID = '1549819406144638996';
const CITATION_LOG_CHANNEL_ID = '1549819426885345441';
const ARREST_LOG_CHANNEL_ID = '1549819456505520259';

// 🛑 آيديات الرتب
const POLICE_ROLE_ID = '1549820374508638228';
const EMS_ROLE_ID = '1549820585532592279';
const VERIFIED_ROLE_ID = '1549820638884143144';

// 🛑 آيديات الرتب الإدارية
const ADMIN_ROLE_ID = '1550142498834354196';   // الإدارة العامة (صلاحية كاملة + باند)
const MOD_ROLE_ID = '1550142773179580436';     // المشرفين (أوامر إدارية بدون باند)

// ==================== 💾 قواعد البيانات المحلية ====================
const DB_FILE = './database.json';
let db = { eco: {}, apps: {}, autoReplies: {}, warns: {} };

if (fs.existsSync(DB_FILE)) {
    try { db = JSON.parse(fs.readFileSync(DB_FILE)); } catch (e) { db = { eco: {}, apps: {}, autoReplies: {}, warns: {} }; }
}
function saveDB() {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function getAccount(userId) {
    if (!db.eco[userId]) {
        db.eco[userId] = { cash: 1000, bank: 5000 };
        saveDB();
    }
    return db.eco[userId];
}

const safeVal = (val) => (val && val.trim() !== '' ? val : 'غير محدد');

// دالة التحقق من الصلاحيات الإدارية للرتب
function hasModPermissions(member) {
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    return member.roles.cache.has(ADMIN_ROLE_ID) || member.roles.cache.has(MOD_ROLE_ID);
}

function hasAdminPermissions(member) {
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    return member.roles.cache.has(ADMIN_ROLE_ID);
}

// دالة إرسال اللوق الإداري التلقائي
async function sendAdminLog(guild, title, executor, target, reason, details = '') {
    const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setTitle(`🛡️ إجراء إداري: ${title}`)
        .addFields(
            { name: '👤 الإداري المنفذ', value: `<@${executor.id}> (${executor.tag || executor.username})`, inline: true },
            { name: '🎯 العضو المستهدف', value: target ? `<@${target.id || target}> (${target.tag || target.username || target})` : 'غير محدد', inline: true },
            { name: '📝 السبب', value: reason || 'لا يوجد سبب محدد', inline: false }
        )
        .setColor(0xe74c3c)
        .setTimestamp()
        .setFooter({ text: 'Phantom Town | نظام السجلات الإدارية' });

    if (details) embed.addFields({ name: 'ℹ️ تفاصيل إضافية', value: details, inline: false });

    await logChannel.send({ embeds: [embed] }).catch(() => {});
}

// ==================== 📜 تسجيل أوامر الـ Slash Commands ====================
const commands = [
    // 1️⃣ أوامر النظام الديناميكي (إدارة)
    new SlashCommandBuilder()
        .setName('setup-app-phantom')
        .setDescription('[إدارة] إنشاء لوحة تقديم مخصصة بأسئلتك الخاصة'),

    new SlashCommandBuilder()
        .setName('set-auto-reply')
        .setDescription('[إدارة] إضافة كلمة مفتاحية ورد تلقائي خاص بها'),

    // 2️⃣ أوامر الاقتصاد والمخالفات والسجن
    new SlashCommandBuilder().setName('citation').setDescription('إصدار مخالفة مرورية/إدارية - Phantom Town'),
    new SlashCommandBuilder().setName('arrest').setDescription('إصدار تقرير سجن واعتقال - Phantom Town'),
    new SlashCommandBuilder().setName('balance').setDescription('عرض رصيدك المالي في البنك والكاش'),
    new SlashCommandBuilder().setName('deposit').setDescription('إيداع أموال في حسابك البنكي')
        .addIntegerOption(opt => opt.setName('amount').setDescription('المبلغ').setRequired(true)),
    new SlashCommandBuilder().setName('withdraw').setDescription('سحب أموال من حسابك البنكي')
        .addIntegerOption(opt => opt.setName('amount').setDescription('المبلغ').setRequired(true)),
    new SlashCommandBuilder().setName('transfer').setDescription('تحويل أموال لشخص آخر')
        .addUserOption(opt => opt.setName('user').setDescription('الشخص المستقبل').setRequired(true))
        .addIntegerOption(opt => opt.setName('amount').setDescription('المبلغ').setRequired(true)),
    new SlashCommandBuilder().setName('addmoney').setDescription('[إدارة] إضافة أموال للاعب')
        .addUserOption(opt => opt.setName('user').setDescription('المستهدف').setRequired(true))
        .addIntegerOption(opt => opt.setName('amount').setDescription('المبلغ').setRequired(true)),

    // 🔴 أمر تصفير الأموال للمشرفين الإداريين
    new SlashCommandBuilder()
        .setName('resetmoney')
        .setDescription('[إدارة/مشرفين] تصفير الرصيد المالي للاعب (كاش / بنك / الكل)')
        .addUserOption(opt => opt.setName('user').setDescription('العضو المستهدف').setRequired(true))
        .addStringOption(opt => opt.setName('type').setDescription('نوع التصفير').setRequired(true)
            .addChoices(
                { name: 'تصفير الكاش فقط', value: 'cash' },
                { name: 'تصفير البنك فقط', value: 'bank' },
                { name: 'تصفير الكل (الكاش والبنك)', value: 'all' }
            )),

    // 3️⃣ الأوامر الإدارية العقابية
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('[إدارة عامة] حظر عضو من السيرفر')
        .addUserOption(opt => opt.setName('user').setDescription('العضو المراد حظره').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('سبب الحظر')),

    new SlashCommandBuilder()
        .setName('unban')
        .setDescription('[إدارة عامة] فك الحظر عن عضو بـ ID')
        .addStringOption(opt => opt.setName('userid').setDescription('ID العضو').setRequired(true)),

    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('[إدارة] طرد عضو من السيرفر')
        .addUserOption(opt => opt.setName('user').setDescription('العضو المراد طرده').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('سبب الطرد')),

    new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('[إدارة] تطبيق تايم أوت (كتم) على عضو')
        .addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true))
        .addIntegerOption(opt => opt.setName('duration').setDescription('المدة بالدقائق').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('السبب')),

    new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('[إدارة] إزالة التايم أوت عن عضو')
        .addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)),

    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('[إدارة] مسح عدد معين من الرسائل')
        .addIntegerOption(opt => opt.setName('amount').setDescription('عدد الرسائل (1-100)').setRequired(true)),

    new SlashCommandBuilder()
        .setName('lock')
        .setDescription('[إدارة] قفل الكتابة في الروم الحالية'),

    new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('[إدارة] فتح الكتابة في الروم الحالية'),

    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('[إدارة] إعطاء تحذير إداري لعضو')
        .addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('سبب التحذير').setRequired(true)),

    // 4️⃣ الأوامر الإضافية
    new SlashCommandBuilder()
        .setName('setnick')
        .setDescription('[إدارة] تغيير اسم عضو بسرعة داخل السيرفر')
        .addUserOption(opt => opt.setName('user').setDescription('العضو المستهدف').setRequired(true))
        .addStringOption(opt => opt.setName('nickname').setDescription('الاسم الجديد').setRequired(true)),

    new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('[إدارة] وضع وضع بطيء للكتابة في الروم')
        .addIntegerOption(opt => opt.setName('seconds').setDescription('المدة بالثواني (0 لإلغائه)').setRequired(true)),

    new SlashCommandBuilder()
        .setName('search-wallet')
        .setDescription('[الشرطة] تفتيش الحساب المالي والكاش للشخص المستهدف')
        .addUserOption(opt => opt.setName('user').setDescription('الشخص المستهدف').setRequired(true)),

    new SlashCommandBuilder()
        .setName('anon-msg')
        .setDescription('[إدارة] إرسال رسالة مجهولة أو مقلب باسم مستعار في روم محددة')
        .addChannelOption(opt => opt.setName('channel').setDescription('الروم المستهدفة').setRequired(true))
        .addStringOption(opt => opt.setName('message').setDescription('محتوى الرسالة').setRequired(true))
        .addStringOption(opt => opt.setName('name').setDescription('اسم المرسل المستعار (اختياري)').setRequired(false))
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`✅ تم تشغيل البوت المكتمل لسيرفر Phantom Town بنجاح: ${client.user.tag}`);
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✅ تم تسجيل كافة الأوامر التفاعلية والديناميكية والإدارية والجديدة بنجاح!');
    } catch (err) {
        console.error('خطأ في تسجيل الأوامر:', err);
    }
});

// ==================== 🛡️ حماية البوت من الانهيار ====================
process.on('unhandledRejection', error => console.error('🛡️ خطأ تم احتواؤه:', error));
process.on('uncaughtException', error => console.error('🛡️ استثناء تم احتواؤه:', error));

// ==================== 🎉 نظام الترحيب التلقائي عبر الخاص ====================
client.on('guildMemberAdd', async (member) => {
    const welcomeEmbed = new EmbedBuilder()
        .setTitle('🌧️ أرحب ثم أرحب تراحيب المطر والسيل! 🌧️')
        .setDescription(`يا حي من جانا 👋✨\n\nحياك الله في سيرفرك **${member.guild.name}** وتو ما نور السيرفر بوجودك يا غالي! ❤️\n\nتمنياتنا لك بأمتع الأوقات وأجمل المغامرات معنا داخل المدينة 🏙️⚡`)
        .setColor(0x3498db)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Phantom Town | مدينة الأشباح • نورتنا' })
        .setTimestamp();

    await member.send({ embeds: [welcomeEmbed] }).catch(() => {
        console.log(`⚠️ لم يتمكن البوت من إرسال رسالة الترحيب للخاص للعضو: ${member.user.tag}`);
    });
});

// ==================== 💬 نظام الردود التلقائية ونداء الإدارة ====================
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const content = message.content.trim().toLowerCase();

    // 🚨 1. أمر نداء الإدارة تلقائياً عند كتابة "ابي ادارة"
    if (content === 'ابي ادارة') {
        await message.reply({ content: '🚨 تم إرسال نداء للإدارة، سيتم التجاوب معك قريباً.', ephemeral: true }).catch(() => {});

        const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);
        if (logChannel) {
            const alertEmbed = new EmbedBuilder()
                .setTitle('🚨 نداء إدارة عاجل!')
                .setColor(0xff0000)
                .addFields(
                    { name: '👤 العضو المنادي', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
                    { name: '📍 الروم', value: `<#${message.channel.id}>`, inline: true },
                    { name: '🔗 رابط الرسالة', value: `[اضغط هنا للذهاب للرسالة](${message.url})`, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: 'Phantom Town | نظام نداء الإدارة' });

            await logChannel.send({ content: `<@&${ADMIN_ROLE_ID}>`, embeds: [alertEmbed] });
        }
        return;
    }

    // 🤖 2. الردود التلقائية الديناميكية من قاعدة البيانات
    if (db.autoReplies && db.autoReplies[content]) {
        return message.reply(db.autoReplies[content]);
    }

    // 🤖 3. الردود التلقائية الثابتة
    if (content === 'السلام عليكم' || content === 'سلام عليكم') {
        return message.reply(' *** وعليكم السلام ورحمة الله وبركاته *** ');
    }

    // 🛠️ لوحة اثبت نفسك
    if (message.content === '!setup-verify') {
        if (!hasAdminPermissions(message.member)) return;
        const embed = new EmbedBuilder()
            .setTitle('✅ أثبت نفسك • Phantom Town')
            .setDescription('مرحبًا بك في **Phantom Town | مدينة الأشباح**!\nاضغط على الزر أدناه لتأكيد دخولك والحصول على رتبة موثق.')
            .setColor(0x2ecc71)
            .setFooter({ text: 'Phantom Town | مدينة الأشباح' });
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_verify').setLabel('أثبت نفسك 🛡️').setStyle(ButtonStyle.Success)
        );
        await message.channel.send({ embeds: [embed], components: [row] });
    }

    // 🛠️ لوحة البصمة
    if (message.content === '!setup-fingerprint') {
        if (!hasAdminPermissions(message.member)) return;
        const embed = new EmbedBuilder()
            .setTitle('🖐️ نظام البصمة الحيوية • Phantom Town')
            .setDescription('سجل دخولك وخروجك من الدوام الوظيفي.')
            .setColor(0xe67e22)
            .setFooter({ text: 'Phantom Town | مدينة الأشباح' });
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_punch_in').setLabel('تسجيل دخول 📥').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('btn_punch_out').setLabel('تسجيل خروج 📤').setStyle(ButtonStyle.Danger)
        );
        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

// ==================== ⚡ التفاعلات والأوامر الشجرية والـ Modals ====================
client.on('interactionCreate', async (interaction) => {

    // --------------------------------------------------
    // A. أزرار اللوحات الثابتة والتقديم
    // --------------------------------------------------
    if (interaction.isButton()) {
        const id = interaction.customId;

        if (id === 'btn_verify') {
            try {
                await interaction.member.roles.add(VERIFIED_ROLE_ID);
                return await interaction.reply({ content: '✅ تم توثيق حسابك وإعطاؤك رتبة مواطن بنجاح!', ephemeral: true });
            } catch (e) {
                return await interaction.reply({ content: '❌ حدث خطأ، تأكد من آيدي الرتبة وصلاحية البوت.', ephemeral: true });
            }
        }

        if (id === 'btn_punch_in' || id === 'btn_punch_out') {
            const isLogin = id === 'btn_punch_in';
            const reqRole = POLICE_ROLE_ID; 
            if (!interaction.member.roles.cache.has(reqRole)) {
                return await interaction.reply({ content: '❌ لا تملك رتبة للتبصيم.', ephemeral: true });
            }
            const timeNow = new Date().toLocaleTimeString('ar-SA', { timeZone: 'Asia/Riyadh' });
            await interaction.reply({ content: `✅ تم ${isLogin ? 'تسجيل الدخول' : 'تسجيل الخروج'} بنجاح - ${timeNow}`, ephemeral: true });

            const fpChannel = client.channels.cache.get(FINGERPRINT_LOG_CHANNEL_ID);
            if (fpChannel) {
                const embed = new EmbedBuilder()
                    .setTitle(`🖐️ بصمة جديدة: ${isLogin ? 'دخول 📥' : 'خروج 📤'}`)
                    .addFields(
                        { name: 'الموظف', value: `<@${interaction.user.id}>`, inline: true },
                        { name: 'الوقت', value: timeNow, inline: true }
                    )
                    .setColor(isLogin ? 0x2ecc71 : 0xe74c3c)
                    .setFooter({ text: 'Phantom Town | مدينة الأشباح' });
                await fpChannel.send({ embeds: [embed] });
            }
        }

        // أزرار التقديم التفاعلي
        if (id.startsWith('user_apply_')) {
            const appId = id.replace('user_apply_', '');
            const appData = db.apps[appId];
            if (!appData) return await interaction.reply({ content: '❌ لوحة التقديم غير متوفرة أو تم إلغاؤها.', ephemeral: true });

            const modal = new ModalBuilder()
                .setCustomId(`submit_user_app_${appId}`)
                .setTitle(appData.title.slice(0, 45));

            const rows = appData.questions.map((q, idx) => {
                const input = new TextInputBuilder()
                    .setCustomId(`q_answer_${idx}`)
                    .setLabel(q.slice(0, 45))
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);
                return new ActionRowBuilder().addComponents(input);
            });

            modal.addComponents(rows);
            return await interaction.showModal(modal);
        }

        if (id.startsWith('accept_') || id.startsWith('reject_')) {
            if (!hasModPermissions(interaction.member)) return await interaction.reply({ content: '❌ لا تملك صلاحية معالجة التقديمات.', ephemeral: true });

            const isAccept = id.startsWith('accept_');
            const targetUserId = id.replace(isAccept ? 'accept_' : 'reject_', '');
            const targetUser = await client.users.fetch(targetUserId).catch(() => null);

            if (targetUser) {
                const notifyEmbed = new EmbedBuilder()
                    .setTitle(`📩 نتيجة التقديم • Phantom Town`)
                    .setDescription(isAccept ? '🎉 تهانينا! تم **قبول** طلب تقديمك بنجاح.' : '❌ نأسف لإبلاغك بأنه تم **رفض** طلب تقديمك.')
                    .setColor(isAccept ? 0x2ecc71 : 0xe74c3c)
                    .setFooter({ text: 'Phantom Town | مدينة الأشباح' });

                await targetUser.send({ embeds: [notifyEmbed] }).catch(() => {});
            }

            await interaction.reply({ content: `✅ تم ${isAccept ? 'قبول' : 'رفض'} المتقدم بنجاح.`, ephemeral: true });
            
            // تعديل الرسالة لمنع التكرار
            const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor(isAccept ? 0x2ecc71 : 0xe74c3c)
                .setTitle(`${interaction.message.embeds[0].title} [${isAccept ? 'تم القبول ✅' : 'تم الرفض ❌'}]`);

            await interaction.message.edit({ embeds: [originalEmbed], components: [] });
        }
    }

    // --------------------------------------------------
    // B. تنفيذ أوامر الـ Slash Commands
    // --------------------------------------------------
    if (interaction.isChatInputCommand()) {
        const cmd = interaction.commandName;
        const acc = getAccount(interaction.user.id);

        // --- 1. أمر تصفير الحساب المالي (خاص بالمشرفين والإدارة) ---
        if (cmd === 'resetmoney') {
            if (!hasModPermissions(interaction.member)) {
                return await interaction.reply({ content: '❌ هذا الأمر مخصص فقط للمشرفين والإدارة!', ephemeral: true });
            }

            const target = interaction.options.getUser('user');
            const type = interaction.options.getString('type');
            const targetAcc = getAccount(target.id);

            let messageDetails = '';

            if (type === 'cash') {
                targetAcc.cash = 0;
                messageDetails = 'الكاش ($0)';
            } else if (type === 'bank') {
                targetAcc.bank = 0;
                messageDetails = 'البنك ($0)';
            } else if (type === 'all') {
                targetAcc.cash = 0;
                targetAcc.bank = 0;
                messageDetails = 'الكاش والبنك ($0)';
            }

            saveDB();

            await interaction.reply({ content: `♻️ تم تصفير **${messageDetails}** للحساب المالي الخاص بـ <@${target.id}> بنجاح.` });
            await sendAdminLog(interaction.guild, 'تصفير أموال (/resetmoney)', interaction.user, target, 'تصفير إداري للحساب المالي', `النوع المصفر: ${messageDetails}`);
        }

        // --- 2. الأوامر الإدارية الأخرى ---
        if (cmd === 'setnick') {
            if (!hasModPermissions(interaction.member)) return await interaction.reply({ content: '❌ لا تملك صلاحية استخدام هذا الأمر.', ephemeral: true });
            const target = interaction.options.getMember('user');
            const newNick = interaction.options.getString('nickname');

            if (!target) return await interaction.reply({ content: '❌ العضو غير موجود بالسيرفر.', ephemeral: true });

            try {
                await target.setNickname(newNick);
                await interaction.reply({ content: `✅ تم تغيير اسم ${target} إلى **${newNick}** بنجاح.`, ephemeral: true });
                await sendAdminLog(interaction.guild, 'تغيير الاسم (/setnick)', interaction.user, target.user, `الاسم الجديد: ${newNick}`);
            } catch (err) {
                await interaction.reply({ content: '❌ تعذر تغيير الاسم (تأكد من رتبة البوت بالنسبة للعضو).', ephemeral: true });
            }
        }

        if (cmd === 'slowmode') {
            if (!hasModPermissions(interaction.member)) return await interaction.reply({ content: '❌ لا تملك صلاحية استخدام هذا الأمر.', ephemeral: true });
            const seconds = interaction.options.getInteger('seconds');

            try {
                await interaction.channel.setRateLimitPerUser(seconds);
                if (seconds === 0) {
                    await interaction.reply({ content: '✅ تم إلغاء الوضع البطيء في الروم.' });
                } else {
                    await interaction.reply({ content: `⏱️ تم تحديد الوضع البطيء بـ **${seconds} ثانية** في هذه الروم.` });
                }
                await sendAdminLog(interaction.guild, 'الوضع البطيء (/slowmode)', interaction.user, null, `تحديث الوضع البطيء في <#${interaction.channel.id}>`, `المدة: ${seconds} ثانية`);
            } catch (err) {
                await interaction.reply({ content: '❌ حدث خطأ أثناء تغيير الوضع البطيء.', ephemeral: true });
            }
        }

        if (cmd === 'search-wallet') {
            if (!interaction.member.roles.cache.has(POLICE_ROLE_ID)) {
                return await interaction.reply({ content: '👮 هذا الأمر مخصص لرجال الشرطة فقط!', ephemeral: true });
            }

            const targetUser = interaction.options.getUser('user');
            const targetAcc = getAccount(targetUser.id);

            const walletEmbed = new EmbedBuilder()
                .setTitle(`🔎 تفتيش مالي: ${targetUser.username}`)
                .setColor(0x1e90ff)
                .addFields(
                    { name: '💵 الكاش المتوفر حالياً:', value: `$${targetAcc.cash.toLocaleString()}` }
                )
                .setFooter({ text: 'Phantom Town | إدارة الشرطة - الضبط والتفتيش' });

            const stealBtn = new ButtonBuilder()
                .setCustomId(`steal_cash_${targetUser.id}`)
                .setLabel('مصادرة/سرقة الأموال (غير قانوني)')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(stealBtn);

            const response = await interaction.reply({ embeds: [walletEmbed], components: [row], ephemeral: true });

            const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

            collector.on('collect', async (i) => {
                if (i.user.id !== interaction.user.id) return i.reply({ content: 'لا يمكنك استخدام هذا الزر.', ephemeral: true });

                const storableCash = targetAcc.cash;
                if (storableCash <= 0) return i.reply({ content: '❌ هذا الشخص لا يملك أي كاش لمصادرته!', ephemeral: true });

                targetAcc.cash = 0;
                saveDB();

                await sendAdminLog(interaction.guild, 'مصادرة كاش غير قانونية (/search-wallet)', interaction.user, targetUser, 'مصادرة أموال أثناء التفتيش', `المبلغ المستولى عليه: $${storableCash.toLocaleString()}`);

                await i.update({
                    content: `⚠️ قمت بمصادرة **$${storableCash.toLocaleString()}** من ${targetUser} بشكل غير قانوني! (تم توثيق العملية للوق الإداري).`,
                    embeds: [],
                    components: []
                });
            });
        }

        if (cmd === 'anon-msg') {
            if (!hasModPermissions(interaction.member)) return await interaction.reply({ content: '❌ لا تملك صلاحية استخدام هذا الأمر.', ephemeral: true });

            const targetChannel = interaction.options.getChannel('channel');
            const messageText = interaction.options.getString('message');
            const customName = interaction.options.getString('name');

            if (!targetChannel.isTextBased()) return await interaction.reply({ content: '❌ يجب اختيار روم كتابية.', ephemeral: true });

            try {
                const anonEmbed = new EmbedBuilder()
                    .setDescription(messageText)
                    .setColor(0x2f3136);

                if (customName) anonEmbed.setAuthor({ name: customName });

                await targetChannel.send({ embeds: [anonEmbed] });
                await interaction.reply({ content: `✅ تم إرسال الرسالة بنجاح في <#${targetChannel.id}>.`, ephemeral: true });
            } catch (err) {
                await interaction.reply({ content: '❌ حدث خطأ أثناء إرسال الرسالة.', ephemeral: true });
            }
        }

        // --- 3. أوامر العقوبات الإدارية ---
        if (cmd === 'ban') {
            if (!hasAdminPermissions(interaction.member)) return await interaction.reply({ content: '❌ هذا الأمر مخصص فقط لرتبة الإدارة العامة.', ephemeral: true });
            const target = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'غير محدد';

            try {
                await interaction.guild.members.ban(target.id, { reason });
                await interaction.reply({ content: `🔨 تم حظر العضو **${target.tag}** بنجاح.` });
                await sendAdminLog(interaction.guild, 'حظر عضو (Ban)', interaction.user, target, reason);
            } catch (e) {
                await interaction.reply({ content: '❌ متعذر حظر هذا العضو (قد تكون رتبته أعلى من البوت).', ephemeral: true });
            }
        }

        if (cmd === 'unban') {
            if (!hasAdminPermissions(interaction.member)) return await interaction.reply({ content: '❌ هذا الأمر مخصص فقط لرتبة الإدارة العامة.', ephemeral: true });
            const userId = interaction.options.getString('userid');

            try {
                await interaction.guild.members.unban(userId);
                await interaction.reply({ content: `✅ تم فك الحظر عن الحساب صاحب الـ ID: \`${userId}\`` });
                await sendAdminLog(interaction.guild, 'فك حظر (Unban)', interaction.user, userId, 'فك حظر إداري');
            } catch (e) {
                await interaction.reply({ content: '❌ لم يتم العثور على حظر بهذا الـ ID.', ephemeral: true });
            }
        }

        if (cmd === 'kick') {
            if (!hasModPermissions(interaction.member)) return await interaction.reply({ content: '❌ لا تملك الصلاحية الإدارية لاستخدام هذا الأمر.', ephemeral: true });
            const targetMember = interaction.options.getMember('user');
            const reason = interaction.options.getString('reason') || 'غير محدد';

            if (!targetMember) return await interaction.reply({ content: '❌ العضو غير موجود بالسيرفر.', ephemeral: true });

            try {
                await targetMember.kick(reason);
                await interaction.reply({ content: `👢 تم طرد العضو **${targetMember.user.tag}** بنجاح.` });
                await sendAdminLog(interaction.guild, 'طرد عضو (Kick)', interaction.user, targetMember.user, reason);
            } catch (e) {
                await interaction.reply({ content: '❌ تعذر طرد العضو.', ephemeral: true });
            }
        }

        if (cmd === 'timeout') {
            if (!hasModPermissions(interaction.member)) return await interaction.reply({ content: '❌ لا تملك الصلاحية الإدارية.', ephemeral: true });
            const targetMember = interaction.options.getMember('user');
            const duration = interaction.options.getInteger('duration');
            const reason = interaction.options.getString('reason') || 'غير محدد';

            if (!targetMember) return await interaction.reply({ content: '❌ العضو غير موجود بالسيرفر.', ephemeral: true });

            try {
                await targetMember.timeout(duration * 60 * 1000, reason);
                await interaction.reply({ content: `⏰ تم تطبيق تايم أوت على **${targetMember.user.tag}** لمدة ${duration} دقيقة.` });
                await sendAdminLog(interaction.guild, 'كتم (Timeout)', interaction.user, targetMember.user, reason, `المدة: ${duration} دقيقة`);
            } catch (e) {
                await interaction.reply({ content: '❌ تعذر تطبيق التايم أوت على العضو.', ephemeral: true });
            }
        }

        if (cmd === 'untimeout') {
            if (!hasModPermissions(interaction.member)) return await interaction.reply({ content: '❌ لا تملك الصلاحية الإدارية.', ephemeral: true });
            const targetMember = interaction.options.getMember('user');

            if (!targetMember) return await interaction.reply({ content: '❌ العضو غير موجود بالسيرفر.', ephemeral: true });

            try {
                await targetMember.timeout(null);
                await interaction.reply({ content: `✅ تم فك التايم أوت عن **${targetMember.user.tag}**.` });
                await sendAdminLog(interaction.guild, 'فك كتم (Untimeout)', interaction.user, targetMember.user, 'إلغاء عقوبة التايم أوت');
            } catch (e) {
                await interaction.reply({ content: '❌ تعذر إزالة التايم أوت.', ephemeral: true });
            }
        }

        if (cmd === 'clear') {
            if (!hasModPermissions(interaction.member)) return await interaction.reply({ content: '❌ لا تملك الصلاحية الإدارية.', ephemeral: true });
            const amount = interaction.options.getInteger('amount');

            if (amount < 1 || amount > 100) return await interaction.reply({ content: '❌ يرجى تحديد عدد بين 1 و 100.', ephemeral: true });

            const deleted = await interaction.channel.bulkDelete(amount, true).catch(() => null);
            if (!deleted) return await interaction.reply({ content: '❌ تعذر مسح الرسائل (قد تكون أقدم من 14 يومًا).', ephemeral: true });

            await interaction.reply({ content: `🧹 تم مسح **${deleted.size}** رسالة بنجاح.`, ephemeral: true });
            await sendAdminLog(interaction.guild, 'مسح رسائل (Clear)', interaction.user, null, `مسح رسائل في الروم <#${interaction.channel.id}>`, `العدد: ${deleted.size}`);
        }

        if (cmd === 'lock') {
            if (!hasModPermissions(interaction.member)) return await interaction.reply({ content: '❌ لا تملك الصلاحية الإدارية.', ephemeral: true });

            await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
            await interaction.reply({ content: '🔒 تم قفل الكتابة في هذا الروم بنجاح.' });
            await sendAdminLog(interaction.guild, 'قفل روم (Lock)', interaction.user, null, `قفل الكتابة في <#${interaction.channel.id}>`);
        }

        if (cmd === 'unlock') {
            if (!hasModPermissions(interaction.member)) return await interaction.reply({ content: '❌ لا تملك الصلاحية الإدارية.', ephemeral: true });

            await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: true });
            await interaction.reply({ content: '🔓 تم فتح الكتابة في هذا الروم بنجاح.' });
            await sendAdminLog(interaction.guild, 'فتح روم (Unlock)', interaction.user, null, `فتح الكتابة في <#${interaction.channel.id}>`);
        }

        if (cmd === 'warn') {
            if (!hasModPermissions(interaction.member)) return await interaction.reply({ content: '❌ لا تملك الصلاحية الإدارية.', ephemeral: true });
            const target = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason');

            if (!db.warns[target.id]) db.warns[target.id] = [];
            db.warns[target.id].push({ reason, by: interaction.user.id, date: new Date().toLocaleDateString('ar-SA') });
            saveDB();

            await interaction.reply({ content: `⚠️ تم توجيه تحذير إداري لـ <@${target.id}>.\nإجمالي التحذيرات: **${db.warns[target.id].length}**` });
            await sendAdminLog(interaction.guild, 'تحذير إداري (Warn)', interaction.user, target, reason, `إجمالي التحذيرات الحالية: ${db.warns[target.id].length}`);
        }

        // --- 4. باقي أوامر الاقتصاد والتقديم والمخالفات ---
        if (cmd === 'setup-app-phantom') {
            if (!hasAdminPermissions(interaction.member)) return await interaction.reply({ content: '❌ لا تملك الصلاحيات.', ephemeral: true });
            const modal = new ModalBuilder().setCustomId('modal_admin_setup_app').setTitle('إعداد لوحة التقديم والأسئلة');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('app_title').setLabel('عنوان التقديم').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('app_questions').setLabel('الأسئلة (كل سؤال في سطر)').setStyle(TextInputStyle.Paragraph).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('app_btn_text').setLabel('نص الزر').setStyle(TextInputStyle.Short).setRequired(true))
            );
            return await interaction.showModal(modal);
        }

        if (cmd === 'set-auto-reply') {
            if (!hasAdminPermissions(interaction.member)) return await interaction.reply({ content: '❌ لا تملك الصلاحيات.', ephemeral: true });
            const modal = new ModalBuilder().setCustomId('modal_admin_set_reply').setTitle('إضافة رد تلقائي جديد');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reply_trigger').setLabel('الكلمة المفتاحية').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reply_response').setLabel('الرد التلقائي').setStyle(TextInputStyle.Paragraph).setRequired(true))
            );
            return await interaction.showModal(modal);
        }

        if (cmd === 'balance') {
            const embed = new EmbedBuilder()
                .setTitle(`💳 البنك المركزي | Phantom Town`)
                .setDescription(`الحساب المالي للاعب: <@${interaction.user.id}>`)
                .addFields(
                    { name: '💵 الكاش (Cash)', value: `$${acc.cash.toLocaleString()}`, inline: true },
                    { name: '🏦 البنك (Bank)', value: `$${acc.bank.toLocaleString()}`, inline: true },
                    { name: '💰 الإجمالي', value: `$${(acc.cash + acc.bank).toLocaleString()}`, inline: true }
                )
                .setColor(0xf1c40f)
                .setFooter({ text: 'Phantom Town | مدينة الأشباح' });
            return await interaction.reply({ embeds: [embed] });
        }

        if (cmd === 'deposit') {
            const amount = interaction.options.getInteger('amount');
            if (acc.cash < amount || amount <= 0) return await interaction.reply({ content: '❌ لا تملك هذا المبلغ كاش!', ephemeral: true });
            acc.cash -= amount;
            acc.bank += amount;
            saveDB();
            return await interaction.reply(`✅ تم إيداع **$${amount.toLocaleString()}** في حسابك البنكي.`);
        }

        if (cmd === 'withdraw') {
            const amount = interaction.options.getInteger('amount');
            if (acc.bank < amount || amount <= 0) return await interaction.reply({ content: '❌ لا تملك هذا المبلغ في البنك!', ephemeral: true });
            acc.bank -= amount;
            acc.cash += amount;
            saveDB();
            return await interaction.reply(`✅ تم سحب **$${amount.toLocaleString()}** من حسابك البنكي.`);
        }

        if (cmd === 'transfer') {
            const target = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            if (acc.bank < amount || amount <= 0) return await interaction.reply({ content: '❌ رصيدك البنكي غير كافٍ!', ephemeral: true });
            const targetAcc = getAccount(target.id);
            acc.bank -= amount;
            targetAcc.bank += amount;
            saveDB();
            return await interaction.reply(`✅ تم تحويل **$${amount.toLocaleString()}** بنجاح إلى <@${target.id}>.`);
        }

        if (cmd === 'addmoney') {
            if (!hasAdminPermissions(interaction.member)) return await interaction.reply({ content: '❌ لا تملك الصلاحية.', ephemeral: true });
            const target = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            const targetAcc = getAccount(target.id);
            targetAcc.bank += amount;
            saveDB();
            return await interaction.reply(`✅ تم إضافة **$${amount.toLocaleString()}** لحساب <@${target.id}> البنكي.`);
        }

        if (cmd === 'citation') {
            const modal = new ModalBuilder().setCustomId('modal_citation').setTitle('مخالفة - Phantom Town');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel('اسم المخالف').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('violations').setLabel('تفاصيل المخالفة').setStyle(TextInputStyle.Paragraph).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('fine').setLabel('الغرامة').setStyle(TextInputStyle.Short).setRequired(true))
            );
            return await interaction.showModal(modal);
        }

        if (cmd === 'arrest') {
            const modal = new ModalBuilder().setCustomId('modal_arrest').setTitle('سجن - Phantom Town');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel('اسم السجين').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('charges').setLabel('التهم').setStyle(TextInputStyle.Paragraph).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('time').setLabel('مدة السجن').setStyle(TextInputStyle.Short).setRequired(true))
            );
            return await interaction.showModal(modal);
        }
    }

    // --------------------------------------------------
    // C. استقبال النوافذ المنبثقة Modals
    // --------------------------------------------------
    if (interaction.isModalSubmit()) {
        const id = interaction.customId;

        if (id === 'modal_admin_setup_app') {
            const title = interaction.fields.getTextInputValue('app_title');
            const rawQuestions = interaction.fields.getTextInputValue('app_questions');
            const btnText = interaction.fields.getTextInputValue('app_btn_text');
            const questionsList = rawQuestions.split('\n').filter(q => q.trim() !== '').slice(0, 5);

            const appId = `app_${Date.now()}`;
            db.apps[appId] = { title, questions: questionsList };
            saveDB();

            const embed = new EmbedBuilder()
                .setTitle(`📋 ${title} • Phantom Town`)
                .setDescription('اضغط على الزر أدناه لتعبئة النموذج والتقديم مباشرة.')
                .setColor(0x3498db)
                .setFooter({ text: 'Phantom Town | مدينة الأشباح' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`user_apply_${appId}`).setLabel(btnText).setStyle(ButtonStyle.Primary)
            );

            await interaction.channel.send({ embeds: [embed], components: [row] });
            return await interaction.reply({ content: '✅ تم إنشاء لوحة التقديم بأسئلتك بنجاح!', ephemeral: true });
        }

        if (id === 'modal_admin_set_reply') {
            const trigger = interaction.fields.getTextInputValue('reply_trigger').trim().toLowerCase();
            const response = interaction.fields.getTextInputValue('reply_response');
            db.autoReplies[trigger] = response;
            saveDB();
            return await interaction.reply({ content: `✅ تم حفظ الرد التلقائي بنجاح للكلمة: \`${trigger}\``, ephemeral: true });
        }

        if (id.startsWith('submit_user_app_')) {
            const appId = id.replace('submit_user_app_', '');
            const appData = db.apps[appId];
            if (!appData) return await interaction.reply({ content: '❌ التقديم غير متوفر.', ephemeral: true });

            const fieldsData = appData.questions.map((q, index) => {
                const answer = interaction.fields.getTextInputValue(`q_answer_${index}`);
                return { name: `❓ ${q}`, value: answer || 'لا يوجد' };
            });

            await interaction.reply({ content: '✅ تم إرسال تقديمك بنجاح للإدارة!', ephemeral: true });

            const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setTitle(`📥 تقديم جديد: ${appData.title}`)
                    .addFields(
                        { name: '👤 المتقدم', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: false },
                        ...fieldsData
                    )
                    .setColor(0x2ecc71)
                    .setTimestamp()
                    .setFooter({ text: 'Phantom Town | مدينة الأشباح' });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`accept_${interaction.user.id}`).setLabel('قبول ✅').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`reject_${interaction.user.id}`).setLabel('رفض ❌').setStyle(ButtonStyle.Danger)
                );
                await logChannel.send({ embeds: [embed], components: [row] });
            }
        }

        if (id === 'modal_citation') {
            const embed = new EmbedBuilder()
                .setTitle('📑 تقرير مخالفة رسمية • Phantom Town')
                .addFields(
                    { name: '👤 اسم المخالف', value: safeVal(interaction.fields.getTextInputValue('name')), inline: true },
                    { name: '📝 المخالفة', value: safeVal(interaction.fields.getTextInputValue('violations')) },
                    { name: '💰 الغرامة', value: safeVal(interaction.fields.getTextInputValue('fine')), inline: true },
                    { name: '👮 المحرر', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setColor(0xe67e22)
                .setTimestamp()
                .setFooter({ text: 'Phantom Town | إدارة المرور والشرطة' });

            const citationChannel = client.channels.cache.get(CITATION_LOG_CHANNEL_ID);
            if (citationChannel) await citationChannel.send({ embeds: [embed] });
            return await interaction.reply({ content: '✅ تم إصدار التقرير وإرساله إلى روم المخالفات بنجاح!', ephemeral: true });
        }

        if (id === 'modal_arrest') {
            const embed = new EmbedBuilder()
                .setTitle('🔒 تقرير اعتقال وسجن • Phantom Town')
                .addFields(
                    { name: '👤 اسم السجين', value: safeVal(interaction.fields.getTextInputValue('name')), inline: true },
                    { name: '⚖️ التهم', value: safeVal(interaction.fields.getTextInputValue('charges')) },
                    { name: '⏳ مدة السجن', value: safeVal(interaction.fields.getTextInputValue('time')), inline: true },
                    { name: '👮 العسكري المنفذ', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setColor(0x95a5a6)
                .setTimestamp()
                .setFooter({ text: 'Phantom Town | إدارة السجون والشرطة' });

            const arrestChannel = client.channels.cache.get(ARREST_LOG_CHANNEL_ID);
            if (arrestChannel) await arrestChannel.send({ embeds: [embed] });
            return await interaction.reply({ content: '✅ تم إصدار التقرير وإرساله إلى روم السجن بنجاح!', ephemeral: true });
        }
    }
});

// ==================== 🔑 تسجيل الدخول ====================
client.login(TOKEN);
