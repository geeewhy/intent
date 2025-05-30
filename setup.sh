npm install > /dev/null 2>&1
npm install jest > /dev/null 2>&1
npm install -g jest ts-node --save-dev > /dev/null 2>&1
npm install -g ts-node-dev > /dev/null 2>&1
echo "
OK - Dependencies installed, next up:

- run docker-compose up temporal-ui temporal
- run npm run setup
- run npm run projections:migrate
"