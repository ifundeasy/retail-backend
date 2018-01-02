module.exports = function (compile) {
    return async function (req, res, next) {
        if (!req.logged) return next(new Error('Login required'));

        let {user} = req.logged;
        let roleData = await compile(`
            SELECT 
                a.id actor_id, a.name actor_name, b.module_id,
                c.module_id module_parent, c.name module_name, 
                c.class module_class, c.seq module_seq, c.notes module_notes,
                d.TABLENAME, d.value route, d.httpmethod_id, 
                e.name httpmethod_name, e.code httpmethod_code
            FROM personActor z
            LEFT JOIN actor a ON z.actor_id = a.id AND z.op_id = 1
            LEFT JOIN actorModule b ON a.id = b.actor_id AND b.op_id = 1
            LEFT JOIN module c ON c.id = b.module_id AND c.op_id = 1
            LEFT JOIN moduleRoute d ON d.module_id = c.id AND d.op_id = 1
            LEFT JOIN httpmethod e ON e.id = d.httpmethod_id AND e.op_id = 1
            WHERE z.id = ? AND z.op_id = 1
        `, user.id);
        if (roleData instanceof Error) throw roleData;

        let actor = { id: roleData[0].actor_id, name: roleData[0].actor_name };
        let routes = {};
        let modules = {};
        for (let a in roleData) {
            let role = roleData[a];
            let {
                module_id, module_parent, module_name,
                module_class, module_seq, module_notes
            } = role;

            if (role.route) {
                routes[role.route] = routes[role.route] || {value: role.route, table: role.TABLENAME};
                routes[role.route].methods = routes[role.route].methods || [];
                routes[role.route].methods.push(role.httpmethod_code)
            }
            
            modules[module_id] = modules[module_id] || {
                id: module_id,
                parent: module_parent,
                name: module_name,
                class: module_class,
                seq: module_seq,
                notes: module_notes,
                tables: []
            };
            if (role.TABLENAME && modules[module_id].tables.indexOf(role.TABLENAME) < 0) {
            	modules[module_id].tables.push(role.TABLENAME);            
            }
        }
        /** For nested data modules **/
        //for (let b in modules) {
        //    let node = modules[b];
        //    if (node.parent) {
        //        let parent = modules[node.parent];
        //        parent.children = modules[node.parent].children || [];
        //        parent.children.push(node);
        //    }
        //}
        //for (let c in modules) {
        //    if (modules[c].parent) delete modules[c];
        //}
        //modules = Object.keys(modules).map(function (k) {
        //    return modules[k]
        //});
        req.logged.actor = actor;
        req.logged.routes = routes;
        req.logged.modules = modules;
        next();
    }
};