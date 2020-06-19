const { handler} = require('../../src/app.js');

test('Verifies a successful response', async () => {
  process.env = Object.assign(process.env, { NODE_VERSION: 'v12.16.1' });

  const result = await handler({}, {})

    expect(result).toEqual({
      statusCode: 200,
      headers: { "content-type": "text/html;charset=utf8" },
      body: `We are using NodeJS v12.16.1!`
    });
});

test('Verifies an unsuccessful response', async () => {
  process.env = Object.assign(process.env, { NODE_VERSION: 'v12.16.3' });
  const result = await handler({}, {})

  expect(result).toEqual({
    status: 500,
    headers: { "content-type": "text/html;charset=utf8" },
    body: `We are NOT using the correct node version!`
  })
});