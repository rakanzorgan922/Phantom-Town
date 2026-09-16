const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
    TextInputStyle, REST, Routes, SlashCommandBuilder, PermissionFlagsBits 
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

// ==================== 💾 قواعد البيانات المحلية (اقتصاد + تقديمات ورود) ====================
const DB_FILE = './database.json';
let db = { eco: {}, apps: {}, autoReplies: {} };

if (fs.existsSync(DB_FILE)) {
    try { db = JSON.parse(fs.readFileSync(DB_FILE)); } catch (e) { db = { eco: {}, apps: {}, autoReplies: {} }; }
}
function saveDB() {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function getAccount(userId) {
    if (!db.eco[userId]) {
        db.eco[userId] = { cash: 1000, bank: 5000, lastDaily: 0 };
        saveDB();
    }
    return db.eco[userId];
}

const safeVal = (val) => (val && val.trim() !== '' ? val : 'غير محدد');

// ==================== 📜 تسجيل أوامر الـ Slash Commands ====================
const commands = [
    // 1️⃣ أوامر النظام الديناميكي (إدارة)
    new SlashCommandBuilder()
        .setName('setup-app-phantom')
        .setDescription('[إدارة] إنشاء لوحة تقديم مخصصة بأسئلتك الخاصة')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('set-auto-reply')
        .setDescription('[إدارة] إضافة كلمة مفتاحية ورد تلقائي خاص بها')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // 2️⃣ أوامر الاقتصاد والشحطة والسجن
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
    new SlashCommandBuilder().setName('daily').setDescription('استلام المكافأة/الراتب اليومي'),
    new SlashCommandBuilder().setName('addmoney').setDescription('[إدارة] إضافة أموال للاعب')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(opt => opt.setName('user').setDescription('المستهدف').setRequired(true))
        .addIntegerOption(opt => opt.setName('amount').setDescription('المبلغ').setRequired(true)),
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`✅ تم تشغيل البوت المكتمل لسيرفر Phantom Town بنجاح: ${client.user.tag}`);
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✅ تم تسجيل كافة الأوامر التفاعلية والديناميكية بنجاح!');
    } catch (err) {
        console.error('خطأ في تسجيل الأوامر:', err);
    }
});

// ==================== 🛡️ حماية البوت من الانهيار ====================
process.on('unhandledRejection', error => console.error('🛡️ خطأ تم احتواؤه:', error));
process.on('uncaughtException', error => console.error('🛡️ استثناء تم احتواؤه:', error));

// ==================== 💬 نظام الردود التلقائية واللوحات الثابتة ====================
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const content = message.content.trim().toLowerCase();

    // 🤖 1. الردود التلقائية الديناميكية من قاعدة البيانات
    if (db.autoReplies && db.autoReplies[content]) {
        return message.reply(db.autoReplies[content]);
    }

    // 🤖 2. الردود التلقائية الثابتة
    if (content === 'السلام عليكم' || content === 'سلام عليكم') {
        return message.reply(' *** وعليكم السلام ورحمة الله وبركاته *** ');
    }

    // 🛠️ لوحة اثبت نفسك
    if (message.content === '!setup-verify') {
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
    // A. أزرار اللوحات الثابتة (أثبت نفسك والبصمة)
    // --------------------------------------------------
    if (interaction.isButton()) {
        if (interaction.customId === 'btn_verify') {
            try {
                await interaction.member.roles.add(VERIFIED_ROLE_ID);
                return await interaction.reply({ content: '✅ تم توثيق حسابك وإعطاؤك رتبة مواطن بنجاح!', ephemeral: true });
            } catch (e) {
                return await interaction.reply({ content: '❌ حدث خطأ، تأكد من آيدي الرتبة وصلاحية البوت.', ephemeral: true });
            }
        }

        if (interaction.customId === 'btn_punch_in' || interaction.customId === 'btn_punch_out') {
            const isLogin = interaction.customId === 'btn_punch_in';
            const reqRole = POLICE_ROLE_ID; // افتراضي للقطاع
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
    }

    // --------------------------------------------------
    // B. تنفيذ أوامر الـ Slash Commands (اقتصاد + إدارة + سجن)
    // --------------------------------------------------
    if (interaction.isChatInputCommand()) {
        const acc = getAccount(interaction.user.id);

        // 1️⃣ أمر /setup-app-phantom
        if (interaction.commandName === 'setup-app-phantom') {
            const modal = new ModalBuilder()
                .setCustomId('modal_admin_setup_app')
                .setTitle('إعداد لوحة التقديم والأسئلة');

            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('app_title').setLabel('عنوان التقديم').setPlaceholder('مثال: تقديم القطاع العسكري').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('app_questions').setLabel('الأسئلة (اكتب كل سؤال في سطر جديد)').setPlaceholder("ما اسمك؟\nكم عمرك؟\nخبراتك؟").setStyle(TextInputStyle.Paragraph).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('app_btn_text').setLabel('نص الزر').setPlaceholder('مثال: قدم الآن 📝').setStyle(TextInputStyle.Short).setRequired(true))
            );
            return await interaction.showModal(modal);
        }

        // 2️⃣ أمر /set-auto-reply
        if (interaction.commandName === 'set-auto-reply') {
            const modal = new ModalBuilder()
                .setCustomId('modal_admin_set_reply')
                .setTitle('إضافة رد تلقائي جديد');

            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reply_trigger').setLabel('الكلمة المفتاحية').setPlaceholder('مثال: رابط السيرفر').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reply_response').setLabel('الرد التلقائي').setPlaceholder('مثال: أهلاً بك! الرابط هو...').setStyle(TextInputStyle.Paragraph).setRequired(true))
            );
            return await interaction.showModal(modal);
        }

        // 3️⃣ أوامر الاقتصاد
        if (interaction.commandName === 'balance') {
            const embed = new EmbedBuilder()
                .setTitle(`💳 البنك المركزي | Phantom Town`)
                .setDescription(`الحساب المالي للاعب: <@${interaction.user.id}>`)
                .addFields(
                    { name: '💵 الكاش (Cash)', value: `$${acc.cash}`, inline: true },
                    { name: '🏦 البنك (Bank)', value: `$${acc.bank}`, inline: true },
                    { name: '💰 الإجمالي', value: `$${acc.cash + acc.bank}`, inline: true }
                )
                .setColor(0xf1c40f)
                .setFooter({ text: 'Phantom Town | مدينة الأشباح' });
            return await interaction.reply({ embeds: [embed] });
        }

        if (interaction.commandName === 'deposit') {
            const amount = interaction.options.getInteger('amount');
            if (acc.cash < amount || amount <= 0) return await interaction.reply({ content: '❌ لا تملك هذا المبلغ كاش!', ephemeral: true });
            acc.cash -= amount;
            acc.bank += amount;
            saveDB();
            return await interaction.reply(`✅ تم إيداع **$${amount}** في حسابك البنكي.`);
        }

        if (interaction.commandName === 'withdraw') {
            const amount = interaction.options.getInteger('amount');
            if (acc.bank < amount || amount <= 0) return await interaction.reply({ content: '❌ لا تملك هذا المبلغ في البنك!', ephemeral: true });
            acc.bank -= amount;
            acc.cash += amount;
            saveDB();
            return await interaction.reply(`✅ تم سحب **$${amount}** من حسابك البنكي.`);
        }

        if (interaction.commandName === 'transfer') {
            const target = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            if (acc.bank < amount || amount <= 0) return await interaction.reply({ content: '❌ رصيدك البنكي غير كافٍ!', ephemeral: true });
            const targetAcc = getAccount(target.id);
            acc.bank -= amount;
            targetAcc.bank += amount;
            saveDB();
            return await interaction.reply(`✅ تم تحويل **$${amount}** بنجاح إلى <@${target.id}>.`);
        }

        if (interaction.commandName === 'daily') {
            const now = Date.now();
            if (now - acc.lastDaily < 86400000) {
                return await interaction.reply({ content: '⏰ لقد استلمت راتبك اليومي بالفعل، عد بعد 24 ساعة!', ephemeral: true });
            }
            acc.bank += 2500;
            acc.lastDaily = now;
            saveDB();
            return await interaction.reply('💰 تم إضافة **$2,500** إلى حسابك البنكي كراتب يومي!');
        }

        if (interaction.commandName === 'addmoney') {
            const target = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            const targetAcc = getAccount(target.id);
            targetAcc.bank += amount;
            saveDB();
            return await interaction.reply(`✅ تم إضافة **$${amount}** لحساب <@${target.id}> البنكي.`);
        }

        // 4️⃣ المخالفات والسجن
        if (interaction.commandName === 'citation') {
            const modal = new ModalBuilder().setCustomId('modal_citation').setTitle('مخالفة - Phantom Town');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel('اسم المخالف').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('violations').setLabel('تفاصيل المخالفة').setStyle(TextInputStyle.Paragraph).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('fine').setLabel('الغرامة').setStyle(TextInputStyle.Short).setRequired(true))
            );
            return await interaction.showModal(modal);
        }

        if (interaction.commandName === 'arrest') {
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

        // إعداد التقديم الديناميكي
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

        // إضافة رد تلقائي
        if (id === 'modal_admin_set_reply') {
            const trigger = interaction.fields.getTextInputValue('reply_trigger').trim().toLowerCase();
            const response = interaction.fields.getTextInputValue('reply_response');
            db.autoReplies[trigger] = response;
            saveDB();
            return await interaction.reply({ content: `✅ تم حفظ الرد التلقائي بنجاح للكلمة: \`${trigger}\``, ephemeral: true });
        }

        // تقديم العضو للنموذج الديناميكي
        if (id.startsWith('submit_user_app_')) {
            const appId = id.replace('submit_user_app_', '');
            const appData = db.apps[appId];
            if (!appData) return await interaction.reply({ content: '❌ التقديم غير متوفر.', ephemeral: true });

            const fieldsData = appData.questions.map((q, index) => {
                const answer = interaction.fields.getTextInputValue(`q_answer_${index}`);
                return { name: `❓ ${q}`, value: answer || 'لا يوجد' };
            });

            await interaction.reply({ content: '✅ تم إرسال تقديمك بنجاح للادارة!', ephemeral: true });

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

        // تقارير المخالفات والسجن
        if (id === 'modal_citation') {
            const embed = new EmbedBuilder()
                .setTitle('📑 تقرير مخالفة رسمية • Phantom Town')
                .addFields(
                    { name: 'اسم المخالف', value: safeVal(interaction.fields.getTextInputValue('name')), inline: true },
                    { name: 'المخالفة', value: safeVal(interaction.fields.getTextInputValue('violations')) },
                    { name: 'الغرامة', value: safeVal(interaction.fields.getTextInputValue('fine')), inline: true },
                    { name: 'المحرر', value: `<@${interaction.user.id}>` }
                )
                .setColor(0xf1c40f)
                .setFooter({ text: 'Phantom Town | مدينة الأشباح' });

            await interaction.reply({ content: '✅ تم تسجيل المخالفة بنجاح.', ephemeral: true });
            const logCh = client.channels.cache.get(CITATION_LOG_CHANNEL_ID);
            if (logCh) await logCh.send({ embeds: [embed] });
        }

        if (id === 'modal_arrest') {
            const embed = new EmbedBuilder()
                .setTitle('🚨 تقرير سجن واعتقال • Phantom Town')
                .addFields(
                    { name: 'اسم السجين', value: safeVal(interaction.fields.getTextInputValue('name')), inline: true },
                    { name: 'التهم', value: safeVal(interaction.fields.getTextInputValue('charges')) },
                    { name: 'المدة', value: safeVal(interaction.fields.getTextInputValue('time')), inline: true },
                    { name: 'الضابط', value: `<@${interaction.user.id}>` }
                )
                .setColor(0xe74c3c)
                .setFooter({ text: 'Phantom Town | مدينة الأشباح' });

            await interaction.reply({ content: '✅ تم تسجيل تقرير السجن.', ephemeral: true });
            const logCh = client.channels.cache.get(ARREST_LOG_CHANNEL_ID);
            if (logCh) await logCh.send({ embeds: [embed] });
        }
    }

    // --------------------------------------------------
    // D. تفاعل العضو مع زر التقديم وقبول/رفض الإدارة
    // --------------------------------------------------
    if (interaction.isButton()) {
        if (interaction.customId.startsWith('user_apply_')) {
            const appId = interaction.customId.replace('user_apply_', '');
            const appData = db.apps[appId];
            if (!appData) return await interaction.reply({ content: '❌ هذا التقديم غير موجود.', ephemeral: true });

            const modal = new ModalBuilder()
                .setCustomId(`submit_user_app_${appId}`)
                .setTitle(appData.title.substring(0, 45));

            appData.questions.forEach((q, index) => {
                const input = new TextInputBuilder()
                    .setCustomId(`q_answer_${index}`)
                    .setLabel(q.length > 45 ? q.substring(0, 42) + '...' : q)
                    .setStyle(q.length > 20 ? TextInputStyle.Paragraph : TextInputStyle.Short)
                    .setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
            });

            await interaction.showModal(modal);
        }

        if (interaction.customId.startsWith('accept_') || interaction.customId.startsWith('reject_')) {
            const isAccept = interaction.customId.startsWith('accept_');
            const userId = interaction.customId.split('_')[1];
            const oldEmbed = interaction.message.embeds[0];

            const updatedEmbed = EmbedBuilder.from(oldEmbed)
                .setColor(isAccept ? 0x2ecc71 : 0xe74c3c)
                .addFields({ 
                    name: '📌 القرار النهائي', 
                    value: isAccept ? `✅ تم القبول بواسطة <@${interaction.user.id}>` : `❌ تم الرفض بواسطة <@${interaction.user.id}>` 
                });

            await interaction.update({ embeds: [updatedEmbed], components: [] });

            try {
                const user = await client.users.fetch(userId);
                if (user) {
                    if (isAccept) {
                        await user.send(`🎉 تم **قبول** طلبك في **Phantom Town | مدينة الأشباح**!`);
                        const member = await interaction.guild.members.fetch(userId).catch(() => null);
                        if (member && VERIFIED_ROLE_ID !== 'ضع_آيدي_رتبة_المواطن') {
                            await member.roles.add(VERIFIED_ROLE_ID).catch(() => {});
                        }
                    } else {
                        await user.send(`❌ تم **رفض** طلبك في **Phantom Town | مدينة الأشباح**.`);
                    }
                }
            } catch (e) {}
        }
    }
});

client.login(TOKEN);
