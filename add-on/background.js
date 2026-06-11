'use strict'
/* eslint-env chrome, webextensions */
const youtubeMusicPlayerUrl = 'https://music.youtube.com/*'

async function youTubeMusicScriptThatClicksOn (actionName) {
  const qs = (q) => document.querySelector(q)

  const findButton = (action) => {
    switch (action) {
      case 'previous-song':
        return qs('.ytmusic-player-bar.previous-button') || qs('.previous-button')
      case 'next-song':
        return qs('.ytmusic-player-bar.next-button') || qs('.next-button')
      case 'toggle-playback':
        return qs('.ytmusic-player-bar.play-pause-button') || qs('.play-pause-button') || document.getElementById('play-button')
    }
  }  
  
  if (actionName === 'volume-up' || actionName === 'volume-down') {
    const slider = document.querySelector('.ytmusic-player-bar.volume-slider')
    const volumeChange = actionName === 'volume-up' ? 5 : -5
    const currentVolume = parseInt(slider.getAttribute('value')) || 0
    slider.setAttribute('value', Math.min(100, Math.max(0, currentVolume + volumeChange)))
    slider.dispatchEvent(new CustomEvent('immediate-value-change', { bubbles: true }));
    slider.dispatchEvent(new CustomEvent('value-change', { bubbles: true }));
    return
  }

  findButton(actionName)?.click()
}

async function executeCommand (command) {
  console.log('[YouTube Music Hotkeys] executing command: ', command)
  const ymTabs = await chrome.tabs.query({ url: youtubeMusicPlayerUrl })

  if (ymTabs.length === 0) {
    return
  }

  for (const tab of ymTabs) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: youTubeMusicScriptThatClicksOn,
      args: [command]
    })
  }
}

async function onRuntimeMessage (request, sender) {
  console.log('[YouTube Music Hotkeys] onRuntimeMessage', request)
  await chrome.scripting.executeScript({
    target: { tabId: sender.tab.id },
    func: youTubeMusicScriptThatClicksOn,
    args: [request.command]
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
