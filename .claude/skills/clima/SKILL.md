---
name: clima
description: >-
  Consulta el clima ACTUAL (temperatura, sensacion termica, humedad, viento,
  presion, visibilidad y condicion) desde wttr.in, sin API key. Ubicacion por
  defecto: Capital Federal, Buenos Aires, Argentina. Usar cuando el usuario pida
  "clima", "tiempo", "temperatura", "que tiempo hace", "weather" o el estado del
  cielo de una ciudad.
allowed-tools: Bash
---

# Clima (wttr.in)

Obtiene el clima actual de forma local ejecutando un script PowerShell que
consulta `wttr.in`. No requiere API key ni configuracion.

## Uso

1. Ejecutar el script:

   ```
   powershell -NoProfile -ExecutionPolicy Bypass -File .claude/skills/clima/scripts/clima.ps1
   ```

   - Sin argumentos usa la ubicacion por defecto: **Capital Federal, Buenos Aires, Argentina**.
   - Si el usuario menciona otra ciudad, pasarla con `-Ciudad`:

     ```
     powershell -NoProfile -ExecutionPolicy Bypass -File .claude/skills/clima/scripts/clima.ps1 -Ciudad "Cordoba, Argentina"
     ```

   - Para ver el JSON crudo de wttr.in: agregar `-Json`.

2. Mostrar al usuario la salida del script tal cual, en espanol y de forma
   concisa. No reformatear los numeros ni agregar datos que el script no devuelve.

3. **No inventar datos.** Si el script falla (sin red, wttr.in caido), informar
   el error que devolvio y ofrecer reintentar.

## Fallback

Si PowerShell no esta disponible, usar curl directamente:

```
curl.exe -s -H "User-Agent: curl/8" "https://wttr.in/Buenos+Aires?format=3&lang=es"
```

## Notas

- `wttr.in` es un servicio externo gratuito: cada invocacion hace una request a
  internet.
- Solo devuelve el clima actual (sin pronostico), por diseno.
