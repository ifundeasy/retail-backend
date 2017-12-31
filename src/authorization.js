module.exports = function (compile) {
    return async function (req, res, next) {
        if (!req.logged) return next(new Error('Login required'));

        let {user} = req.logged;
        let roleData = await compile(`
            SELECT 
                a.id actor_id, a.name actor_name,
                b.api_id, c.name api_name, b.apiRoute_id, d.name apiRoute_name,
                d.http_id, e.code http_code, e.name http_name
            FROM personActor z
            LEFT JOIN actor a ON z.actor_id = a.id AND z.status_id = 1
            LEFT JOIN actorRoute b ON z.actor_id = b.actor_id AND b.status_id = 1
            LEFT JOIN api c ON b.api_id = c.id AND c.status_id = 1
            LEFT JOIN apiRoute d ON b.apiRoute_id = d.id AND d.status_id = 1
            LEFT JOIN http e ON d.http_id = e.id AND e.status_id = 1
            WHERE z.id = 1 AND z.status_id = ?
            ORDER BY c.id, d.id, e.id
        `, user.id);
        if (roleData instanceof Error) throw actor;

        let actor = { id: roleData[0].actor_id, name: roleData[0].actor_name };
        let authorized = {};
        roleData.forEach(function (o) {
            let { api_id, api_name, apiRoute_id, apiRoute_name, http_code } = o;

            authorized[apiRoute_name] = authorized[apiRoute_name] || {};
            authorized[apiRoute_name].apiRoute_id = apiRoute_id;
            authorized[apiRoute_name].apiRoute_name = apiRoute_name;
            authorized[apiRoute_name].page = api_name;
            authorized[apiRoute_name].page_id = api_id;
            authorized[apiRoute_name].methods = authorized[apiRoute_name].methods || [];
            authorized[apiRoute_name].methods.push(http_code)
        });
        req.logged.actor = actor;
        req.logged.authorized = authorized;
        next();
    }
};