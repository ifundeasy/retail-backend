const moSQL = require('mongo-sql');
const sqlFormatter = require('sql-formatter');
moSQL.raw = function ({query, values}) {
    //let q = query.replace(/\"/g, '`');
    //q = q.replace(/\@/g, '.');
    //return q.replace(/\$[0-9]/g, function(e){
    //    let val = values[e.substr(1)-1];
    //    if (val.constructor == String) return `"${val}"`;
    //    return val;
    //})
	let q = query.replace(/\"/g, '').replace(/\@/g, '.').replace(/\`\"/g);
	return q.replace(/\$[0-9]/g, function(e){
		let val = values[e.substr(1)-1];
		if (val) {
			if (val.constructor == String) {
				val = `"${val}"`.replace(/\"\`|\`\"/g, '`')
			}
		}
		return val;
	})
};
module.exports = function (query) {
	var res = moSQL.sql(query);
	res.raw = moSQL.raw(res);
	res.stringy = sqlFormatter.format(res.raw);
	return res;
};