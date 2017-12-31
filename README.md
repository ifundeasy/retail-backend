# retail-backend
### Requirements
> Node js version >= 6.11.4, or choose nodejs with included async/await natively

### Installation
Copy dotenv file
```sh
$ cp config/dotenv .env
```
Note: please edit this `.env` file as you need for your environments

Installing modules
```sh
$ npm install
```

### Preparation
Create database
```sh
$ ./bin/sequelize db:create
```
Build tables
```sh
$ ./bin/sequelize db:migrate
```
Seed some value
```sh
$ ./bin/sequelize db:seed:all
```

### Start application
Cluster
```sh
$ node bin/app-cluster
```
Single thread
```sh
$ node bin/app
```
Cluster with pm2
```sh
$ ./bin/pm2 start ./config/pm2.json
```

### User application
```js
username: root
password: root
```