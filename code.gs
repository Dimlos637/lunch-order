/**
 * 造型中餐點餐系統 - 最終安全強化版
 * 更新日期：2026.03.16
 * ⚠ 注意：請確保已在「專案設定」中新增 LUNCH_WEBHOOK 屬性
 */

// 🔒 從系統屬性讀取 Webhook 網址，避免程式碼外洩風險
const LUNCH_WEBHOOK_URL = PropertiesService.getScriptProperties().getProperty('LUNCH_WEBHOOK');

/**
 * 建立試算表選單
 */
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
 * 發送 Discord 彩色卡片核心函式
 */
function sendDiscordEmbed(embedData) {
  if (!LUNCH_WEBHOOK_URL || LUNCH_WEBHOOK_URL.indexOf("http") === -1) {
    Logger.log("❌ 錯誤：找不到有效的 LUNCH_WEBHOOK。請檢查專案設定。");
    return;
  }
  
  const payload = {
    "embeds": [{
      "title": embedData.title,
      "description": embedData.description || "",
      "color": embedData.color || 3066993, 
      "fields": embedData.fields || [],
      "footer": { "text": "⌚ 伺服器時間：" + new Date().toLocaleString() }
    }]
  };
  
  const options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true // 允許查看詳細錯誤
  };
  
  try {
    const response = UrlFetchApp.fetch(LUNCH_WEBHOOK_URL, options);
    Logger.log("Discord 回傳結果：" + response.getContentText());
  } catch (e) {
    Logger.log("Discord 通知失敗：" + e.toString());
  }
}

// --- 1. 前端連線 API (doGet) ---
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const menuSheet = ss.getSheetByName('Menu');
  const day = new Date().getDay();
  const status = menuSheet.getRange('E2').getValue().toString().trim();
  const restaurant = menuSheet.getRange('G2').getValue().toString().trim();
  
  // 週末自動休息判定
  if (status !== "開啟" && (day === 0 || day === 6)) {
    return ContentService.createTextOutput(JSON.stringify({ status: "關閉", restaurant: "週末休息中", menu: [] })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const menuData = getMenu();
  return ContentService.createTextOutput(JSON.stringify({ status: status, restaurant: restaurant, menu: menuData })).setMimeType(ContentService.MimeType.JSON);
}

// --- 2. 接收下單/撤回 API (doPost) ---
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Orders');
    
    // --- 撤回模式 ---
    if (data.action === "delete") {
      const rows = sheet.getDataRange().getValues();
      const userName = data.userName.trim();
      for (let i = rows.length - 1; i >= 1; i--) {
        if (rows[i][1].toString().replace(/'/g, "") === userName) {
          const deletedItem = rows[i][2];
          sheet.deleteRow(i + 1);
          
          sendDiscordEmbed({
            "title": "🔙 【午餐撤回通知】",
            "color": 15158332, 
            "description": "訂單已被使用者撤回。",
            "fields": [
              { "name": "👤 姓名", "value": userName, "inline": true },
              { "name": "🍽️ 品項", "value": deletedItem, "inline": true }
            ]
          });
          return ContentService.createTextOutput(JSON.stringify({ "result": "已成功撤回訂單！" })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ "result": "找不到您的訂單。" })).setMimeType(ContentService.MimeType.JSON);
    }

    // --- 下單模式 ---
    const price = Number(data.price);
    const qty = Number(data.quantity);
    
    // 0.5 元防呆
    if (price % 1 !== 0 && qty % 2 !== 0) {
      return ContentService.createTextOutput(JSON.stringify({ "result": "下單失敗：0.5元品項請點雙數。" })).setMimeType(ContentService.MimeType.JSON);
    }

    // 檢查並覆蓋同人同品項的舊單
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
    
    sendDiscordEmbed({
      "title": "🍱 【午餐新訂單】",
      "color": 3066993,
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

// --- 3. 管理功能 ---
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
    "color": 3447003,
    "description": "今日店家：**" + restaurant + "**\n開放點餐中！"
  });
}

function manualClose() {
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Menu').getRange('E2').setValue('關閉');
  sendDiscordEmbed({
    "title": "🛑 【午餐系統手動截止】",
    "color": 15105570,
    "description": "點餐已截止，準備向餐廳訂購。"
  });
}

function deleteLastOrderManually() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Orders");
  if (sheet.getLastRow() >= 2) {
    sheet.deleteRow(sheet.getLastRow());
    SpreadsheetApp.getUi().alert('已刪除最後一筆訂單。');
  }
}

// --- 4. 自動化排程 ---
function setupMainTrigger() {
  const allTriggers = ScriptApp.getProjectTriggers();
  allTriggers.forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('archiveOnly').timeBased().everyDays(1).atHour(17).create();
  ScriptApp.newTrigger('openSystemOnly').timeBased().everyDays(1).atHour(7).create();
  SpreadsheetApp.getUi().alert("✅ 排程設定成功：每日 07:00 開啟、17:00 歸檔。");
}

function openSystemOnly() {
  const day = new Date().getDay(); 
  if (day >= 1 && day <= 5) {
    const restaurant = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Menu').getRange('G2').getValue();
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Menu').getRange('E2').setValue('開啟');
    sendDiscordEmbed({
      "title": "📢 【午餐定時開啟】",
      "color": 3447003,
      "description": "今日店家：**" + restaurant + "**\n請在 08:45 前下單。"
    });
    // 設定 08:45 自動關閉
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
    "description": "點餐截止，系統已自動關閉。"
  });
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => { if(t.getHandlerFunction() === 'autoCloseSystem') ScriptApp.deleteTrigger(t); });
}

function archiveOnly() {
  const day = new Date().getDay();
  if (day === 0 || day === 6) return; // 週末不歸檔
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const o = ss.getSheetByName("Orders"), h = ss.getSheetByName("History");
  if (o.getLastRow() < 2) return;
  const d = o.getRange(2, 1, o.getLastRow() - 1, 8).getValues();
  const historyData = d.map(row => [...row, new Date().toLocaleDateString()]);
  h.getRange(h.getLastRow() + 1, 1, historyData.length, 9).setValues(historyData);
  o.getRange(2, 1, o.getLastRow() - 1, 8).clearContent();
}
function debugConnection() {
  const url = PropertiesService.getScriptProperties().getProperty('LUNCH_WEBHOOK');
  
  if (!url) {
    Logger.log("❌ 錯誤：找不到名為 LUNCH_WEBHOOK 的屬性。請檢查專案設定。");
    return;
  }
  
  Logger.log("✅ 成功讀取屬性，網址長度為：" + url.length);
  Logger.log("網址開頭：" + url.substring(0, 30) + "...");
  
  try {
    sendDiscordEmbed({
      "title": "⚡ 系統連線測試",
      "description": "如果你看到這則訊息，代表 Webhook 對接成功！"
    });
    Logger.log("🚀 已嘗試發送測試訊號，請查看 Discord。");
  } catch(e) {
    Logger.log("❌ 傳送失敗，原因：" + e.toString());
  }
}
