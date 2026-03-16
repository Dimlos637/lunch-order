🍱 Office Order System (GAS + Discord)
造型中餐與飲料自動化點餐解決方案

這是一套基於 Google Apps Script (GAS) 的辦公室點餐工具。透過 「程式邏輯與密鑰分離」 規範，確保系統在 GitHub 開源狀態下依然保有高度資安水準。

🚀 系統核心功能
🔒 資安強化：Webhook 網址透過 Script Properties 加密，程式碼無洩漏風險。

🎨 視覺通知：對接 Discord Webhook，發送不同狀態的彩色卡片 (Embeds)。

📅 全自動化：每日 07:00 開啟、08:45 截止、17:00 歸檔，無需人工介入。

🛠️ 邏輯防呆：支援中餐「0.5元雙數檢查」及飲料「高單價加料免費」邏輯。

⚡ 趣味互動：內建「命運之雷」隨機點餐（支援手機震動）及 VVIP 模式。

⚙️ 快速部屬指南
1. 後端 (GAS)
分頁設定：試算表需具備 Menu, Orders, History, VVIP。

安全性配置 (必做)：

進入 GAS 「專案設定 (⚙️)」 > 「指令碼屬性」。

新增 LUNCH_WEBHOOK 或 DRINK_WEBHOOK 並填入 Discord 網址。

權限與排程：

執行 onOpen 產生選單。

執行 setupMainTrigger 啟動每日自動任務。

部署為「網頁應用程式」，並設定為「所有人 (Anyone)」可存取。

2. 前端 (GitHub Pages)
將 index.html 中的 CONFIG.GAS_API 修改為你部署後取得的 URL。

開啟 GitHub Pages 託管即可使用。

📂 檔案架構
Code.gs：後端邏輯與 Discord 通訊 (Secrets Management)。

index.html：前端 Responsive UI (支援手機震動特效)。

README.md：本說明文件。

💡 管理須知
收單時間：預設週一至週五 07:00 ~ 08:45。

修改訂單：系統支援重複下單自動覆蓋，或由使用者自行「撤回訂單」。

手動干預：主揪可透過試算表上方選單手動「開啟/關閉」或「結算歸檔」。

🔒 隱私聲明：本專案已移除所有硬編碼網址。請開發者切勿將 Webhook 網址寫入 Code.gs，務必使用 GAS 指令碼屬性進行管理。

Made with ❤️ by Dimlos Liu
