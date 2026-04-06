<script lang="ts">
  import { setDevice, setRoomTemp } from '../lib/homeStore';
  import type { Room, Device } from '../lib/homeStore';
  import { agentTool } from '@domos/svelte';
  import { agentContext } from '@domos/svelte';
  import { z } from 'zod';

  let { room }: { room: Room } = $props();

  const lightsOn    = $derived(room.devices.filter(d => d.type === 'light'  && d.on).length);
  const totalLights = $derived(room.devices.filter(d => d.type === 'light').length);
  const anyOn       = $derived(room.devices.some(d => d.on));

  function toggleDevice(device: Device) {
    setDevice(device.id, { on: !device.on });
  }

  function setBrightness(device: Device, value: number) {
    setDevice(device.id, { value, on: value > 0 });
  }

  function adjustTemp(deviceId: string, current: number, delta: number) {
    setDevice(deviceId, { value: Math.min(35, Math.max(10, current + delta)) });
  }

  // Tool handler pour toggler un device (type any pour compatibilité agentTool)
  async function handleToggleDevice(args: any) {
    const { deviceId } = args;
    const device = room.devices.find(d => d.id === deviceId);
    if (device) {
      setDevice(deviceId, { on: !device.on });
      return { success: true };
    }
    return { success: false };
  }

  // Tool handler pour régler la luminosité (type any)
  async function handleSetBrightness(args: any) {
    const { deviceId, value } = args;
    const device = room.devices.find(d => d.id === deviceId);
    if (device && device.type === 'light') {
      setDevice(deviceId, { value, on: value > 0 });
      return { success: true };
    }
    return { success: false };
  }

  // Tool handler pour ajuster la température (type any)
  async function handleAdjustTemp(args: any) {
    const { deviceId, delta } = args;
    const device = room.devices.find(d => d.id === deviceId);
    if (device && device.type === 'thermostat' && device.value !== undefined) {
      setDevice(deviceId, { value: Math.min(35, Math.max(10, device.value + delta)) });
      return { success: true };
    }
    return { success: false };
  }
</script>

<div class="card-glass p-4 transition-all duration-500
            {anyOn ? 'border-white/[0.12] shadow-lg shadow-amber-500/5' : ''}"
  use:agentTool={{
    name: 'toggle_device',
    description: 'Allumer ou éteindre un appareil',
    schema: z.object({ deviceId: z.string() }),
    risk: 'low',
    handler: handleToggleDevice,
    global: false
  }}
  use:agentTool={{
    name: 'set_brightness',
    description: 'Régler la luminosité d\'une lampe',
    schema: z.object({ deviceId: z.string(), value: z.number().min(0).max(100) }),
    risk: 'low',
    handler: handleSetBrightness,
    global: false
  }}
  use:agentTool={{
    name: 'adjust_temperature',
    description: 'Ajuster la température d\'une pièce',
    schema: z.object({ deviceId: z.string(), delta: z.number() }),
    risk: 'low',
    handler: handleAdjustTemp,
    global: false
  }}
  use:agentContext={{
    page: 'room',
    roomId: room.id,
    devices: room.devices
  }}
>

  <!-- Room header -->
  <div class="flex items-start justify-between mb-3">
    <div class="flex items-center gap-2.5">
      <span class="text-2xl leading-none">{room.icon}</span>
      <div>
        <p class="text-sm font-semibold text-white/90">{room.name}</p>
        {#if totalLights > 0}
          <p class="text-xs text-white/30">
            {lightsOn}/{totalLights} lumière{totalLights > 1 ? 's' : ''}
          </p>
        {/if}
      </div>
    </div>

    {#if room.temperature !== undefined}
      <div class="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
        <svg class="w-3 h-3 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M9 19V7a3 3 0 016 0v12a5 5 0 11-6 0z" />
        </svg>
        <span class="text-xs text-cyan-300 font-medium">{room.temperature}°C</span>
      </div>
    {/if}
  </div>

  <!-- Devices -->
  <div class="space-y-3">
    {#each room.devices as device (device.id)}

      <!-- LIGHT -->
      {#if device.type === 'light'}
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-5 h-5 rounded-full flex items-center justify-center transition-colors duration-300
                          {device.on ? 'bg-amber-500/20' : 'bg-white/[0.05]'}">
                <svg class="w-3 h-3 transition-colors duration-300
                            {device.on ? 'text-amber-400' : 'text-white/20'}"
                     fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6c0 2.22 1.21 4.16 3 5.2V15a1 1 0 001 1h4a1 1 0 001-1v-1.8c1.79-1.04 3-2.98 3-5.2A6 6 0 0010 2z"/>
                </svg>
              </div>
              <span class="text-xs text-white/60">{device.name}</span>
            </div>

            <button
              onclick={() => toggleDevice(device)}
              class="device-toggle {device.on ? 'on' : 'off'}"
              aria-label="Toggle {device.name}"
            >
              <span class="device-toggle-thumb"></span>
            </button>
          </div>

          {#if device.on && device.value !== undefined}
            <div class="flex items-center gap-2 pl-7">
              <input
                type="range" min="0" max="100" step="5"
                value={device.value}
                oninput={e => setBrightness(device, parseInt((e.target as HTMLInputElement).value))}
                class="flex-1 h-1 accent-amber-400 cursor-pointer"
              />
              <span class="text-xs text-amber-400/70 w-8 text-right">{device.value}%</span>
            </div>
          {/if}
        </div>

      <!-- LOCK -->
      {:else if device.type === 'lock'}
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-5 h-5 rounded-full flex items-center justify-center
                        {device.on ? 'bg-emerald-500/20' : 'bg-red-500/20'}">
              <svg class="w-3 h-3 {device.on ? 'text-emerald-400' : 'text-red-400'}"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                {#if device.on}
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                {:else}
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/>
                {/if}
              </svg>
            </div>
            <span class="text-xs text-white/60">{device.name}</span>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs {device.on ? 'text-emerald-400' : 'text-red-400'}">
              {device.on ? 'Verrouillé' : 'Déverrouillé'}
            </span>
            <button
              onclick={() => toggleDevice(device)}
              class="device-toggle {device.on ? 'on !bg-emerald-500' : 'off !bg-red-500/40'}"
            >
              <span class="device-toggle-thumb"></span>
            </button>
          </div>
        </div>

      <!-- THERMOSTAT -->
      {:else if device.type === 'thermostat'}
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-5 h-5 rounded-full flex items-center justify-center
                        {device.on ? 'bg-cyan-500/20' : 'bg-white/[0.05]'}">
              <svg class="w-3 h-3 {device.on ? 'text-cyan-400' : 'text-white/20'}"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M9 19V7a3 3 0 016 0v12a5 5 0 11-6 0z"/>
              </svg>
            </div>
            <span class="text-xs text-white/60">{device.name}</span>
          </div>

          <div class="flex items-center gap-1.5">
            {#if device.on && device.value !== undefined}
              <button
                onclick={() => adjustTemp(device.id, device.value!, -1)}
                class="w-5 h-5 rounded-md bg-white/[0.07] hover:bg-white/[0.12] text-white/60
                       flex items-center justify-center text-xs transition-colors"
              >−</button>
              <span class="text-xs text-cyan-300 font-mono w-8 text-center">{device.value}°C</span>
              <button
                onclick={() => adjustTemp(device.id, device.value!, +1)}
                class="w-5 h-5 rounded-md bg-white/[0.07] hover:bg-white/[0.12] text-white/60
                       flex items-center justify-center text-xs transition-colors"
              >+</button>
            {/if}
            <button
              onclick={() => toggleDevice(device)}
              class="device-toggle {device.on ? 'on !bg-cyan-500' : 'off'}"
            >
              <span class="device-toggle-thumb"></span>
            </button>
          </div>
        </div>

      <!-- BLINDS -->
      {:else if device.type === 'blinds'}
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-5 h-5 rounded-full bg-white/[0.05] flex items-center justify-center">
              <svg class="w-3 h-3 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h7"/>
              </svg>
            </div>
            <span class="text-xs text-white/60">{device.name}</span>
          </div>
          <button
            onclick={() => toggleDevice(device)}
            class="device-toggle {device.on ? 'on !bg-sky-500' : 'off'}"
          >
            <span class="device-toggle-thumb"></span>
          </button>
        </div>
      {/if}

    {/each}
  </div>
</div>
