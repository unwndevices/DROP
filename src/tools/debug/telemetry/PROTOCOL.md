# eisei debug telemetry — protocol v1

The debug tool reads **newline-delimited JSON (NDJSON)** from eisei over the
USB serial port it already uses for its console (`115200` baud, 8-N-1). One
JSON object per line; the device emits frames continuously while running.

Lines that don't start with `{` are ignored, so existing boot logs / `printf`
debugging can share the same port without confusing the parser.

## Frame

```json
{"t":"tele","ms":12345,"pots":[0.5012,0.0008,0.5003],"osc":[440.0,110.0]}
```

| field  | type       | required | meaning                                                        |
| ------ | ---------- | -------- | -------------------------------------------------------------- |
| `t`    | `"tele"`   | no¹      | frame type tag                                                 |
| `ms`   | number     | no       | device uptime in milliseconds                                  |
| `pots` | number[]   | no       | potentiometer values, **normalized to `[0, 1]`**, one per pot  |
| `osc`  | number[]   | no       | oscillator frequencies in **Hz**, one per oscillator           |

¹ A frame is accepted if it carries `"t":"tele"` **or** any known payload array
(`pots` / `osc`). Unknown fields are ignored — new cards add new fields without
breaking older clients.

### Notes

- **Pots are normalized.** Send `adc / fullScale` as a float with enough
  precision to preserve noise (e.g. `0.50122`). The scope's "0–1" mode then
  shows absolute position and "auto" mode zooms into the jitter.
- **Note + cents are derived in the browser** from `osc` Hz (A4 = 440), so the
  firmware only sends frequencies.
- **Rate:** ~30–120 Hz is plenty. The tool coalesces to one render per animation
  frame regardless, so a faster stream just costs bandwidth.

## Suggested firmware emitter (ESP32, ~60 Hz)

```c
printf("{\"t\":\"tele\",\"ms\":%lu,\"pots\":[%.5f,%.5f],\"osc\":[%.2f,%.2f]}\n",
       millis(), pot0 / 4095.0f, pot1 / 4095.0f, osc0_hz, osc1_hz);
```

Until the firmware emits this, use the tool's **demo** button — it generates
synthetic frames in exactly this shape.
