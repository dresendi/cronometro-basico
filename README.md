# Cronometro Basico

App Android con Capacitor que muestra:

- Un cronometro analogico de 15 minutos.
- Un boton para iniciar y detener con el mismo control.
- Un timer por minutos usando entrada numerica libre.
- Un boton para limpiar y regresar todo a cero.
- Una alerta sonora al finalizar el timer.

## Estructura

- `www/index.html`: interfaz
- `www/styles.css`: estilos
- `www/app.js`: logica del cronometro y timer
- `www/assets/alert-placeholder.txt`: ubicacion sugerida para un audio personalizado

## Instalar

1. Instala dependencias:

```bash
npm.cmd install
```

2. Agrega Android al proyecto:

```bash
npx cap add android
```

3. Sincroniza cambios:

```bash
npx cap sync android
```

4. Abre Android Studio:

```bash
npx cap open android
```

## Sonido

La app ya genera una alerta con Web Audio si no hay archivo externo.

Si quieres reemplazarla por tu propio sonido, coloca un archivo en:

- `www/assets/alert.mp3`

La app intentara reproducir ese archivo primero y, si no existe o falla, usara el sonido sintetico.
