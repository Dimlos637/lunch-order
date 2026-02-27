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
    
    // 0.5元防呆：單價含 .5 者，數量須為雙數
    const price = Number(data.price);
    const qty = Number(data.quantity);
    
    if (price % 1 !== 0 && qty % 2 !== 0) {
      return ContentService.createTextOutput(JSON.stringify({ 
        "result": "下單失敗：單價為 " + price + " 元，數量請點「雙數」以利收費找零。" 
      })).setMimeType(ContentService.MimeType.JSON);
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

    sheet.appendRow([
      new Date(),
      "'" + data.userName, 
      data.item,
      price,
      qty,
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

function archiveOnly() {
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

function openSystemOnly() {
  const day = new Date().getDay(); 
  if (day >= 1 && day <= 5) {
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
  
  ScriptApp.newTrigger('archiveOnly').timeBased().everyDays(1).atHour(17).create();
  ScriptApp.newTrigger('openSystemOnly').timeBased().everyDays(1).atHour(7).create();
  
  SpreadsheetApp.getUi().alert("設定完成：早上 07:00 開啟，下午 17:00 歸檔。");
}
