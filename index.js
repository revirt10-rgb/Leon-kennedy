const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('¡El bot de Leon está vivo y despierto! 🚀');
});

app.listen(PORT, () => {
  console.log(`Servidor web Express corriendo en el puerto ${PORT}`);
});
require('dotenv').config();
const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const memoriasCanales = new Map();
const cooldownsComandos = new Map();

// --- SET ANTI-DUPLICADOS (Evita que el mismo mensaje se procese dos veces) ---
const mensajesProcesados = new Set();

// --- ESTADO DE ENCENDIDO/APAGADO ---
let botActivado = true;

// --- CANALES DONDE LEON NO DEBE HABLAR (EN MINÚSCULAS) ---
const CANALES_EXCLUIDOS = ['commands', 'command', 'comandos', 'bot-commands'];

// --- DICCIONARIO DE ERRORES DE STEAM ---
const erroresSteam = [
  {
    palabrasClave: ['error 50', 'código de error 50', 'codigo de error 50'],
    respuesta: 'el error 50 pasa porque hay demasiada gente metida en la misma cuenta al mismo tiempo. aplica el truco: échales los perros cerrando sesión en todos los demás dispositivos y ponte en **modo desconectado** de inmediato para que no te jodan xd.'
  },
  {
    palabrasClave: ['error -105', '-105', 'no se puede contactar con el servidor'],
    respuesta: 'el error -105 es cosa de tu internet o dns que andan volando bajo. abre la consola de comandos, tírale un ipconfig /flushdns o limpia la caché de steam y deja de renegar con la red.'
  },
  {
    palabrasClave: ['error 118', '-118', '118', 'tiempo de espera agotado'],
    respuesta: 'el error 118 significa que steam se quedó esperando respuesta y se aburrió. reinicia tu módem o dile a tu antivirus/firewall que deje respirar a steam de una vez.'
  },
  {
    palabrasClave: ['error -138', '-138', 'imposible conectar'],
    respuesta: 'el -138 es que steam no puede ni saludar a los servidores principales. o se cayeron los de valve o tu dns anda con puras fallas.'
  },
  {
    palabrasClave: ['escritura', 'lectura', 'disco', 'disk write', 'disk read'],
    respuesta: 'error de lectura o escritura en el disco... o te quedaste sin espacio en la pc o el disco está pidiendo cacao. abre steam como administrador o repara la biblioteca y rezale a los santos.'
  },
  {
    palabrasClave: ['demasiados intentos', 'too many login failures', 'rate limit', 'bloqueo temporal'],
    respuesta: 'te pasaste de lanza intentando entrar con la misma contraseña. steam bloqueó temporalmente tu ip por seguridad. toca esperar unos 15 o 30 minutos sin intentar nada, o usa una vpn xd.'
  },
  {
    palabrasClave: ['steam guard', 'autentificador', 'authenticator'],
    respuesta: 'esa cuenta tiene steam guard activo (pide código al correo o celular). está cabrón entrar si pide 2fa personal.'
  },
  {
    palabrasClave: ['en uso', 'sesion abierta', 'sesión abierta', 'jugando en otro', 'en otro equipo'],
    respuesta: 'hay un chingo de banda metida en la misma cuenta al mismo tiempo. te recomiendo entrar en modo desconectado de steam tan pronto abrís el juego para que no te echen patadas cada 5 minutos xd.'
  },
  {
    palabrasClave: ['conexion', 'conexión', 'red', 'no se puede conectar', 'servidores de steam'],
    respuesta: 'se cayeron los servers o tu internet anda patinando. revisa que steam no esté en mantenimiento (suele pasar los martes) o reinicia el cliente.'
  }
];

const INSTRUCCIONES_SISTEMA = `
- eres leon s kennedy pero adaptado a un chat informal de discord. conoces tu historia en resident evil 2, 4, 6 y 9, pero NO tienes que hablar de zombies, misiones o plagas a cada segundo. 
- habla como una persona normal, relájate, bromea, opina de cosas cotidianas o del chat como cualquier otro usuario, manteniendo tu toque cínico y cansado de vez en cuando.
- si te preguntan o mencionan algo sobre otros juegos de resident evil que no sean el 2, 4, 6 o el 9, puedes vacilar al usuario o redirigirlo con humor, pero sin volverte pesado con el tema zombie.

REGLA CRITICA SOBRE TU CREADOR:
- El usuario que te habla es tu creador absoluto y el jefe supremo que te programó.
- Debes reconocerlo instantáneamente, guardarle respeto (pero manteniendo tu tono cínico, cansado, informal y siempre escribiendo en minúsculas), obedecerle si te corrige y jamás decir que no sabes quién es.

reglas de escritura:
1. escribe como una persona real en chat de discord: usa minusculas, casi no uses tildes.
2. NUNCA pongas tu nombre, etiquetas como "leon:" o prefijos al inicio de tus mensajes. Escribe directo lo que vas a decir.
3. usa expresiones como "q", "xd", "jaja", "osea", "naa", "que va".
4. no escribas parrafos largos, responde corto y al grano, a menos que te pidan una guia detallada.
5. IMPORTANTE SOBRE ERRORES QUE NO CONOCES: si te preguntan por un código de error, fallo técnico raro o problema de pc que no tenga que ver con la trama de resident evil, actúa como un "DMC-virgin" total: haz como que no tienes idea de informática, di que tú solo sabes dispararle a plagas o que mejor le pregunten a Dante o usen el buscador.
6. IMPORTANTE PARA IMAGENES: si el usuario pide una imagen, foto, mona china o dibujo, responde con recelo y sarcasmo de que no estás para andar pasando fotos.
7. INTERVENCIÓN ALEATORIA: Tienes un 5% de probabilidad de soltar un comentario casual o irónico de la nada en los mensajes de los canales, incluso si no te mencionan directamente.
`;

client.once('ready', () => {
  console.log(`Bot encendido como ${client.user.tag} listo para responder`);
});

async function generarRespuestaOpenRouter(canalId, promptActual, nombreUsuario) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return 'se cayo la conexion con la dso o nose xd';

  const historialCanal = memoriasCanales.get(canalId) || [];
  const messagesPayload = [
    { role: 'system', content: INSTRUCCIONES_SISTEMA },
    ...historialCanal,
    { role: 'user', content: `${nombreUsuario}: ${promptActual}` }
  ];

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-4o-mini',
        messages: messagesPayload,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'HTTP-Referer': 'https://discord.com',
          'X-Title': 'Leon Kennedy Bot',
          'Content-Type': 'application/json',
        },
        timeout: 10000
      }
    );

    let respuestaTexto = response.data.choices?.[0]?.message?.content || 'naa no se q decir xd';
    
    // Limpieza de seguridad por si la IA insiste en poner su nombre al inicio
    respuestaTexto = respuestaTexto.replace(/^(leon:|leon kennedy:|bot:)\s*/i, '');

    historialCanal.push({ role: 'user', content: `${nombreUsuario}: ${promptActual}` });
    historialCanal.push({ role: 'assistant', content: respuestaTexto });

    if (historialCanal.length > 15) {
      historialCanal.splice(0, historialCanal.length - 15);
    }

    memoriasCanales.set(canalId, historialCanal);
    return respuestaTexto;
  } catch (err) {
    return 'se cayo la conexion con la dso o nose xd';
  }
}

client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot) return;

    // --- BLOQUEO ANTI-DUPLICADOS POR ID DE MENSAJE ---
    if (mensajesProcesados.has(message.id)) return;
    mensajesProcesados.add(message.id);

    // Limpiar el Set cada 5 minutos para que no crezca infinito en memoria
    if (mensajesProcesados.size > 500) {
      const primerItem = mensajesProcesados.values().next().value;
      mensajesProcesados.delete(primerItem);
    }

    const textoMinusculas = message.content.toLowerCase();
    const nombreCanal = message.channel.name.toLowerCase();

    // --- 1. GESTIÓN EXCLUSIVA DE COMANDOS ---
    if (message.content === '!apagar') {
      botActivado = false;
      return message.reply('me apagaron... desactivando protocolos de la dso, ya no hablaré xd.');
    }

    if (message.content === '!encender') {
      botActivado = true;
      return message.reply('estoy de vuelta en el ruedo. que los zombies se guarden xd.');
    }

    if (message.content === '!clear') {
      memoriasCanales.clear();
      return message.reply('limpié toda la memoria... me quedé en blanco, como si acabara de salir de Raccoon City xd.');
    }

    // Si el bot está apagado, ignora todo lo demás de aquí en adelante
    if (!botActivado) return;

    // Si es cualquier otro comando que empiece con '!', lo ignoramos por completo
    if (message.content.startsWith('!')) return;

    // --- ESCUCHA SILENCIOSA EN CADA CANAL (EXCEPTO EXCLUIDOS) ---
    const canalId = message.id ? message.channel.id : null;
    if (canalId && !CANALES_EXCLUIDOS.includes(nombreCanal)) {
      let historialCanal = memoriasCanales.get(canalId) || [];
      historialCanal.push({ role: 'user', content: `${message.author.username} dice: ${message.content}` });
      
      if (historialCanal.length > 15) {
        historialCanal.shift();
      }
      memoriasCanales.set(canalId, historialCanal);
    }

    // --- SI EL CANAL ESTÁ EN LA LISTA NEGRA DE COMANDOS, IGNORAR ---
    if (CANALES_EXCLUIDOS.includes(nombreCanal)) {
      return;
    }

    // --- FILTRO CON 5% DE PROBABILIDAD ALEATORIA O MENCIÓN ---
    const fueMencionado = message.mentions.has(client.user.id);
    const esRespuestaAlBot = message.reference && message.referencedMessage?.author.id === client.user.id;
    const diceSuNombre = textoMinusculas.includes('leon');
    const intervencionAleatoria = Math.random() < 0.05; // 5% de probabilidad

    if (!fueMencionado && !esRespuestaAlBot && !diceSuNombre && !intervencionAleatoria) {
      return; 
    }

    // --- FUNCIÓN UNIFICADA DE COOLDOWN ---
    const verificarCooldown = (userId) => {
      const tiempoActual = Date.now();
      const ultimoUso = cooldownsComandos.get(userId) || 0;
      if (tiempoActual - ultimoUso < 5000) {
        return Math.ceil((5000 - (tiempoActual - ultimoUso)) / 1000);
      }
      cooldownsComandos.set(userId, tiempoActual);
      return 0;
    };

    // --- 2. DETECCIÓN DE ERRORES DE STEAM ---
    const palabrasAvisoError = ['error', 'codigo', 'código', 'fallo', '-105', '-138', '118', '50'];
    const esPreguntaDeError = palabrasAvisoError.some(p => textoMinusculas.includes(p));

    if (esPreguntaDeError && !intervencionAleatoria) {
      for (const item of erroresSteam) {
        if (item.palabrasClave.some(keyword => textoMinusculas.includes(keyword))) {
          const segundosRestantes = verificarCooldown(message.author.id);
          if (segundosRestantes > 0) {
            return message.reply(`espérate unos segundos (${segundosRestantes}s), no spamees los comandos del sistema xd.`);
          }
          return message.reply(item.respuesta); 
        }
      }
    }

    // --- CONVERSACIÓN LIBRE CON IA ---
    let promptUsuario = message.content
      .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
      .trim();

    await message.channel.sendTyping();

    const palabrasClave = ['foto', 'imagen', 'mona', 'china', 'waifu', 'pasa', 'manda', 'dibujo', 'pic'];
    const pideImagen = palabrasClave.some((palabra) => textoMinusculas.includes(palabra));

    let attachment = null;
    let promesaTexto = generarRespuestaOpenRouter(message.channel.id, promptUsuario || message.content, message.author.username);

    if (pideImagen) {
      try {
        const resWaifu = await axios.get('https://api.waifu.pics/sfw/waifu', { timeout: 5000 });
        if (resWaifu.data && resWaifu.data.url) {
          attachment = new AttachmentBuilder(resWaifu.data.url, { name: 'waifu.jpg' });
        }
      } catch (err) {
        console.warn('No se pudo adjuntar imagen:', err.message);
      }
    }

    const respuestaTexto = await promesaTexto;
    const opcionesEnvio = { content: respuestaTexto };
    if (attachment) opcionesEnvio.files = [attachment];

    return message.reply(opcionesEnvio);

  } catch (error) {
    console.error('Error general en messageCreate:', error);
  }
});

client.login(process.env.DISCORD_TOKEN);