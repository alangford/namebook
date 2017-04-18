insert into users (username, authid) values ($1, $2, $3) returning userid, username, authid;
