/**
 * 訂餐系統完整腳本 (2026.02.26 支援一人多品項版)
 * 包含：API 介面、上班日自動開關、重複品項覆蓋、每日自動存檔
 */

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const menuSheet = ss.getSheetByName('Menu');
  const status = menuSheet.getRange('E2').getValue();
  const restaurant = menuSheet.getRange('G2').getValue();
  const menuData = getMenu();
  
  return ContentService.createTextOutput(JSON.stringify({ 
    status: status, 
    restaurant: restaurant, 
    menu: menuData 
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Orders');
    
    // --- 核心修正：檢查「姓名」+「品項」的組合 ---
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      // 取得 B 欄(姓名) 與 C 欄(品項)
      const existingData = sheet.getRange(2, 2, lastRow - 1, 2).getValues();
      for (let i = existingData.length - 1; i >= 0; i--) {
        // 同時符合 姓名 與 品項，才視為「修改訂單」進行刪除
        if (existingData[i][0] == data.userName && existingData[i][1] == data.item) {
          sheet.deleteRow(i + 2);
        }
      }
    }
    // ------------------------------------------

    // 寫入新訂單 (姓名加單引號強制轉文字)
    sheet.appendRow([
      new Date(),
      "'" + data.userName, 
      data.item,
      Number(data.price),
      Number(data.quantity),
      data.hasPaid ? "是" : "否", 
      data.receivedAmount || 0, 
      data.note
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ "result": "下單成功！已記錄您的品項。" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "錯誤：" + err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getMenu() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Menu');
  const data = sheet.getDataRange().getValues();
  data.shift(); 
  return data;
}

/**
 * 核心功能：存檔並清空今日訂單
 */
function archiveAndReset() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const orderSheet = ss.getSheetByName("Orders");
  const historySheet = ss.getSheetByName("History");
  
  if (!historySheet) return;

  const lastRow = orderSheet.getLastRow();
  if (lastRow < 2) return; 
  
  const data = orderSheet.getRange(2, 1, lastRow - 1, 8).getValues();
  const today = new Date().toLocaleDateString(); 
  const historyData = data.map(row => [...row, today]);
  
  historySheet.getRange(historySheet.getLastRow() + 1, 1, historyData.length, 9).setValues(historyData);
  orderSheet.getRange(2, 1, lastRow - 1, 8).clearContent();
  console.log("舊資料已存檔並清理完畢。");
}

/**
 * 系統自動化管理
 */
function autoOpenSystem() {
  const today = new Date();
  const dayOfWeek = today.getDay(); 
  
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    archiveAndReset(); // 開啟前先歸檔昨天的
    const menuSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Menu');
    menuSheet.getRange('E2').setValue('開啟');
    createSpecificCloseTrigger();
  }
}

function autoCloseSystem() {
  const menuSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Menu');
  menuSheet.getRange('E2').setValue('關閉');
}

function createSpecificCloseTrigger() {
  const allTriggers = ScriptApp.getProjectTriggers();
  allTriggers.forEach(t => { 
    if(t.getHandlerFunction() === 'autoCloseSystem') ScriptApp.deleteTrigger(t); 
  });
  const today = new Date();
  const closeTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 45);
  ScriptApp.newTrigger('autoCloseSystem').timeBased().at(closeTime).create();
}

function setupMainTrigger() {
  const allTriggers = ScriptApp.getProjectTriggers();
  allTriggers.forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('autoOpenSystem').timeBased().everyDays(1).atHour(7).create();
  SpreadsheetApp.getUi().alert("主觸發器設定成功！支援一人多品項模式。");
}
