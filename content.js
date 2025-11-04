// IndexedDB Editor - 页面覆盖层实现
(function () {
  "use strict";

  class IndexedDBEditor {
    constructor() {
      this.databases = [];
      this.currentDB = null;
      this.currentStore = null;
      this.currentKeyPath = null;
      this.records = [];
      this.filteredRecords = [];
      this.editingRecord = null;
      this.selectedRecord = null;
      this.statusTimeout = null;

      this.createUI();
      this.bindEvents();
    }

    createUI() {
      // 创建覆盖层
      const overlay = document.createElement("div");
      overlay.id = "indexeddb-editor-overlay";
      overlay.innerHTML = `
        <div id="indexeddb-editor-panel">
          <div id="indexeddb-editor-header">
            <h3 id="indexeddb-editor-title">IndexedDB Editor</h3>
            <button id="indexeddb-editor-close">×</button>
          </div>
          <div id="indexeddb-editor-content">
            <div id="indexeddb-editor-sidebar">
              <div class="indexeddb-section">
                <div class="indexeddb-section-title">Databases</div>
                <div class="indexeddb-list" id="indexeddb-databases"></div>
              </div>
              <div class="indexeddb-section">
                <div class="indexeddb-section-title">Object Stores</div>
                <div class="indexeddb-list" id="indexeddb-stores"></div>
              </div>
            </div>
            <div id="indexeddb-editor-main">
              <div id="indexeddb-editor-main-content">
                <!-- 记录列表视图 -->
                <div id="indexeddb-editor-records-list" class="indexeddb-view">
                  <div id="indexeddb-search-container">
                    <input type="text" id="indexeddb-search-input" placeholder="Search by key...">
                  </div>
                  <div class="indexeddb-toolbar">
                    <div class="indexeddb-toolbar-left">
                      <span class="indexeddb-count" id="indexeddb-record-count">0 records</span>
                    </div>
                    <div class="indexeddb-toolbar-right">
                      <button class="indexeddb-btn small" id="indexeddb-refresh-btn">Refresh</button>
                      <button class="indexeddb-btn small" id="indexeddb-add-btn">Add Record</button>
                    </div>
                  </div>
                  <div id="indexeddb-records-container">
                    <table class="indexeddb-records-table">
                      <thead>
                        <tr>
                          <th>Key</th>
                          <th>Type</th>
                          <th>Size</th>
                        </tr>
                      </thead>
                      <tbody id="indexeddb-records-tbody">
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <!-- 记录详情视图 -->
                <div id="indexeddb-editor-record-detail" class="indexeddb-view">
                  <div class="indexeddb-detail-header">
                    <div class="indexeddb-detail-title" id="indexeddb-detail-title">Record Details</div>
                    <div class="indexeddb-detail-actions">
                      <button class="indexeddb-btn small" id="indexeddb-back-btn">← Back to List</button>
                      <button class="indexeddb-btn small" id="indexeddb-edit-btn">Edit</button>
                      <button class="indexeddb-btn small danger" id="indexeddb-detail-delete-btn">Delete</button>
                    </div>
                  </div>
                  <div class="indexeddb-detail-content" id="indexeddb-detail-content">
                    <pre><code class="language-json"></code></pre>
                  </div>
                </div>
              </div>
              
              
            </div>
          </div>
          

          <!-- 编辑模态框 -->
          <div id="indexeddb-editor-edit-modal">
            <div id="indexeddb-editor-edit-panel">
              <div id="indexeddb-editor-edit-header">Edit Record</div>
              <textarea id="indexeddb-editor-textarea" placeholder="Edit JSON data here..."></textarea>
              <input type="file" id="indexeddb-import-file-input" style="display: none;" accept=".json,text/plain">
              <div id="indexeddb-editor-edit-actions">
                <button class="indexeddb-btn" id="indexeddb-save-btn">Save</button>
                <button class="indexeddb-btn" id="indexeddb-download-btn">Download</button>
                <button class="indexeddb-btn" id="indexeddb-import-btn">Import</button>
                <button class="indexeddb-btn danger" id="indexeddb-delete-btn">Delete</button>
                <button class="indexeddb-btn" id="indexeddb-cancel-btn">Cancel</button>
              </div>
            </div>
          </div>
        </div>
          <!-- Toast通知容器 -->
          <div id="indexeddb-toast-container"></div>
      `;

      document.body.appendChild(overlay);
      this.overlay = overlay;
    }

    bindEvents() {
      // 关闭按钮
      document
        .getElementById("indexeddb-editor-close")
        .addEventListener("click", () => {
          this.hide();
        });

      // 点击覆盖层关闭
      this.overlay.addEventListener("click", (e) => {
        if (e.target === this.overlay) {
          this.hide();
        }
      });

      // 数据库选择
      document
        .getElementById("indexeddb-databases")
        .addEventListener("click", (e) => {
          if (e.target.classList.contains("indexeddb-item")) {
            this.selectDatabase(e.target.dataset.dbName);
          }
        });

      // 对象存储选择
      document
        .getElementById("indexeddb-stores")
        .addEventListener("click", (e) => {
          if (e.target.classList.contains("indexeddb-item")) {
            this.selectStore(e.target.dataset.storeName);
          }
        });

      // 搜索框
      document
        .getElementById("indexeddb-search-input")
        .addEventListener("input", (e) => {
          this.filterRecords(e.target.value);
        });

      // 工具栏按钮
      document
        .getElementById("indexeddb-refresh-btn")
        .addEventListener("click", () => {
          this.selectStore(this.currentStore);
        });

      document
        .getElementById("indexeddb-add-btn")
        .addEventListener("click", () => {
          this.addNewRecord();
        });

      // 详情视图按钮
      document
        .getElementById("indexeddb-back-btn")
        .addEventListener("click", () => {
          this.showRecordsList();
        });

      document
        .getElementById("indexeddb-edit-btn")
        .addEventListener("click", () => {
          this.editCurrentRecord();
        });

      document
        .getElementById("indexeddb-detail-delete-btn")
        .addEventListener("click", () => {
          this.deleteCurrentRecord();
        });

      // 编辑模态框事件
      document
        .getElementById("indexeddb-save-btn")
        .addEventListener("click", () => {
          this.saveRecord();
        });

      document
        .getElementById("indexeddb-download-btn")
        .addEventListener("click", () => {
          this.downloadRecord();
        });

      document
        .getElementById("indexeddb-import-btn")
        .addEventListener("click", () => {
          document.getElementById("indexeddb-import-file-input").click();
        });

      document
        .getElementById("indexeddb-import-file-input")
        .addEventListener("change", (e) => {
          this.importRecord(e);
        });

      document
        .getElementById("indexeddb-delete-btn")
        .addEventListener("click", () => {
          this.deleteRecord();
        });

      document
        .getElementById("indexeddb-cancel-btn")
        .addEventListener("click", () => {
          this.hideEditModal();
        });

      // ESC键关闭
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.isVisible()) {
          this.hide();
        }
      });
    }

    async show() {
      this.overlay.style.display = "block";
      await this.loadDatabases();
      return Promise.resolve();
    }

    hide() {
      this.overlay.style.display = "none";
      this.hideEditModal();
      // Reset the state to ensure a clean open next time
      this.currentDB = null;
      this.currentStore = null;
      this.records = [];
      this.filteredRecords = [];
      this.selectedRecord = null;
      document.getElementById("indexeddb-databases").innerHTML = "";
      document.getElementById("indexeddb-stores").innerHTML = "";
      document.getElementById("indexeddb-records-tbody").innerHTML = "";
      document.getElementById("indexeddb-record-count").textContent =
        "0 records";
      this.showToast("Ready to browse IndexedDB");
    }

    isVisible() {
      return this.overlay.style.display === "block";
    }

    setStatus(message, isTemporary = false) {
      const statusEl = document.getElementById("indexeddb-editor-status");
      statusEl.textContent = message;
      statusEl.style.display = "block";

      if (this.statusTimeout) {
        clearTimeout(this.statusTimeout);
      }

      if (isTemporary) {
        this.statusTimeout = setTimeout(() => {
          statusEl.style.display = "none";
        }, 3000); // 3秒后自动消失
      }
    }

    showRecordsList() {
      this.hideAllViews();
      document.getElementById("indexeddb-editor-records-list").style.display =
        "flex";
      this.selectedRecord = null;
    }

    showRecordDetail(record) {
      this.hideAllViews();
      document.getElementById("indexeddb-editor-record-detail").style.display =
        "flex";
      this.selectedRecord = record;

      document.getElementById(
        "indexeddb-detail-title"
      ).textContent = `Record: ${record.key}`;

      // Sort the keys of the data object
      const sortedData = {};
      const keys = Object.keys(record.data).sort((a, b) => {
        if (a === "data") return 1;
        if (b === "data") return -1;
        return a.localeCompare(b);
      });

      for (const key of keys) {
        sortedData[key] = record.data[key];
      }

      const codeElement = document.querySelector(
        "#indexeddb-detail-content code"
      );
      codeElement.textContent = JSON.stringify(sortedData, null, 2);
      codeElement.dataset.highlighted = "";

      // 使用highlight.js进行高亮
      if (window.hljs) {
        window.hljs.highlightElement(codeElement);
      }
    }

    hideAllViews() {
      const views = document.querySelectorAll(".indexeddb-view");
      views.forEach((view) => (view.style.display = "none"));
    }

    async loadDatabases() {
      try {
        if (!window.indexedDB) {
          this.showToast("IndexedDB not supported in this browser");
          this.renderDatabases(); // 清空数据库列表
          return;
        }

        if (!indexedDB.databases) {
          this.showToast(
            "Cannot enumerate databases (limited browser support)"
          );
          this.renderDatabases(); // 清空数据库列表
          return;
        }

        this.databases = await indexedDB.databases();
        this.renderDatabases();

        if (this.databases.length === 0) {
          this.showToast("No IndexedDB databases found on this page");
        } else {
          this.showToast(`Found ${this.databases.length} database(s)`);
        }
      } catch (error) {
        this.showToast("Error loading databases: " + error.message);
        this.renderDatabases(); // 清空数据库列表
      }
    }

    renderDatabases() {
      const container = document.getElementById("indexeddb-databases");
      container.innerHTML = "";

      this.databases.forEach((db) => {
        const item = document.createElement("div");
        item.className = "indexeddb-item";
        item.dataset.dbName = db.name;
        item.textContent = `${db.name} (v${db.version})`;
        container.appendChild(item);
      });
    }

    async selectDatabase(dbName) {
      return new Promise((resolve, reject) => {
        try {
          this.currentDB = dbName;
          this.clearSelection("indexeddb-databases");
          this.selectItem("indexeddb-databases", dbName);

          const request = indexedDB.open(dbName);
          request.onsuccess = () => {
            const db = request.result;
            const stores = Array.from(db.objectStoreNames);
            this.renderStores(stores);
            db.close();
            this.showToast(`Selected database: ${dbName}`);
            resolve();
          };

          request.onerror = () => {
            this.showToast("Error opening database: " + request.error.message);
            reject(request.error);
          };
        } catch (error) {
          this.showToast("Error selecting database: " + error.message);
          reject(error);
        }
      });
    }

    renderStores(stores) {
      const container = document.getElementById("indexeddb-stores");
      container.innerHTML = "";

      stores.forEach((storeName) => {
        const item = document.createElement("div");
        item.className = "indexeddb-item";
        item.dataset.storeName = storeName;
        item.textContent = storeName;
        container.appendChild(item);
      });
    }

    async selectStore(storeName) {
      return new Promise((resolve, reject) => {
        try {
          this.currentStore = storeName;
          this.clearSelection("indexeddb-stores");
          this.selectItem("indexeddb-stores", storeName);

          const request = indexedDB.open(this.currentDB);
          request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction([storeName], "readonly");
            const store = transaction.objectStore(storeName);
            const records = [];

            this.currentKeyPath = store.keyPath;

            // 使用游标来获取所有记录和主键
            const cursorRequest = store.openCursor();
            cursorRequest.onsuccess = (event) => {
              const cursor = event.target.result;
              if (cursor) {
                records.push({
                  primaryKey: cursor.primaryKey,
                  key: cursor.key,
                  data: cursor.value,
                  type: this.getDataType(cursor.value),
                  size: this.getDataSize(cursor.value),
                });
                cursor.continue();
              } else {
                // 游标遍历完成
                this.records = records;
                this.filteredRecords = [...this.records];
                this.renderRecordsList();
                this.showRecordsList();
                db.close();
                this.showToast(
                  `Loaded ${this.records.length} records from ${storeName}`
                );
                resolve();
              }
            };

            cursorRequest.onerror = () => {
              db.close();
              this.showToast(
                "Error loading records with cursor: " +
                  cursorRequest.error.message
              );
              reject(cursorRequest.error);
            };
          };

          request.onerror = () => {
            this.showToast("Error opening database: " + request.error.message);
            reject(request.error);
          };
        } catch (error) {
          this.showToast("Error selecting store: " + error.message);
          reject(error);
        }
      });
    }

    getDataType(data) {
      if (data === null) return "null";
      if (Array.isArray(data)) return "array";
      return typeof data;
    }

    getDataSize(data) {
      try {
        return JSON.stringify(data).length + " bytes";
      } catch (e) {
        return "unknown";
      }
    }

    renderRecordsList() {
      const tbody = document.getElementById("indexeddb-records-tbody");
      tbody.innerHTML = "";

      document.getElementById(
        "indexeddb-record-count"
      ).textContent = `${this.filteredRecords.length} of ${this.records.length} records`;

      this.filteredRecords.forEach((record, index) => {
        const row = document.createElement("tr");
        row.dataset.recordKey = record.key;
        row.innerHTML = `
          <td>
            <span class="indexeddb-record-key">
              ${this.escapeHtml(String(record.key))}
            </span>
          </td>
          <td><span class="indexeddb-record-type">${record.type}</span></td>
          <td><span class="indexeddb-record-size">${record.size}</span></td>
        `;

        // 点击记录查看详情
        row.addEventListener("click", () => {
          this.viewRecord(record);
        });

        tbody.appendChild(row);
      });
    }

    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }

    filterRecords(searchTerm) {
      if (!searchTerm) {
        this.filteredRecords = [...this.records];
      } else {
        const term = searchTerm.toLowerCase();
        this.filteredRecords = this.records.filter((record) => {
          return String(record.key).toLowerCase().includes(term);
        });
      }
      this.renderRecordsList();
    }

    viewRecord(record) {
      this.showRecordDetail(record);
    }

    editCurrentRecord() {
      if (!this.selectedRecord) return;
      this.editRecord(this.selectedRecord);
    }

    deleteCurrentRecord() {
      if (!this.selectedRecord) return;
      this.editingRecord = this.selectedRecord;
      this.deleteRecord();
    }

    editRecord(record) {
      this.editingRecord = record;
      document.getElementById("indexeddb-editor-textarea").value =
        JSON.stringify(record.data, null, 2);
      document.getElementById("indexeddb-editor-edit-modal").style.display =
        "flex";
    }

    addNewRecord() {
      this.editingRecord = { key: null, data: {} };
      document.getElementById("indexeddb-editor-textarea").value =
        JSON.stringify({}, null, 2);
      document.getElementById("indexeddb-editor-edit-modal").style.display =
        "flex";
    }

    showToast(message) {
      const toastContainer = document.getElementById(
        "indexeddb-toast-container"
      );
      const toast = document.createElement("div");
      toast.className = "indexeddb-toast";
      toast.textContent = message;
      toastContainer.appendChild(toast);

      // 动画效果
      setTimeout(() => {
        toast.classList.add("show");
      }, 10);

      // 3秒后自动移除
      setTimeout(() => {
        toast.classList.remove("show");
        toast.addEventListener("transitionend", () => {
          toast.remove();
        });
      }, 3000);
    }

    hideEditModal() {
      document.getElementById("indexeddb-editor-edit-modal").style.display =
        "none";
      this.editingRecord = null;
    }

    async saveRecord() {
      if (!this.editingRecord) return;

      try {
        const jsonText = document.getElementById(
          "indexeddb-editor-textarea"
        ).value;
        const newData = JSON.parse(jsonText);

        const request = indexedDB.open(this.currentDB);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction([this.currentStore], "readwrite");
          const store = transaction.objectStore(this.currentStore);

          let putRequest;
          // 如果 keyPath 存在, 则key是in-line的, 不应作为单独的参数传递
          if (this.currentKeyPath) {
            putRequest = store.put(newData);
          } else {
            // 如果 keyPath 不存在, 则key是out-of-line的, 需要作为单独的参数传递
            putRequest = store.put(newData, this.editingRecord.key);
          }

          putRequest.onsuccess = () => {
            this.hideEditModal();
            this.selectStore(this.currentStore); // 刷新记录列表
            this.showToast("Record saved successfully");
            db.close();
          };

          putRequest.onerror = () => {
            this.showToast("Error saving record: " + putRequest.error.message);
            db.close();
          };
        };

        request.onerror = () => {
          this.showToast("Error opening database: " + request.error.message);
        };
      } catch (error) {
        if (error.message.includes("JSON")) {
          this.showToast("Invalid JSON format");
        } else {
          this.showToast("Error: " + error.message);
        }
      }
    }

    downloadRecord() {
      if (!this.editingRecord) return;

      try {
        const jsonText = document.getElementById(
          "indexeddb-editor-textarea"
        ).value;
        // Validate JSON format before downloading
        JSON.parse(jsonText);

        const blob = new Blob([jsonText], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const key = this.editingRecord.key ? this.editingRecord.key : "new_record";
        a.download = `record_${key}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showToast("Record downloaded.");
      } catch (error) {
        if (error.message.includes("JSON")) {
          this.showToast("Invalid JSON format. Cannot download.");
        } else {
          this.showToast("Error: " + error.message);
        }
      }
    }

    importRecord(event) {
      const file = event.target.files[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        try {
          // Validate and prettify the JSON
          const data = JSON.parse(text);
          const prettifiedText = JSON.stringify(data, null, 2);
          document.getElementById("indexeddb-editor-textarea").value = prettifiedText;
          this.showToast("File content imported successfully.");
        } catch (error) {
          this.showToast("Invalid JSON file.");
        } finally {
          // Reset the file input so the user can select the same file again
          event.target.value = "";
        }
      };
      reader.onerror = () => {
        this.showToast("Error reading file.");
        event.target.value = "";
      };
      reader.readAsText(file);
    }

    async deleteRecord() {
      if (
        !this.editingRecord ||
        !confirm("Are you sure you want to delete this record?")
      ) {
        return;
      }

      try {
        const request = indexedDB.open(this.currentDB);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction([this.currentStore], "readwrite");
          const store = transaction.objectStore(this.currentStore);

          const deleteRequest = store.delete(this.editingRecord.key);
          deleteRequest.onsuccess = () => {
            this.hideEditModal();
            this.selectStore(this.currentStore); // 刷新记录
            this.showToast("Record deleted successfully");
            db.close();
          };

          deleteRequest.onerror = () => {
            this.showToast(
              "Error deleting record: " + deleteRequest.error.message
            );
            db.close();
          };
        };
      } catch (error) {
        this.showToast("Error: " + error.message);
      }
    }

    clearSelection(containerId) {
      const items = document.querySelectorAll(
        `#${containerId} .indexeddb-item`
      );
      items.forEach((item) => item.classList.remove("selected"));
    }

    selectItem(containerId, value) {
      const item = document.querySelector(
        `#${containerId} .indexeddb-item[data-db-name="${value}"], ` +
          `#${containerId} .indexeddb-item[data-store-name="${value}"]`
      );
      if (item) {
        item.classList.add("selected");
      }
    }

    // 自动打开deepseek-chat数据库并尝试访问history-message对象存储
    async autoOpenDeepSeekChat(uuid) {
      try {
        // 首先加载所有数据库
        await this.loadDatabases();

        // 查找deepseek-chat数据库
        const deepseekDb = this.databases.find(db =>
          db.name.toLowerCase().includes('deepseek') ||
          db.name.toLowerCase().includes('chat')
        );

        if (!deepseekDb) {
          this.showToast('deepseek-chat database not found');
          return;
        }

        // 选择deepseek-chat数据库并等待完成
        await this.selectDatabase(deepseekDb.name);

        // 等待对象存储列表渲染完成
        await new Promise(resolve => {
          const checkStores = () => {
            const storesContainer = document.getElementById('indexeddb-stores');
            if (storesContainer && storesContainer.children.length > 0) {
              resolve();
            } else {
              setTimeout(checkStores, 50);
            }
          };
          checkStores();
        });

        // 查找history-message对象存储
        const storesContainer = document.getElementById('indexeddb-stores');
        const historyMessageStore = Array.from(storesContainer.querySelectorAll('.indexeddb-item'))
          .find(item => item.dataset.storeName.toLowerCase().includes('history') ||
                       item.dataset.storeName.toLowerCase().includes('message'));

        if (historyMessageStore) {
          // 选择history-message对象存储并等待记录加载完成
          await this.selectStore(historyMessageStore.dataset.storeName);

          // 搜索UUID对应的记录
          await this.searchForUUID(uuid);
        } else {
          this.showToast('history-message object store not found');
        }

      } catch (error) {
        this.showToast('Error auto-opening deepseek-chat: ' + error.message);
      }
    }

    // 搜索UUID对应的记录
    async searchForUUID(uuid) {
      const searchInput = document.getElementById('indexeddb-search-input');
      if (searchInput) {
        searchInput.value = uuid;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));

        // 等待过滤完成
        await new Promise(resolve => {
          const checkFiltered = () => {
            if (this.filteredRecords.length > 0 || this.filteredRecords.length === 0) {
              resolve();
            } else {
              setTimeout(checkFiltered, 50);
            }
          };
          checkFiltered();
        });

        const filteredRecords = this.filteredRecords;
        if (filteredRecords.length > 0) {
          // 尝试找到精确匹配UUID的记录
          const exactMatch = filteredRecords.find(record =>
            String(record.key).toLowerCase() === uuid.toLowerCase()
          );

          if (exactMatch) {
            this.viewRecord(exactMatch);
            this.showToast(`Found record: ${uuid}`);
          } else if (filteredRecords.length === 1) {
            // 如果只有一个匹配结果，自动选择它
            this.viewRecord(filteredRecords[0]);
          }
        }
      }
    }
  }

  // 全局编辑器实例
  let editorInstance = null;

  // 检查URL并自动打开deepseek-chat数据库
  function checkUrlAndOpenDatabase() {
    const url = window.location.href;
    const pathname = window.location.pathname;

    // 自动打开编辑器
    if (!editorInstance) {
      editorInstance = new IndexedDBEditor();
    }

    editorInstance.show().then(() => {
      // 检查URL是否符合 /a/chat/s/uuid 模式
      const uuidPattern = /\/a\/chat\/s\/([a-f0-9-]+)/i;
      const match = pathname.match(uuidPattern);

      if (match) {
        const uuid = match[1];
        console.log('Detected chat URL with UUID:', uuid);
        
        // 尝试自动打开deepseek-chat数据库和history-message对象存储
        editorInstance.autoOpenDeepSeekChat(uuid);
      } else {
        console.log('URL does not match chat pattern, showing general IndexedDB editor');
        // 对于其他URL，只显示通用的IndexedDB编辑器界面
      }
    });
  }

  // 监听来自后台脚本的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggleEditor") {
      if (!editorInstance) {
        editorInstance = new IndexedDBEditor();
      }

      if (editorInstance.isVisible()) {
        editorInstance.hide();
      } else {
        // 点击图标时检查URL并打开编辑器
        // 这将显示通用的IndexedDB编辑器，如果是特定URL还会自动打开相关数据库
        checkUrlAndOpenDatabase();
      }
    }
  });
})();
