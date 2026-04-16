const { z } = require("zod");

function validateBody(schema) {
  return function validator(req, res, next) {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400);
        return next(new Error(err.issues.map((i) => i.message).join(", ")));
      }
      next(err);
    }
  };
}

module.exports = { validateBody };

