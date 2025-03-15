import { join } from 'path'
import { createBot, createProvider, createFlow, addKeyword, utils } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'

const PORT = process.env.PORT ?? 3008



const welcomeFlow = addKeyword<Provider, Database>(['funca el bot'])
    .addAnswer(`Hello! I'm a chatbot `)




const main = async () => {
    const adapterFlow = createFlow([welcomeFlow])
    const adapterProvider = createProvider(Provider)    
    const adapterDB = new Database()

    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    },{
        queue: {
            timeout: 20000, 
            concurrencyLimit: 50 
        }
    })

    adapterProvider.server.post(
        '/v1/messages',
        handleCtx(async (bot, req, res) => {
            try {
                const { number, message, urlMedia } = req.body
                console.log('📩 Recibiendo mensaje:', { number, message, urlMedia })
    
                if (!number || !message) {
                    throw new Error('Número o mensaje faltante en la petición.')
                }
    
                const result = await bot.sendMessage(number, message, { media: urlMedia ?? null })
    
                if (result) {
                    console.log('✅ Mensaje enviado correctamente:', result)
                    res.writeHead(200, { 'Content-Type': 'application/json' })
                    return res.end(JSON.stringify({ status: 'ok', result }))
                }
    
                throw new Error('Fallo el envío del mensaje.')
    
            } catch (error) {
                console.error('❌ Error al procesar el mensaje:', error.message, error.stack)
                res.writeHead(500, { 'Content-Type': 'application/json' })
                return res.end(JSON.stringify({ status: 'error', message: error.message }))
            }
        })
    )

    adapterProvider.server.post(
        '/v1/register',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('REGISTER_FLOW', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/samples',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('SAMPLES', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/blacklist',
        handleCtx(async (bot, req, res) => {
            const { number, intent } = req.body
            if (intent === 'remove') bot.blacklist.remove(number)
            if (intent === 'add') bot.blacklist.add(number)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ status: 'ok', number, intent }))
        })
    )

    httpServer(+PORT)
}

main()
