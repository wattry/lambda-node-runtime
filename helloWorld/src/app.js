exports.handler =  async (event, context) => {
  try{
    const { NODE_VERSION } = process.env;

    if (NODE_VERSION !== 'v12.16.1') throw new Error('This is not the right Node version!');

    return {
      statusCode: 200,
      headers: { "content-type": "text/html;charset=utf8" },
      body: `We are using NodeJS ${NODE_VERSION}!`
    }
  } catch(error) {
    return {
      status: 500,
      headers: { "content-type": "text/html;charset=utf8" },
      body: `We are NOT using the correct node version!`
    }
  }
}