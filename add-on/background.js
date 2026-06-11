'use strict'
/* eslint-env chrome, webextensions */

const youtubeMusicPlayerUrl = 'https://music.youtube.com/*'
const togglePlaybackCommand = 'toggle-playback'
const previousSongCommand = 'previous-song'
const nextSongCommand = 'next-song'
const volumeUpCommand = 'volume-up'
const volumeDownCommand = 'volume-down'

function getActionName (command) {
  switch (command) {
    case togglePlaybackCommand:
      return 'play-pause'
    case previousSongCommand:
      return 'rewind'
    case nextSongCommand:
      return 'forward'
    case volumeUpCommand:
      return 'volume-up'
    case volumeDownCommand:
      return 'volume-down'
  }
}

function youTubeMusicScriptThatClicksOn (actionName) {
  // TODO: revisit when YouTube Music adds 'feeling lucky' on page without player
  const findButton = (action) => {
    const qs = (q) => document.querySelector(q)
    switch (action) {
      case 'rewind':
        return qs('.ytmusic-player-bar.previous-button') || qs('.previous-button')
      case 'forward':
        return qs('.ytmusic-player-bar.next-button') || qs('.next-button')
      case 'play-pause':
        return qs('.ytmusic-player-bar.play-pause-button') || qs('.play-pause-button') || document.getElementById('play-button')
      case 'volume-up':
      case 'volume-down':
        return qs('.ytmusic-player-bar.volume-slider') || qs('.volume-slider')
    }
  }
  const button = findButton(actionName)
  if (button) {
    if (actionName === 'volume-up' || actionName === 'volume-down') {
      const volumeChange = actionName === 'volume-up' ? 5 : -5
      const currentVolume = parseInt(button.value) || 0
      button.value = Math.min(100, Math.max(0, currentVolume + volumeChange))
      button.dispatchEvent(new Event('change', { bubbles: true }))
    } else {
      button.click()
    }    
  } else {
    console.log('[YouTube Music Hotkeys] unable to find the play button, please report a bug at https://github.com/lidel/google-music-hotkeys/issues/new')
  }
}

async function executeCommand (command) {
  console.log('[YouTube Music Hotkeys] executing command: ', command)
  const ymTabs = await chrome.tabs.query({ url: youtubeMusicPlayerUrl })

  if (ymTabs.length === 0) {
    return
  }

  const actionName = getActionName(command)

  for (const tab of ymTabs) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: youTubeMusicScriptThatClicksOn,
      args: [actionName]
    })
  }
}

async function onRuntimeMessage (request, sender) {
  console.log('[YouTube Music Hotkeys] onRuntimeMessage', request)
  const actionName = getActionName(request.command)
  await chrome.scripting.executeScript({
    target: { tabId: sender.tab.id },
    func: youTubeMusicScriptThatClicksOn,
    args: [actionName]
  })
}

// listen for keyboard hotkeys
chrome.commands.onCommand.addListener(executeCommand)

// listen for messages from content script
chrome.runtime.onMessage.addListener(onRuntimeMessage)

// context-click on chrome.action displays more options
chrome.contextMenus.removeAll()

chrome.contextMenus.create({
  id: 'open-preferences-menu-item',
  title: 'Customize Shortcuts',
  contexts: ['action']
})

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case 'open-preferences-menu-item':
      chrome.runtime.openOptionsPage()
        .catch((err) => {
          console.error('runtime.openOptionsPage() failed, opening options page in tab instead.', err)
          chrome.tabs.create({ url: chrome.runtime.getURL('options.html') })
        })
      break
  }
})
