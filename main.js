const {ipcMain, app, BrowserWindow, dialog} = require('electron');
const axios = require('axios');
const path = require('path');
const fs = require("fs");

let mainWindow;
let docNo, empId, fileNumber, fileNameList;
let SERVER_URL;
const SEARCH_DIR = 'C:\\SynchroSpace\\TMP\\DesignManager';

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 400,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    icon: path.join(__dirname, 'assets/icons/png/logo.png')
  });

  mainWindow.loadFile('index.html');

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
};

app.whenReady().then(() => {
  createWindow();

  let path;
  let values;

  path = process.argv[1].split(':'); // 배포 시 활성화
  // path = process.argv[2].split(':'); // 개발 시 활성화
  values = path.slice(1).join(':').split('/');

  docNo = values[0]
  empId = values[1]
  fileNumber = parseInt(values[2])
  fileNameList = [];

  for (let i = 3; i < 3 + fileNumber; i++) {
    fileNameList.push(values[i]);
  }

  SERVER_URL = values.slice(fileNumber + 3).join('/')

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('check_file',async  (event) => {
  async function checkAgain() {
    let result = await  checkFilesInDirectory(SEARCH_DIR, fileNameList);
    if (!result) {
      setTimeout(checkAgain, 3000); // 3 seconds
    } else {
      event.reply('check_file_success');
    }
  }

  // Initial check
  checkAgain();
})

ipcMain.on('post_file', () => {
  let data = new FormData();

  fileNameList.forEach((fileName) => {
    const fileReadStream = fs.createReadStream(SEARCH_DIR + "\\" + fileName);
    const fileNameWithoutPath = path.basename(fileName);
    const fileBlob = new Blob([fileReadStream]);
    data.append('upload', fileBlob, fileNameWithoutPath)
  });

  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: `${SERVER_URL}?cmd=upload&fileId=fileId&docNo=${docNo}&empId=${empId}`,
    headers: {
      'Content-Type': `multipart/form-data;`,
    },
    data: data
  };

  axios.request(config)
    .then((response) => {
      dialog.showMessageBox({
        type: 'info',
        title: '성공',
        message: '파일 전송에 성공했습니다.',
        buttons: ['확인']
      }).then(function (res) {
        if (res.response == 0) {
          app.quit()
        }
      })
    })
    .catch((error) => {
      dialog.showMessageBox({
        type: 'warning',
        title: '경고',
        message: '파일 전송에 실패했습니다.',
        buttons: ['확인']
      }).then(function (res) {
        if (res.response == 0) {
          app.quit()
        }
      });
    });
})

const checkFilesInDirectory = (directoryPath, fileList) => {
  return new Promise((resolve, reject) => {
    try {
      fs.readdir(directoryPath, (err, files) => {
        if (err) {
          dialog.showMessageBox({
            type: 'warning',
            title: '경고',
            message: SEARCH_DIR + '경로가 없습니다.',
            buttons: ['확인']
          }).then(function (res) {
            if (res.response == 0) {
              app.quit()
            }
            reject(err); // Reject the promise on error
          });
        } else {
          // fileList에 있는 모든 파일이 directoryPath에 존재하는지 확인
          const allFilesExist = fileList.every((file) => files.includes(file));
          resolve(allFilesExist); // Resolve the promise with the result
        }
      });
    } catch (error) {
      dialog.showMessageBox({
        type: 'warning',
        title: '경고',
        message: '알 수 없는 오류가 발생했습니다.',
        buttons: ['확인']
      }).then(function (res) {
        if (res.response == 0) {
          app.quit()
        }
        reject(error); // Reject the promise on error
      });
    }
  });
};
