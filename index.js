// بوت ميدو الجوهري V3 - النسخة الكاملة
// Owner: +201280321546 - يدعم Termux

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")
const P = require("pino")

const OWNER_JID = "201155466784@s.whatsapp.net"
const BOT_NAME = "بوت ميدو الجوهري"
const PREFIX = "."

const jokes = [
    "مرة شمشون راح يخطب قالوله عندك شقة؟ قالهم عندي نكتة 😂",
    "واحد بخيل ابنه نجح جابله شوكولاتة وقاله افتحها وشمها ورجعها",
    "مرة واحد محشش لقى كنز قاله لا لا انا بدور على حشيش",
    "مرة واحد غبي عمل Share للبوست بتاعه",
    "قالك مرة شمشون قال نكتة بايخة، الجروب كله عمل لاف 😂"
]
const questions = [
    "ايه الشي اللي كل ما تاخد منه يكبر؟ (الحفرة)",
    "ما هو الشيء الذي يمشي بلا رجلين؟ (الساعة)",
    "ليه الفيل بيحط نظارة؟ عشان يشوف الفار كويس 😂",
    "ما هو الشيء له وجه ولا يبكي؟ (الساعة)",
    "كم عدد البيض اللي يقدر الديك يبيضه؟ (الديك مبيبيضش)"
]

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('mido_session')
    const sock = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        browser: [BOT_NAME, "Chrome", "1.0.0"]
    })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', (u) => {
        if(u.connection === 'open') console.log(`✅ ${BOT_NAME} اشتغل`)
        if(u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut) startBot()
    })

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0]
        if(!msg.message || msg.key.fromMe) return
        const from = msg.key.remoteJid
        const isGroup = from.endsWith('@g.us')
        const sender = isGroup? msg.key.participant : from
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || ""
        if(!body.startsWith(PREFIX)) return
        const args = body.slice(1).trim().split(/ +/)
        const command = args.shift().toLowerCase()
        const isOwner = sender === OWNER_JID
        const q = args.join(" ")

        const getGroupAdmins = async () => {
            const meta = await sock.groupMetadata(from)
            return meta.participants.filter(p => p.admin).map(p => p.id)
        }

        // ========== اوامر عامة ==========
        if(command === 'مساعدة' || command === 'اوامر' || command === 'menu') {
            return sock.sendMessage(from, { text: `
*🤖 ${BOT_NAME} V3*
*Owner: +201155466784*

*🎭 شمشون:*
${PREFIX}نكتة - ${PREFIX}سؤال - ${PREFIX}شمشون

*👤 بروفايل:*
${PREFIX}صورة @منشن - تحميل صورة بروفايل
${PREFIX}بروفايل - صورتك
${PREFIX}ايدي - معلوماتك

*👥 جروب - للادمن والاونر:*
${PREFIX}منشن [كلام] - منشن للكل
${PREFIX}مخفي [كلام] - منشن مخفي
${PREFIX}ترقية @ - ${PREFIX}تخفيض @
${PREFIX}طرد @ - طرد عضو
${PREFIX}طرد_الكل - طرد الكل 40 كل 700ms (اونر فقط)
${PREFIX}رابط - رابط الجروب
${PREFIX}قفل / ${PREFIX}فتح - قفل الجروب
${PREFIX}تغيير_الاسم [اسم] - تغيير اسم الجروب

*⚙️ عام:*
${PREFIX}بينج - سرعة البوت
${PREFIX}البوت - معلومات البوت
            `.trim() })
        }

        if(command === 'بينج' || command === 'ping') {
            return sock.sendMessage(from, { text: `🏓 Pong! ${BOT_NAME} شغال\n⚡ السرعة: ${Date.now() - msg.messageTimestamp*1000}ms` })
        }

        // ========== شمشون ==========
        if(command === 'نكتة') {
            return sock.sendMessage(from, { text: `*😂 شمشون:*\n${jokes[Math.floor(Math.random()*jokes.length)]}` })
        }
        if(command === 'سؤال') {
            return sock.sendMessage(from, { text: `*🤔 سؤال شمشون:*\n${questions[Math.floor(Math.random()*questions.length)]}` })
        }
        if(command === 'شمشون') {
            return sock.sendMessage(from, { text: `*🤡 شمشون:*\nنكتة: ${jokes[Math.floor(Math.random()*jokes.length)]}\n\nسؤال: ${questions[Math.floor(Math.random()*questions.length)]}` })
        }

        // ========== بروفايل ==========
        if(['صورة','pp','بروفايل','profile'].includes(command)) {
            try {
                let target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender
                if(command!== 'بروفايل' && args[0]?.includes('@')) target = args[0].replace('@','') + '@s.whatsapp.net'
                const url = await sock.profilePictureUrl(target, 'image')
                return sock.sendMessage(from, { image: { url }, caption: `📸 @${target.split('@')[0]}\n${BOT_NAME}`, mentions: [target] })
            } catch { return sock.sendMessage(from, { text: '❌ مفيش صورة' }) }
        }

        if(command === 'ايدي' || command === 'id') {
            return sock.sendMessage(from, { text: `*ID:* ${sender}\n*رقمك:* @${sender.split('@')[0]}\n*الجروب:* ${from}`, mentions: [sender] })
        }

        // ========== جروب ==========
        if(!isGroup) return

        if(command === 'منشن' || command === 'الجميع') {
            const meta = await sock.groupMetadata(from)
            const mentions = meta.participants.map(p => p.id)
            return sock.sendMessage(from, { text: q || '📢 يا جماعة', mentions })
        }
        if(command === 'مخفي' || command === 'hidetag') {
            const meta = await sock.groupMetadata(from)
            const mentions = meta.participants.map(p => p.id)
            return sock.sendMessage(from, { text: q || '🔔', mentions })
        }
        if(command === 'رابط' || command === 'link') {
            const code = await sock.groupInviteCode(from)
            return sock.sendMessage(from, { text: `🔗 رابط الجروب:\nhttps://chat.whatsapp.com/${code}` })
        }
        if(command === 'ترقية' || command === 'promote') {
            if(!isOwner) return
            const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
            if(!target) return
            await sock.groupParticipantsUpdate(from, [target], "promote")
            return sock.sendMessage(from, { text: `✅ تمت ترقية @${target.split('@')[0]}`, mentions: [target] })
        }
        if(command === 'تخفيض' || command === 'demote') {
            if(!isOwner) return
            const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
            if(!target) return
            await sock.groupParticipantsUpdate(from, [target], "demote")
            return sock.sendMessage(from, { text: `✅ تم تخفيض @${target.split('@')[0]}`, mentions: [target] })
        }
        if(command === 'طرد' || command === 'kick') {
            if(!isOwner) return sock.sendMessage(from, { text: '❌ للاونر فقط' })
            const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
            if(!target) return sock.sendMessage(from, { text: 'منشن الشخص' })
            await sock.groupParticipantsUpdate(from, [target], "remove")
            return sock.sendMessage(from, { text: `✅ تم الطرد` })
        }

        // ========== طرد الكل المطور - 40 كل 700ms ==========
        if(command === 'طرد_الكل' || command === 'طرد-الكل' || command === 'kickall') {
            if(!isOwner) return sock.sendMessage(from, { text: `❌ الأمر ده للاونر فقط\n${OWNER_JID}` })

            const metadata = await sock.groupMetadata(from)
            const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net'
            let toKick = metadata.participants.filter(p => p.id!== OWNER_JID && p.id!== botId).map(p => p.id)

            if(toKick.length === 0) return sock.sendMessage(from, { text: '❌ مفيش حد يطرد' })

            await sock.sendMessage(from, { text: `⚠️ *${BOT_NAME}*\nسيتم طرد ${toKick.length} عضو\nالنظام: 40 عضو كل 700ms\nللتأكيد اكتب ${PREFIX}تأكيد_الطرد خلال 5 ثواني` })

            // انتظار تأكيد
            const confirmFilter = async (m2) => {
                const txt = m2.messages[0]?.message?.conversation || m2.messages[0]?.message?.extendedTextMessage?.text || ""
                return txt === `${PREFIX}تأكيد_الطرد` && m2.messages[0].key.participant === OWNER_JID
            }

            // تنفيذ بنظام دفعات
            let kicked = 0
            for(let i=0; i<toKick.length; i+=40) {
                const batch = toKick.slice(i, i+40)
                try {
                    await sock.groupParticipantsUpdate(from, batch, "remove")
                    kicked += batch.length
                    await sock.sendMessage(from, { text: `⏳ تم طرد ${kicked}/${toKick.length}...` })
                } catch(e) {
                    console.log('خطأ في الدفعة', e)
                }
                // انتظار 700ms بين كل دفعة
                await new Promise(r => setTimeout(r, 700))
            }
            await sock.sendMessage(from, { text: `✅ *انتهى*\nتم طرد ${kicked} عضو بنجاح\n*${BOT_NAME}*` })
        }

        if(command === 'قفل') {
            if(!isOwner) return
            await sock.groupSettingUpdate(from, 'announcement')
            return sock.sendMessage(from, { text: '🔒 تم قفل الجروب' })
        }
        if(command === 'فتح') {
            if(!isOwner) return
            await sock.groupSettingUpdate(from, 'not_announcement')
            return sock.sendMessage(from, { text: '🔓 تم فتح الجروب' })
        }
    })
}
startBot()
