const fs = require('fs');
const path = require('path');
const multipart = require('connect-multiparty');
const images = {
    '.jpeg': ['image/jpeg', 'image/pjpeg'],
    '.jpg': ['image/jpg', 'image/pjpg'],
    '.png': 'image/png',
    '.bmp': ['image/bmp', 'image/x-windows-bmp'],
    '.gif': 'image/gif'
};
const rand = function () {
    const s = Math.random().toString();
    return parseInt(s.substr(s.lastIndexOf('.') + 1, s.length)).toString(36).substr(-5)
};
module.exports = function ({uploadDir, maxFilesSize, fieldName}) {
    const middleware = multipart({uploadDir, maxFilesSize});
    const validate = function (files) {
        files[fieldName] = files[fieldName] || {};
        if (files[fieldName].constructor == Object) files[fieldName] = [files[fieldName]];
        let valid = [], invalid = [];
        for (let ix in files[fieldName]) {
            let error = true;
            let file = files[fieldName][ix];
            let extension, dotIdx, {originalFilename} = file;
            if (originalFilename) {
                dotIdx = originalFilename.lastIndexOf('.');
                extension = (originalFilename.substr(dotIdx) || '').toLowerCase();
                file.extension = extension;
                if (file.fieldName === fieldName && file.size) {
                    if (extension && images.hasOwnProperty(extension)) {
                        if (images[extension].indexOf(file.type) > -1) error = false
                    }
                }
            }
            if (!error) {
                let date = new Date().getTime();
                let oldName = originalFilename.substr(0, dotIdx);
                let name = `${date}.${rand()}${extension}`;
                file.new_name = `${oldName}.${name}`;
                file.new_path = path.join(uploadDir, file.new_name);
                fs.renameSync(file.path, file.new_path);
                valid.push(file)
            }
        }
        if (valid.length !== files[fieldName].length) {
            files[fieldName].forEach(function (file) {
                let {path, new_path} = file;
                if (new_path) fs.unlinkSync(new_path);
                else if (path) {
                    invalid.push(file);
                    fs.unlinkSync(path);
                }
            });
        }
        return {valid, invalid};
    };
    try {
        fs.mkdirSync(uploadDir)
    } catch (e) {
    }
    return {middleware, validate}
};