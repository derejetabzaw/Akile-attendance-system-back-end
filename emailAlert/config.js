const appAccount = process.env.EMAIL;
const password = process.env.PASSWORD;

const options = {
  transport: {
    service: "Gmail",
    auth: {
      user: appAccount,
      pass: password,
    },
  },
  verbose: true,
};

module.exports = {
  appAccount,
  options,
};