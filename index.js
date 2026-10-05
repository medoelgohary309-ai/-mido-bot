// بوت ميدو الجوهري V4.1 - نسخة مستقرة للاستضافة
// Owner: +201155466784

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require("@whiskeysockets/baileys")
const P = require("pino")
const express = require('express')

const OWNER_NUMBER = "201155466784"
const PHONE_NUMBER = process.env.PHONE_NUMBER || OWNER_NUMBER
const OWNER_JID = OWNER_NUMBER + "@s.whatsapp.net"
const BOT_NAME = "بوت ميدو الجوهري"
const PREFIX = "."

const jokes = [
    "مرة شمشون قال نكتة محدش ضحك 😂",
    "واحد بخيل مات كتبوا على قبره ده مات من الجوع",
    "مرة واحد محشش راح للدكتور قاله يا دكتور كل ما اشرب شاي المعلقة بتدخل في عيني قاله شيل المعلقة 😂"
]
const questionsList = [
    "ايه اللي كل ما تاخد منه يكبر؟ (الحفرة)",
    "ما هو الشيء بلا رجلين؟ (الساعة)",
    "ما هو الشيء له وجه ولا يبكي؟ (الساعة)"
]

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('mido_session')
    const sock = makeWASocket({
        logger: P({ level: 'silent' }),
        auth: state,
        browser: Browsers.macOS("Desktop"),
        printQRInTerminal: false,
        syncFullHistory: false,
        markOnlineOnConnect: false
    })

    sock.ev.on('creds.update', saveCreds)

    // نظام كود الاقتران 8 ارقام
    if(!sock.authState.creds.registered) {
        console.log(`\n🤖 ${BOT_NAME} - نظام كود الاقتران`)
        console.log(`📱 الرقم: ${PHONE_NUMBER}`)
        // لازم نستنى شوية قبل طلب الكود
        setTimeout(async () => {
            if(!sock.authState.creds.registered){
                try {
                    let code = await sock.requestPairingCode(PHONE_NUMBER)
                    code = code?.match(/.{1,4}/g)?.join("-") || code
                    console.log(`\n==============================`)
                    console.log(`🔑 كود الاقتران: ${code}`)
                    console.log(`==============================`)
                    console.log(`روح واتساب > الاجهزة المرتبطة > ربط برقم الهاتف`)
                    console.log(`واكتب الكود ده\n`)
                } catch(e) {
                    console.log("❌ خطأ في طلب الكود:", e.message)
                    console.log("جرب تاني بعد دقيقة، واتساب بيعمل بلوك لو طلبت كتير")
                }
            }
        }, 5000)
    }

    sock.ev.on('connection.update', (u) => {
        const { connection, lastDisconnect } = u
        if(connection === 'open') {
            console.log(`✅ ${BOT_NAME} اشتغل بنجاح`)
        }
        if(connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut
            console.log('❌ الاتصال اتقفل، بيعيد التشغيل...')
            if(shouldReconnect) setTimeout(startBot, 3000)
        }
    })

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0]
        if(!msg.message || msg.key.fromMe) return
        const from = msg.key.remoteJid
        const isGroup = from.endsWith('@g.us')
        const sender = isGroup? msg.key.participant : from
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || ""
        if(!body.startsWith(PREFIX)) return

        const args = body.slice(1).trim().split(/ +/)
        const command = args.shift().toLowerCase()
        const isOwner = sender === OWNER_JID || sender.includes(OWNER_NUMBER)

        if(command === 'نكتة') return sock.sendMessage(from, { text: `😂 ${jokes[Math.floor(Math.random()*jokes.length)]}` })
        if(command === 'سؤال') return sock.sendMessage(from, { text: `🤔 ${questionsList[Math.floor(Math.random()*questionsList.length)]}` })
        if(command === 'شمشون') return sock.sendMessage(from, { text: `🤡 *شمشون:*\nنكتة: ${jokes[0]}\nسؤال: ${questionsList[0]}` })
        if(command === 'اوامر' || command === 'مساعدة') return sock.sendMessage(from, { text: `*${BOT_NAME}*\n${PREFIX}نكتة - ${PREFIX}سؤال - ${PREFIX}شمشون\n${PREFIX}صورة @ - ${PREFIX}طرد_الكل` })

        if(['صورة','بروفايل','pp'].includes(command)) {
            try {
                let target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender
                const url = await sock.profilePictureUrl(target, 'image')
                return sock.sendMessage(from, { image: { url }, caption: `📸 ${BOT_NAME}`, mentions: [target] })
            } catch { return sock.sendMessage(from, { text: '❌ مفيش صورة بروفايل' }) }
        }

        if(command === 'طرد_الكل') {
            if(!isOwner) return sock.sendMessage(from, { text: '❌ للاونر فقط +201155466784' })
            if(!isGroup) return sock.sendMessage(from, { text: '❌ في الجروبات فقط' })

            const meta = await sock.groupMetadata(from)
            const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net'
            let toKick = meta.participants.filter(p => p.id!== OWNER_JID && p.id!== botId && p.id!== sender).map(p => p.id)

            if(toKick.length === 0) return sock.sendMessage(from, { text: 'مفيش حد' })

            await sock.sendMessage(from, { text: `⚠️ هطرد ${toKick.length} عضو\nالنظام: 40 كل 700ms\nجاري التنفيذ...` })

            let kicked = 0
            for(let i=0; i<toKick.length; i+=40) {
                const batch = toKick.slice(i, i+40)
                try {
                    await sock.groupParticipantsUpdate(from, batch, "remove")
                    kicked += batch.length
                    await sock.sendMessage(from, { text: `⏳ تم ${kicked}/${toKick.length}` })
                } catch(e){
                    console.log('خطأ:', e.message)
                }
                await new Promise(r => setTimeout(r, 700)) // 700ms
            }
            return sock.sendMessage(from, { text: `✅ خلصت - تم طرد ${kicked}` })
        }
    })
}

// سيرفر عشان Render / Koyeb ميفصلش
const app = express()
app.get('/', (req,res) => res.send(`${BOT_NAME} شغال ✅ - ${new Date().toLocaleString('ar-EG')}`))
app.listen(process.env.PORT || 3000, () => console.log('🌐 السيرفر شغال على البورت 3000'))

startBot()
