const { ipcRenderer } = require('electron');


ipcRenderer.send('check_file');

ipcRenderer.on('check_file_success', () => {
    ipcRenderer.send('post_file');
})