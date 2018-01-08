const uuid = require('uuid');
//
module.exports = function (Glob, locals, compile) {
    return async function (req, res, next) {
        let {header, expires, extend, regen, resave} = Glob.token;
        let token = req.headers[header.toLowerCase()];
        let path = req._parsedUrl.pathname;
        if (!token) return next();
        try {
            //checking data
            let session = await compile(`SELECT * FROM personSession WHERE value = ? AND op_id = 1`, token);
            if (!session.length && path === '/login') return next();
            if (session instanceof Error || session.length !== 1) throw (new Error(`Invalid lookup for token ${token}`));
            else session = session[0];

            //checking if path == /logout
            if (path === '/logout') {
                let updateSession = await compile(`UPDATE personSession SET op_id = 2 WHERE id = ?`, session.id);
                if (updateSession instanceof Error) throw (new Error(`Failed destroying user's token ${token} for logging out`));
                return next();
            }

            //checking expired time
            let expiredAt = new Date(session.expires).getTime(),
                currentTime = new Date().getTime();
            if (currentTime > expiredAt) throw (new Error(`Invalid session expires for token's ${token}`));

            //lookup user
            let user = await compile(`SELECT * FROM person WHERE id = ? AND op_id = 1`, session['person_id']);
            if (user instanceof Error || user.length > 1) throw (new Error(`Invalid lookup user for token's ${token}`));
            else user = user[0];

            let newSession = {
                id: session.id, value: session.value, expires: session.expires
            };
            if (resave) {
                if (extend) newSession.expires = new Date(new Date().getTime() + expires);
                if (regen) newSession.value = uuid.v4();

                let updateSession = await compile(
                    `UPDATE personSession SET value = ?, expires = ? WHERE id = ? `,
                    [newSession.value, newSession.expires, newSession.id]
                );
                if (updateSession instanceof Error) throw (new Error(`Failed update user's token ${token}`));
            } else {
                newSession.value = uuid.v4(),
                    newSession.expires = new Date(new Date().getTime() + expires);

                let updateSession = await compile(`UPDATE person_session SET op_id = 2 WHERE id = ?`, session.id);
                if (updateSession instanceof Error) throw (new Error(`Failed destroying user's token ${token}`));

                let addSession = await compile(
                    `INSERT INTO personSession set value = ?, expires = ?, person_id = ?, status_id = ?`,
                    [newSession.value, newSession.expires, user.id, user.status_id]
                );
                if (addSession instanceof Error) throw (new Error(`Failed generate new token for token's ${token}`));

                newSession.id = addSession.insertId;
            }

            req.logged = {user, session: newSession}
            next();
        } catch (e) {
            next(e);
        }
    };
};