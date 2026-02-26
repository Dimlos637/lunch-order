/**
 * 訂餐系統完整腳本 (2026.02.26 下午維護版)
 * 包含：API 介面、一人多品項覆蓋、每日 17:00-18:00 自動存檔並開啟明天系統
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
    
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const existingData = sheet.getRange(2, 2, lastRow - 1, 2).getValues();
      for (let i = existingData.length - 1; i >= 0; i--) {
        if (existingData[i][0] == data.userName && existingData[i][1] == data.item) {
          sheet.deleteRow(i + 2);
        }
      }
    }

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
    
    return ContentService.createTextOutput(JSON.stringify({ "result": "下單成功！" }))
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
}

function dailySystemMaintenance() {
  const today = new Date();
  const dayOfWeek = today.getDay(); 
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    archiveAndReset();
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
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const closeTime = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 8, 45);
  ScriptApp.newTrigger('autoCloseSystem').timeBased().at(closeTime).create();
}

function setupMainTrigger() {
  const allTriggers = ScriptApp.getProjectTriggers();
  allTriggers.forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('dailySystemMaintenance').timeBased().everyDays(1).atHour(17).create();
  SpreadsheetApp.getUi().alert("設定成功！系統將在每日 17:00-18:00 自動存檔並開啟隔天點餐。");
}
