<script lang="ts">
  import { onMount } from 'svelte';
  import { channels, loadChannels, toggleChannel, setAllEnabled } from '$lib/stores/channels';
  import Check from '@o7/icon/lucide/Check';
  import X from '@o7/icon/lucide/X';

  onMount(() => {
    loadChannels();
  });
</script>

<div class="block min-w-[440px] min-h-[395px] overflow-hidden bg-white p-2.5">
  <h1 class="block text-[22px] text-black mb-2.5 text-left">Select Channels to Hide:</h1>

  <ul id="list" class="flex flex-wrap max-h-[300px] overflow-y-scroll w-full border border-[#bbb] bg-[#fdfdfd] p-2 list-none m-0">
    {#each $channels as channel (channel.id)}
      <li class="inline-block cursor-pointer relative align-top mr-1 mb-1 w-[75px] min-h-[60px] select-none last:mr-0">
        <input
          type="checkbox"
          class="peer absolute invisible"
          id={channel.id}
          bind:checked={channel.enabled}
          onchange={() => toggleChannel(channel.id, channel.enabled)}
        />
        <label
          class="flex flex-col justify-center content-center relative h-full w-full p-2 border border-transparent rounded-[6px] cursor-pointer
                 peer-checked:border-[#22bef0] peer-checked:bg-[#ECF6FF]"
          for={channel.id}
        >
          <div class="relative w-[34px] h-[34px] mx-auto">
            <img class="block h-[34px] w-[34px] object-cover rounded-full" src={channel.icon} alt={channel.name} />
            {#if channel.enabled}
              <div class="absolute -bottom-0.5 -right-0.5 bg-[#22bef0] text-white rounded-full w-4 h-4 flex items-center justify-center">
                <Check size={12} />
              </div>
            {/if}
          </div>
          <span class="block text-[10px] text-center mt-1 text-black break-words">{channel.name}</span>
        </label>
      </li>
    {/each}
  </ul>

  <div class="flex gap-2 border border-[#bbb] border-t-0 px-2.5 py-1.5">
    <button
      class="inline-flex items-center gap-1 text-black border border-[#aaa] px-1.5 py-1 rounded-[4px] bg-[#eee] shadow-[inset_0_-1px_0_0_#999] cursor-pointer text-[12px] active:shadow-[inset_0_1px_4px_0_#aaa] active:bg-[#e4e4e4]"
      onclick={() => setAllEnabled(true)}
    >
      <Check size={14} />
      Select All
    </button>
    <button
      class="inline-flex items-center gap-1 text-black border border-[#aaa] px-1.5 py-1 rounded-[4px] bg-[#eee] shadow-[inset_0_-1px_0_0_#999] cursor-pointer text-[12px] active:shadow-[inset_0_1px_4px_0_#aaa] active:bg-[#e4e4e4]"
      onclick={() => setAllEnabled(false)}
    >
      <X size={14} />
      Deselect All
    </button>
  </div>
</div>
