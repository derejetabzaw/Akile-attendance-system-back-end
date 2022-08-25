//Validation of user Input
const Joi = require('@hapi/joi')

const loginValidation = data => {
      const schema = {
            staffId: Joi
                  .string()
                  .min(7)
                  .max(7)
                  .required(),
            password: Joi
                  .string()
                  .min(3)
                  .required()
      }

      return Joi.validate(data, schema)
}

module.exports.loginValidation = loginValidation