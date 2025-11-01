import Joi from 'joi';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = Joi.object({
  PORT: Joi.number().required(),
  SALT_ROUNDS: Joi.number().required(),
  LOCK_MAX_ATTEMPTS: Joi.number().required(),
  LOCK_DURATION_MS: Joi.number().required(),
  NODE_ENV: Joi.string().valid('development', 'production').default('development')
})
  .unknown()
  .required();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(` Invalid env configuration: ${error.message}`);
}

export default {
  port: envVars.PORT,
  nodeEnv: envVars.NODE_ENV
};
