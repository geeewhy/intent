npm install > /dev/null 2>&1
npm install jest > /dev/null 2>&1
npm install -g jest ts-node --save-dev > /dev/null 2>&1
npm install -g ts-node-dev > /dev/null 2>&1
echo "
OK - Dependencies installed, next up:

- run docker-compose up
- run npm run setup eventstore
- run npm run projections:migrate

see full setup instructions in README.md
"