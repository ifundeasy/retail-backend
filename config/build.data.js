const crypto = require('crypto');
const randomString = require(`./../utils/random.string`);
const sha512 = function (string, salt) {
    let hash = crypto.createHmac('sha512', salt);
    hash.update(string);
    return hash.digest('hex');
};
const moduleMap = require('./../data/module.json');
const username = 'root', salt = randomString(16);
const Actor = {
    fields: ['id', 'name'],
    values: [
        [1, 'root']
    ]
};
const Person = {
    fields: ['id', 'name', 'username', 'password', 'salt'],
    values: [
        [1, 'root', username, sha512(username, salt), salt]
    ]
};
const PersonActor = {
    fields: ['id', 'person_id', 'actor_id'],
    values: [
        [1, 1, 1]
    ]
};
const HttpMethod = {
    fields: ['id', 'name', 'code'],
    values: [
        [1, 'create', 'POST'],
        [2, 'read', 'GET'],
        [3, 'update', 'PUT'],
        [4, 'delete', 'DELETE'],
    ]
};
const Route = {
    fields: ['id', 'TABLENAME', 'value', 'httpmethod_id'],
    values: []
};
const Module = {
    fields: ['id', 'module_id', 'name', 'class', 'seq'],
    values: []
};
const ModuleRoute = {
    fields: ['id', 'module_id', 'TABLENAME'],
    values: []
};
const ActorModule = {
    fields: ['id', 'actor_id', 'module_id'],
    values: []
};
//
const tables = {};
moduleMap.forEach(function (obj) {
    let p = Module.fields.length;
    Module.values.push(
        Object.keys(obj).slice(0, p).map(function (el) {
            return obj[el]
        })
    );
    ActorModule.values.push([ActorModule.values.length + 1, 1, obj.id]);
    if (obj.table_scopes instanceof Array) {
        obj.table_scopes.forEach(function (name) {
            tables[name] = 1;
        });
    }
});
Object.keys(tables).sort().forEach(function (name, i) {
    HttpMethod.values.forEach(function (el) {
        Route.values.push([Route.values.length + 1, name, '/api/' + name, el[0]]);
    });
});
moduleMap.forEach(function (obj) {
    if (obj.table_scopes instanceof Array) {
        let module_id = obj.id;
        obj.table_scopes.forEach(function (name) {
            ModuleRoute.values.push([
                ModuleRoute.values.length + 1,
                module_id, name
            ])
        });
    }
});

module.exports = {
    actor: Actor,
    person: Person,
    personActor: PersonActor,
    httpmethod: HttpMethod,
    route: Route,
    module: Module,
    moduleRoute: ModuleRoute,
    actorModule: ActorModule
};