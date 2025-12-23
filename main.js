const {ipcMain, app, BrowserWindow, dialog} = require('electron');
const axios = require('axios');
const path = require('path');
const fs = require("fs");
const qs = require('qs');
const {exec} = require("child_process");
const FormData = require('form-data');

let mainWindow;
let docNo, empId, fileNumber, fileNameList;
let SERVER_URL, COMMAND, COMMAND_ARGS;
const SEARCH_DIR = 'C:/SynchroSpace/TMP/DesignManager';

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

  let PATH_VARIABLES;
  let values;

  // const ARGUMENT_START_AT = 1 // 배포 시 활성화
  const ARGUMENT_START_AT = 2 // 개발 시 활성화

  // PATH_VARIABLES = process.argv[1].split(':');
  const query = decodeURI(process.argv.slice(ARGUMENT_START_AT).join(' ').split('?')[1].replace("%38","&"))

  const parsedQuery = qs.parse(query);
  COMMAND = parsedQuery.command;
  COMMAND_ARGS = parsedQuery.command_args;
  console.log(process.argv)

  PATH_VARIABLES = process.argv.slice(ARGUMENT_START_AT).join(' ').split('?')[0]
  values = PATH_VARIABLES.split(':').slice(1).join(':').split('/');

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
  exec(`"${COMMAND}" ${COMMAND_ARGS}`, (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
  });
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
  const form = new FormData();

  fileNameList.forEach((fileName) => {
    const fileReadStream = fs.createReadStream(SEARCH_DIR + "/" + fileName);
    form.append('upload', fileReadStream)
  });

  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: `${SERVER_URL}?cmd=upload&fileId=fileId&docNo=${docNo}&empId=${empId}`,
    headers: {
      ...form.getHeaders()
    },
    data: form
  };

  axios.request(config)
    .then((response) => {
      console.log(response)
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
