# lunch-order
🍱 辦公室自動化點餐系統：中餐與飲料雙系統 (GAS 版)
這是一套基於 Google Apps Script (GAS)、Google Sheets 與 Discord Webhook 開發的自動化點餐解決方案。包含「造型中餐」與「命運之雷飲料」兩大系統。

🚀 系統亮點
安全防護：核心 Webhook 網址透過 Script Properties 加密，代碼上傳 GitHub 無洩漏風險。

Discord 視覺化：根據點餐狀態（啟動/下單/撤回/VVIP）發送不同顏色的 Rich Embeds 卡片。

自動排程：每日定時開啟點餐、自動截止並於傍晚自動歸檔當日數據。

防呆機制：中餐具備「0.5元雙數檢查」；飲料系統具備「高單價加料免費」邏輯。

趣味功能：飲料系統內建「命運之雷」隨機選單與「VVIP 老大請客」特效模式。

🛠️ 安裝與部屬說明
1. 後端設定 (Google Apps Script)
建立 Google 試算表，並根據系統需求建立 Menu, Orders, History (及飲料版的 VVIP) 分頁。

在 GAS 編輯器中貼入本專案提供的 main.gs。

安全性配置 (關鍵)：

點擊 GAS 左側 專案設定 (⚙️)。

在「指令碼屬性」中新增：

中餐系統：屬性 LUNCH_WEBHOOK / 值 你的Discord網址

飲料系統：屬性 DRINK_WEBHOOK / 值 你的Discord網址

執行 onOpen 函式以產生管理選單，並執行 setupMainTrigger 設定自動定時器。

2. 前端部屬 (GitHub Pages)
開啟 index.html。

修改 CONFIG 物件中的 GAS_API，填入你「部署為網頁應用程式」取得的 URL。

將檔案 Push 至 GitHub 並開啟 GitHub Pages 功能。

📂 檔案結構
main.gs：核心邏輯處理、Discord 通訊與試算表讀寫。

index.html：使用者前端介面 (Responsive Design)。

README.md：本說明文件。

🔒 隱私與安全性
本專案已實施 Secrets Management 規範。開發者不應將包含私密 Webhook 網址的程式碼直接 Push 至版本控制系統中。請務必透過 GAS 原生的環境變數（Script Properties）進行管理。

💡 使用說明
點餐時間：週一至週五 07:00 ~ 08:45。

修改/取消：系統支援重複下單自動覆蓋，或由使用者自行輸入姓名進行「訂單撤回」。

主揪管理：可透過試算表上方的「🍱 中餐系統管理」或「☕ 飲料系統管理」手動控制系統開關。

🌟 Dimlos 的專案小記
這是我針對辦公室日常需求開發的自動化工具。如果你覺得這套系統有趣或有幫助，歡迎給我一個 Star！
