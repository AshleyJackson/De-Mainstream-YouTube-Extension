<script lang="ts">
  import { onMount } from 'svelte';
  import { channels, loadChannels, toggleChannel, setAllEnabled } from '$lib/stores/channels';

  onMount(() => {
    loadChannels();
  });
</script>

<div class="container">
  <h1 class="container__header">Select Channels to Hide:</h1>

  <ul id="list" class="list">
    {#each $channels as channel (channel.id)}
      <li class="list-item">
        <input
          type="checkbox"
          class="list-item__checkbox"
          id={channel.id}
          bind:checked={channel.enabled}
          onchange={() => toggleChannel(channel.id, channel.enabled)}
        />
        <label class="list-item__block" for={channel.id}>
          <img class="list-item__icon" src={channel.icon} alt={channel.name} />
          <span class="list-item__text">{channel.name}</span>
        </label>
      </li>
    {/each}
  </ul>

  <div class="controls">
    <button
      class="controls__btn btn"
      onclick={() => setAllEnabled(true)}
    >Select All</button>
    <button
      class="controls__btn btn"
      onclick={() => setAllEnabled(false)}
    >Deselect All</button>
  </div>
</div>

<style>
  .container {
    display: block;
    min-width: 440px;
    min-height: 395px;
    overflow: hidden;
    background-color: #fff;
    padding: 10px;
  }

  .container__header {
    display: block;
    font-size: 22px;
    color: #000;
    margin-bottom: 10px;
    text-align: left;
  }

  .list {
    display: flex;
    flex-wrap: wrap;
    max-height: 300px;
    overflow: hidden;
    overflow-y: scroll;
    width: 100%;
    border: 1px solid #bbb;
    background-color: #fdfdfd;
    padding: 8px;
    list-style: none;
    margin: 0;
  }

  .list-item {
    display: inline-block;
    cursor: pointer;
    position: relative;
    vertical-align: top;
    margin: 0 4px 4px 0;
    width: 75px;
    min-height: 60px;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }

  .list-item:nth-of-type(5) {
    margin-right: 0;
  }

  .list-item__checkbox {
    display: block;
    position: absolute;
    visibility: hidden;
  }

  .list-item__block {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-content: center;
    position: relative;
    height: 100%;
    width: 100%;
    padding: 8px;
    border: 1px solid transparent;
    border-radius: 6px;
  }

  .list-item__checkbox:checked + .list-item__block {
    border-color: #22bef0;
    background-color: #ECF6FF;
  }

  .list-item__icon {
    display: block;
    height: 34px;
    width: 34px;
    margin: 0 auto;
    -o-object-fit: cover;
    object-fit: cover;
    border-radius: 17px;
  }

  .list-item__text {
    display: block;
    font-size: 10px;
    text-align: center;
    margin-top: 5px;
    color: #000;
    word-wrap: break-word;
  }

  .controls {
    display: block;
    border: 1px solid #bbb;
    border-top: none;
    padding: 6px 10px;
  }

  .controls__btn {
    display: inline-block;
    margin-right: 10px;
  }

  .btn {
    color: #000;
    border: 1px solid #aaa;
    padding: 4px 6px;
    border-radius: 4px;
    background-color: #eee;
    box-shadow: inset 0 -1px 0 0 #999;
    cursor: pointer;
    font-size: 12px;
  }

  .btn:active {
    box-shadow: inset 0 1px 4px 0 #aaa;
    background-color: #e4e4e4;
  }
</style>