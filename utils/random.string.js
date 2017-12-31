module.exports = function (length) {
    let str = Math.random().toString();
    str = parseInt(str.substr(str.indexOf('.') + 1)).toString(36);
    length = length || 5;
    return str.substr(-length);
};