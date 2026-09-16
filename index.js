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
let baseDeDatosCuentas = [];

// --- ESTADO DE ENCENDIDO/APAGADO ---
let botActivado = true;

const CANAL_OBJETIVO = 'ε⦁s⦁*cuentas-free'; 
const BOT_OBJETIVO = 'systemsamg';   

// --- CANALES DONDE LEON NO DEBE HABLAR (EN MINÚSCULAS) ---
const CANALES_EXCLUIDOS = ['commands', 'command', 'comandos', 'bot-commands'];

const abreviacionesJuegos = {
  're4': 'resident evil 4',
  're2': 'resident evil 2',
  're3': 'resident evil 3',
  're5': 'resident evil 5',
  're6': 'resident evil 6',
  're7': 'resident evil 7',
  're8': 'resident evil village',
  're9': 'resident evil requiem',
  'fnaf': 'five nights at freddys',
  'gta': 'grand theft auto',
  'dmc': 'devil may cry',
  'cod': 'call of duty'
};

// --- DICCIONARIO DE ERRORES DE STEAM ---
const erroresSteam = [
  {
    palabrasClave: ['error 50', 'código de error 50', 'codigo de error 50'],
    respuesta: 'el error 50 pasa porque hay demasiada gente metida en la misma cuenta al mismo tiempo. aplica el truco de sam: échales los perros cerrando sesión en todos los demás dispositivos y ponte en **modo desconectado** de inmediato para que no te jodan xd.\n\n¿cómo se cierra sesión en las demas cuentas? facil, solo dale click al perfil, anda a detalles de la cuenta, despues seguridad y dispositivos, baja, y donde diga cerrar sesion en todos los dispositivos, le das, y lito'
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
    respuesta: 'esa cuenta tiene steam guard activo (pide código al correo o celular). las cuentas free de samg que piden esto usualmente requieren que el dueño original autorice o que uses el truco de entrar sin tocar la verificación si el juego lo permite, pero está cabrón si pide 2fa personal.'
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
2. usa expresiones como "q", "xd", "jaja", "osea", "naa", "que va".
3. no escribas parrafos largos, responde corto y al grano, a menos que te pidan una guia detallada.
4. IMPORTANTE SOBRE ERRORES QUE NO CONOCES: si te preguntan por un código de error, fallo técnico raro o problema de pc que no tenga que ver con la trama de resident evil, actúa como un "DMC-virgin" total: haz como que no tienes idea de informática, di que tú solo sabes dispararle a plagas o que mejor le pregunten a Dante o usen el buscador.
5. IMPORTANTE PARA IMAGENES: si el usuario pide una imagen, foto, mona china o dibujo, responde con recelo y sarcasmo de que no estás para andar pasando fotos.
6. INTERVENCIÓN ALEATORIA: Tienes un 5% de probabilidad de soltar un comentario casual o irónico de la nada en los mensajes de los canales, incluso si no te mencionan directamente.
`;

function procesarMensajeSamg(msg) {
  let textoCompleto = msg.content || '';
  if (msg.embeds && msg.embeds.length > 0) {
    msg.embeds.forEach(embed => {
      if (embed.title) textoCompleto += '\n' + embed.title;
      if (embed.description) textoCompleto += '\n' + embed.description;
      if (embed.fields && embed.fields.length > 0) {
        embed.fields.forEach(field => {
          textoCompleto += `\n${field.name}: ${field.value}`;
        });
      }
    });
  }
  return textoCompleto.trim();
}

client.once('ready', async () => {
  console.log(`Bot encendido como ${client.user.tag} listo para responder`);

  for (const [guildId, guild] of client.guilds.cache) {
    try {
      const canalesTexto = guild.channels.cache.filter(c => c.isTextBased() && c.name.toLowerCase() === CANAL_OBJETIVO);
      for (const [canalId, canal] of canalesTexto) {
        const mensajes = await canal.messages.fetch({ limit: 50 }).catch(() => null);
        if (mensajes) {
          const mensajesOrdenados = Array.from(mensajes.values()).reverse();
          mensajesOrdenados.forEach(msg => {
            const autorUser = msg.author.username.toLowerCase();
            const esSamg = autorUser.includes(BOT_OBJETIVO) || msg.author.bot;
            if (esSamg) {
              const infoProcesada = procesarMensajeSamg(msg);
              if (infoProcesada.length > 0) {
                if (!baseDeDatosCuentas.some(c => c.enlaceOriginal === msg.url)) {
                  baseDeDatosCuentas.push({
                    contenido: infoProcesada,
                    enlaceOriginal: msg.url
                  });
                }
              }
            }
          });
        }
      }
      console.log(`[AUTO-LEER] Se cargaron ${baseDeDatosCuentas.length} cuentas de SystemsSamg desde #${CANAL_OBJETIVO}.`);
    } catch (error) {
      console.error('Error al escanear canales automáticamente al iniciar:', error);
    }
  }
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

    const respuestaTexto = response.data.choices?.[0]?.message?.content || 'naa no se q decir xd';
    
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

    // --- ANTIDOBLE RESPUESTA ---
    if (message.processedByBot) return;
    message.processedByBot = true;

    const textoMinusculas = message.content.toLowerCase();
    const nombreCanal = message.channel.name.toLowerCase();
    const esSamg = message.author.username.toLowerCase().includes(BOT_OBJETIVO);

    // Guardar cuentas de Samg de fondo incluso si está apagado
    if (nombreCanal === CANAL_OBJETIVO && esSamg) {
      const infoProcesada = procesarMensajeSamg(message);
      if (infoProcesada.length > 0) {
        if (!baseDeDatosCuentas.some(c => c.enlaceOriginal === message.url)) {
          baseDeDatosCuentas.push({
            contenido: infoProcesada,
            enlaceOriginal: message.url
          });
        }
      }
    }

    // --- COMANDOS DE APAGADO Y ENCENDIDO ---
    if (message.content === '!apagar') {
      botActivado = false;
      return message.reply('me apagaron... descativando protocolos de la dso, ya no hablaré xd.');
    }

    if (message.content === '!encender') {
      botActivado = true;
      return message.reply('estoy de vuelta en el ruedo. que los zombies se guarden xd.');
    }

    // Si el bot está apagado, ignora todo lo demás (excepto los comandos de encendido de arriba)
    if (!botActivado) return;

    // --- ESCUCHA SILENCIOSA EN CADA CANAL (EXCEPTO EXCLUIDOS) ---
    const canalId = message.id ? message.channel.id : null;
    if (canalId && !message.content.startsWith('!') && !CANALES_EXCLUIDOS.includes(nombreCanal)) {
      let historialCanal = memoriasCanales.get(canalId) || [];
      historialCanal.push({ role: 'user', content: `${message.author.username} dice: ${message.content}` });
      
      if (historialCanal.length > 15) {
        historialCanal.shift();
      }
      memoriasCanales.set(canalId, historialCanal);
    }

    if (message.content === '!clear') {
      baseDeDatosCuentas = [];
      memoriasCanales.clear();
      return message.reply('limpié toda la memoria y cuentas... me quedé en blanco, como si acabara de salir de Raccoon City xd.');
    }

    if (message.content.startsWith('!')) return;

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

    // --- 1. DETECCIÓN DE ERRORES DE STEAM ---
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

    // --- VER CUENTAS DISPONIBLES ---
    if ((textoMinusculas.includes('que cuentas tienes') || textoMinusculas.includes('cuentas tienes en mente')) && !intervencionAleatoria) {
      const segundosRestantes = verificarCooldown(message.author.id);
      if (segundosRestantes > 0) {
        return message.reply(`espérate unos segundos (${segundosRestantes}s) antes de volver a pedir la lista xd.`);
      }

      if (baseDeDatosCuentas.length === 0) {
        return message.reply('no tengo cuentas de Samg guardadas todavía... espera a que suelte alguna en el canal de cuentas-free xd.');
      }
      const listaResumen = baseDeDatosCuentas.map((c, i) => `[${i + 1}] ${c.contenido.split('\n')[0]}`).join('\n');
      return message.reply(`tengo estas cuentas de Samg en mente:\n\n${listaResumen}\n\nDime "dame una cuenta de RE4" para pasarte los datos.`);
    }

    // --- PETICIÓN DE CUENTA ---
    const pideCuentaDirecta = textoMinusculas.includes('cuenta') && (textoMinusculas.includes('dame') || textoMinusculas.includes('pasa') || textoMinusculas.includes('quiero') || textoMinusculas.includes('tiene'));
    
    if (pideCuentaDirecta && !intervencionAleatoria) {
      const segundosRestantes = verificarCooldown(message.author.id);
      if (segundosRestantes > 0) {
        return message.reply(`cálmate vaquero, espera ${segundosRestantes}s para pedir otra cuenta xd.`);
      }

      if (baseDeDatosCuentas.length === 0) {
        return message.reply('todavía no tengo cuentas guardadas en la memoria xd.');
      }

      let juegoEncontrado = null;
      for (const [key, fullName] of Object.entries(abreviacionesJuegos)) {
        if (textoMinusculas.includes(key) || textoMinusculas.includes(fullName)) {
          juegoEncontrado = baseDeDatosCuentas.find(c => 
            c.contenido.toLowerCase().includes(key) || c.contenido.toLowerCase().includes(fullName)
          );
          if (juegoEncontrado) break;
        }
      }

      if (!juegoEncontrado) {
        juegoEncontrado = baseDeDatosCuentas.find(c => {
          const contenidoC = c.contenido.toLowerCase();
          return textoMinusculas.split(' ').some(palabra => palabra.length > 3 && contenidoC.includes(palabra));
        });
      }

      if (juegoEncontrado) {
        return message.reply(`a ver... aquí tienes los datos que soltó Samg:\n\n${juegoEncontrado.contenido}\n\n*(Mensaje original: ${juegoEncontrado.enlaceOriginal})*`);
      } else {
        return message.reply(`busqué en los registros de Samg pero no encontré ninguna cuenta que coincida con lo que pides xd.`);
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