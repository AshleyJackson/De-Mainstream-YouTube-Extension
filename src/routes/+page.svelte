<script lang="ts">
  import { onMount } from 'svelte';
  import { groups, loadGroups, toggleGroup, setAllEnabled } from '$lib/stores/channels';
  import { customChannels, loadCustomChannels, removeCustomChannel } from '$lib/stores/custom';
  import Check from '@o7/icon/lucide/Check';
  import X from '@o7/icon/lucide/X';
  import Trash2 from '@o7/icon/lucide/Trash2';

  let activeTab = 'groups' as 'groups' | 'custom';

  onMount(() => {
    loadGroups();
    loadCustomChannels();
  });
</script>

<div class="block min-w-[440px] min-h-[395px] overflow-hidden bg-white p-2.5">
  <h1 class="block text-[22px] text-black mb-2.5 text-left">Select Channels to Hide:</h1>

  <!-- Tabs -->
  <div class="flex gap-1 mb-2.5 border-b border-[#bbb]">
    <button
      class="px-3 py-1 text-[13px] rounded-t-[4px] border border-b-0 border-[#bbb] cursor-pointer
             {activeTab === 'groups' ? 'bg-white -mb-px font-medium' : 'bg-[#eee] text-gray-600'}"
      onclick={() => (activeTab = 'groups')}
    >
      Groups
    </button>
    {#if $customChannels.length > 0}
      <button
        class="px-3 py-1 text-[13px] rounded-t-[4px] border border-b-0 border-[#bbb] cursor-pointer
               {activeTab === 'custom' ? 'bg-white -mb-px font-medium' : 'bg-[#eee] text-gray-600'}"
        onclick={() => (activeTab = 'custom')}
      >
        Custom ({$customChannels.length})
      </button>
    {/if}
  </div>

  {#if activeTab === 'groups'}
    <ul id="list" class="flex flex-wrap max-h-[300px] overflow-y-scroll w-full border border-[#bbb] bg-[#fdfdfd] p-2 list-none m-0">
      {#each $groups as group (group.id)}
        <li class="inline-block cursor-pointer relative align-top mr-1 mb-1 w-[75px] min-h-[60px] select-none last:mr-0">
          <input
            type="checkbox"
            class="peer absolute invisible"
            id={group.id}
            bind:checked={group.enabled}
            onchange={() => toggleGroup(group.id, group.enabled)}
          />
          <label
            class="flex flex-col justify-center content-center relative h-full w-full p-2 border border-transparent rounded-[6px] cursor-pointer
                   peer-checked:border-[#22bef0] peer-checked:bg-[#ECF6FF]"
            for={group.id}
          >
            <div class="relative w-[34px] h-[34px] mx-auto">
              <img class="block h-[34px] w-[34px] object-cover rounded-full" src={group.icon} alt={group.name} />
              {#if group.enabled}
                <div class="absolute -bottom-0.5 -right-0.5 bg-[#22bef0] text-white rounded-full w-4 h-4 flex items-center justify-center">
                  <Check size={12} />
                </div>
              {/if}
            </div>
            <span class="block text-[10px] text-center mt-1 text-black break-words">{group.name}</span>
            {#if group.channelIds.length > 1}
              <span class="block text-[8px] text-center text-gray-400">{group.channelIds.length} channels</span>
            {/if}
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
  {:else if activeTab === 'custom'}
    <div class="max-h-[300px] overflow-y-scroll w-full border border-[#bbb] bg-[#fdfdfd] p-2">
      {#if $customChannels.length === 0}
        <p class="text-[13px] text-gray-500 text-center py-4">No custom channels added.</p>
      {:else}
        <ul class="list-none m-0 p-0">
          {#each $customChannels as channelId}
            <li class="flex items-center justify-between py-1.5 px-2 border-b border-[#eee] last:border-b-0">
              <span class="text-[13px] text-black break-all mr-2">{channelId}</span>
              <button
                class="inline-flex items-center gap-1 text-red-600 border border-red-300 px-1.5 py-0.5 rounded-[4px] bg-red-50 cursor-pointer text-[11px] hover:bg-red-100 active:bg-red-200 shrink-0"
                onclick={() => removeCustomChannel(channelId)}
              >
                <Trash2 size={12} />
                Remove
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</div>
