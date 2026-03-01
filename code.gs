/**
 * 造型中餐點餐系統 - Discord 彩色卡片版 (2026.03.01)
 */

// --- 0. 設定區 ---
const LUNCH_WEBHOOK_URL = "https://discord.com/api/webhooks/1477469254625525972/kJuKA9eWIuCGiKFV5hSzPaeZYS4qEnZJKvEYLna-dLVVb1razLi5qR3R80ddJSQ2D8W-";

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🍱 中餐系統管理')
      .addItem('📢 啟動系統 (設為開啟)', 'manualOpen')
      .addItem('🛑 關閉系統 (設為關閉)', 'manualClose')
      .addSeparator()
      .addItem('🔙 撤銷最後一筆訂單 (主揪用)', 'deleteLastOrderManually')
      .addSeparator()
      .addItem('⚙️ 設定自動定時任務', 'setupMainTrigger')
      .addToUi();
}

/**
 * 核心通知函式：發送彩色卡片
 * @param {Object} embedData 卡片內容物件
 */
function sendDiscordEmbed(embedData) {
  if (!LUNCH_WEBHOOK_URL || LUNCH_WEBHOOK_URL.indexOf("http") === -1) return;
  
  const payload = {
    "embeds": [{
      "title": embedData.title,
      "description": embedData.description || "",
      "color": embedData.color || 3066993, // 預設綠色
      "fields": embedData.fields || [],
      "footer": { "text": "⌚ 時間：" + new Date().toLocaleString() }
    }]
  };
  
  const options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload)
  };
  
  try {
    UrlFetchApp.fetch(LUNCH_WEBHOOK_URL, options);
  } catch (e) {
    console.error("Discord 通知失敗：" + e.toString());
  }
}

// --- 1. 網頁 API ---
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const menuSheet = ss.getSheetByName('Menu');
  const day = new Date().getDay();
  const status = menuSheet.getRange('E2').getValue();
  const restaurant = menuSheet.getRange('G2').getValue();
  
  if (status !== "開啟" && (day === 0 || day === 6)) {
    return ContentService.createTextOutput(JSON.stringify({ status: "關閉", restaurant: "週末休息中", menu: [] })).setMimeType(ContentService.MimeType.JSON);
  }
  const menuData = getMenu();
  return ContentService.createTextOutput(JSON.stringify({ status: status, restaurant: restaurant, menu: menuData })).setMimeType(ContentService.MimeType.JSON);
}

// --- 2. 訂單處理 ---
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Orders');
    
    // --- A. 撤回邏輯 ---
    if (data.action === "delete") {
      const rows = sheet.getDataRange().getValues();
      const userName = data.userName.trim();
      for (let i = rows.length - 1; i >= 1; i--) {
        if (rows[i][1].toString().replace(/'/g, "") === userName) {
          const deletedItem = rows[i][2];
          sheet.deleteRow(i + 1);
          
          sendDiscordEmbed({
            "title": "🔙 【午餐撤回通知】",
            "color": 15158332, // 紅色
            "description": "有一份思念已被撤回...",
            "fields": [
              { "name": "👤 姓名", "value": userName, "inline": true },
              { "name": "🍽️ 品項", "value": deletedItem, "inline": true }
            ]
          });
          
          return ContentService.createTextOutput(JSON.stringify({ "result": "已成功撤回您的最後一筆訂單！" })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ "result": "找不到訂單。" })).setMimeType(ContentService.MimeType.JSON);
    }

    // --- B. 新增訂單邏輯 ---
    const price = Number(data.price);
    const qty = Number(data.quantity);
    if (price % 1 !== 0 && qty % 2 !== 0) {
      return ContentService.createTextOutput(JSON.stringify({ "result": "下單失敗：單價含 0.5 元，數量請點「雙數」。" })).setMimeType(ContentService.MimeType.JSON);
    }

    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const existingData = sheet.getRange(2, 2, lastRow - 1, 2).getValues();
      for (let i = existingData.length - 1; i >= 0; i--) {
        if (existingData[i][0] == data.userName && existingData[i][1] == data.item) {
          sheet.deleteRow(i + 2);
        }
      }
    }

    sheet.appendRow([new Date(), "'" + data.userName, data.item, price, qty, data.hasPaid ? "是" : "否", data.receivedAmount || 0, data.note]);
    
    // 🚀 傳送彩色卡片通知
    sendDiscordEmbed({
      "title": "🍱 【午餐新訂單】",
      "color": 3066993, // 綠色
      "fields": [
        { "name": "👤 訂購人", "value": data.userName, "inline": true },
        { "name": "🍽️ 品項", "value": data.item + " x " + qty, "inline": true },
        { "name": "💰 小計", "value": "$" + (price * qty), "inline": true },
        { "name": "📝 備註", "value": data.note || "無" }
      ]
    });
    
    return ContentService.createTextOutput(JSON.stringify({ "result": "下單成功！" })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "錯誤：" + err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

// --- 3. 輔助函式與手動管理 ---
function getMenu() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Menu');
  const data = sheet.getDataRange().getValues();
  data.shift(); 
  return data;
}

function manualOpen() {
  const restaurant = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Menu').getRange('G2').getValue();
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Menu').getRange('E2').setValue('開啟');
  sendDiscordEmbed({
    "title": "📢 【午餐系統手動啟動】",
    "color": 3447003, // 藍色
    "description": "今日店家：**" + restaurant + "**\n大家可以開始點餐囉！"
  });
}

function manualClose() {
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Menu').getRange('E2').setValue('關閉');
  sendDiscordEmbed({
    "title": "🛑 【午餐系統手動截止】",
    "color": 15105570, // 橘色
    "description": "今日點餐已關閉，準備訂餐去囉～"
  });
}

function deleteLastOrderManually() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Orders");
  if (sheet.getLastRow() >= 2) {
    sheet.deleteRow(sheet.getLastRow());
    SpreadsheetApp.getUi().alert('已刪除最後一筆訂單。');
  }
}

// --- 4. 自動化定時任務 ---
function setupMainTrigger() {
  const allTriggers = ScriptApp.getProjectTriggers();
  allTriggers.forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('archiveOnly').timeBased().everyDays(1).atHour(17).create();
  ScriptApp.newTrigger('openSystemOnly').timeBased().everyDays(1).atHour(7).create();
  SpreadsheetApp.getUi().alert("自動排程設定完成。");
}

function openSystemOnly() {
  const day = new Date().getDay(); 
  if (day >= 1 && day <= 5) {
    const restaurant = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Menu').getRange('G2').getValue();
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Menu').getRange('E2').setValue('開啟');
    sendDiscordEmbed({
      "title": "📢 【午餐定時開啟】",
      "color": 3447003,
      "description": "今日店家：**" + restaurant + "**\n請在 **08:45** 前完成點餐！"
    });
    const today = new Date();
    const closeTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 45);
    ScriptApp.newTrigger('autoCloseSystem').timeBased().at(closeTime).create();
  }
}

function autoCloseSystem() {
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Menu').getRange('E2').setValue('關閉');
  sendDiscordEmbed({
    "title": "🛑 【午餐定時截止】",
    "color": 15105570,
    "description": "點餐時間已到，系統已自動關閉。"
  });
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => { if(t.getHandlerFunction() === 'autoCloseSystem') ScriptApp.deleteTrigger(t); });
}

function archiveOnly() {
  const day = new Date().getDay();
  if (day === 0 || day === 6) return;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const o = ss.getSheetByName("Orders"), h = ss.getSheetByName("History");
  if (o.getLastRow() < 2) return;
  const d = o.getRange(2, 1, o.getLastRow() - 1, 8).getValues();
  const historyData = d.map(row => [...row, new Date().toLocaleDateString()]);
  h.getRange(h.getLastRow() + 1, 1, historyData.length, 9).setValues(historyData);
  o.getRange(2, 1, o.getLastRow() - 1, 8).clearContent();
}
